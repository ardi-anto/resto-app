/**
 * Offline sync manager with retry/backoff
 */
import db from './db';
import { salesAPI, menusAPI, ingredientsAPI } from './api';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID = localStorage.getItem('kedaiops_device_id') || (() => {
  const id = `device_${uuidv4().slice(0, 8)}`;
  localStorage.setItem('kedaiops_device_id', id);
  return id;
})();

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  backoffMultiplier: 2,
};

// Calculate exponential backoff delay
function getBackoffDelay(retryCount) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

export const syncManager = {
  // Sync state
  _syncInProgress: false,
  _retryTimeout: null,
  _listeners: new Set(),

  // Check online status
  isOnline: () => navigator.onLine,
  
  // Add listener for sync events
  addListener(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  },

  // Notify listeners
  _notify(event, data) {
    this._listeners.forEach(cb => cb(event, data));
  },

  // Add sale to offline queue
  async addPendingSale(saleData) {
    const clientId = `sale_${uuidv4()}`;
    const pendingSale = {
      clientId,
      data: {
        ...saleData,
        client_id: clientId,
        device_id: DEVICE_ID,
        created_at: new Date().toISOString(),
      },
      createdAt: new Date(),
      status: 'pending',
      retryCount: 0,
      lastRetryAt: null,
      errorMessage: null,
    };
    
    await db.pendingSales.add(pendingSale);
    this._notify('sale_added', pendingSale);
    
    // Try to sync immediately if online
    if (this.isOnline()) {
      this.syncPendingSales();
    }
    
    return pendingSale;
  },
  
  // Sync pending sales to server with retry logic
  async syncPendingSales() {
    if (this._syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return null;
    }

    if (!this.isOnline()) {
      console.log('Offline, skipping sync');
      return null;
    }

    this._syncInProgress = true;
    this._notify('sync_start', null);

    try {
      // Get pending sales that are ready to retry
      const now = new Date();
      const pending = await db.pendingSales
        .where('status')
        .anyOf(['pending', 'retrying'])
        .toArray();

      // Filter out items that need to wait for backoff
      const readyToSync = pending.filter(sale => {
        if (sale.status === 'pending') return true;
        if (sale.retryCount >= RETRY_CONFIG.maxRetries) {
          // Mark as failed after max retries
          db.pendingSales.update(sale.id, { status: 'failed' });
          return false;
        }
        // Check backoff time
        if (sale.lastRetryAt) {
          const backoffDelay = getBackoffDelay(sale.retryCount);
          const nextRetryTime = new Date(sale.lastRetryAt).getTime() + backoffDelay;
          return now.getTime() >= nextRetryTime;
        }
        return true;
      });
    
      if (readyToSync.length === 0) {
        this._notify('sync_complete', { synced: 0, failed: 0 });
        return { synced: 0, failed: 0 };
      }

      // Mark items as syncing
      for (const sale of readyToSync) {
        await db.pendingSales.update(sale.id, { 
          status: 'syncing',
          lastRetryAt: new Date()
        });
      }

      // Try to sync
      const salesData = readyToSync.map(p => p.data);
      const response = await salesAPI.sync(salesData);
      
      let syncedCount = 0;
      let failedCount = 0;
      let retryingCount = 0;

      // Update status based on results
      for (const result of response.data.results) {
        const sale = readyToSync.find(p => p.data.client_id === result.client_id);
        if (sale) {
          if (result.success) {
            await db.pendingSales.update(sale.id, {
              status: 'synced',
              syncResult: result,
              syncedAt: new Date()
            });
            syncedCount++;
          } else {
            // Check if it's a retryable error
            const isRetryable = !result.error?.includes('Stok') && 
                               !result.error?.includes('tidak ditemukan');
            
            if (isRetryable && sale.retryCount < RETRY_CONFIG.maxRetries - 1) {
              await db.pendingSales.update(sale.id, {
                status: 'retrying',
                retryCount: sale.retryCount + 1,
                errorMessage: result.error,
                syncResult: result
              });
              retryingCount++;
            } else {
              await db.pendingSales.update(sale.id, {
                status: 'failed',
                errorMessage: result.error,
                syncResult: result
              });
              failedCount++;
            }
          }
        }
      }
      
      // Clean up synced sales older than 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await db.pendingSales
        .where('status')
        .equals('synced')
        .filter(s => new Date(s.createdAt) < oneDayAgo)
        .delete();
      
      // Schedule retry if there are items in retrying state
      if (retryingCount > 0) {
        this._scheduleRetry();
      }

      const result = { 
        synced: syncedCount, 
        failed: failedCount, 
        retrying: retryingCount 
      };
      this._notify('sync_complete', result);
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Mark all syncing items as retrying
      const syncing = await db.pendingSales
        .where('status')
        .equals('syncing')
        .toArray();
      
      for (const sale of syncing) {
        await db.pendingSales.update(sale.id, {
          status: 'retrying',
          retryCount: sale.retryCount + 1,
          errorMessage: error.message
        });
      }

      // Schedule retry
      this._scheduleRetry();

      const result = { synced: 0, failed: 0, retrying: syncing.length, error: error.message };
      this._notify('sync_error', result);
      return result;
    } finally {
      this._syncInProgress = false;
    }
  },

  // Schedule a retry with exponential backoff
  _scheduleRetry() {
    if (this._retryTimeout) {
      clearTimeout(this._retryTimeout);
    }

    // Get the minimum wait time based on retry counts
    const minDelay = RETRY_CONFIG.baseDelay;
    
    this._retryTimeout = setTimeout(() => {
      if (this.isOnline()) {
        this.syncPendingSales();
      }
    }, minDelay);
  },
  
  // Get pending count by status
  async getPendingCount() {
    const pending = await db.pendingSales.where('status').equals('pending').count();
    const retrying = await db.pendingSales.where('status').equals('retrying').count();
    const syncing = await db.pendingSales.where('status').equals('syncing').count();
    const failed = await db.pendingSales.where('status').equals('failed').count();
    return { pending, retrying, syncing, failed, total: pending + retrying + syncing };
  },

  // Get failed sales for review
  async getFailedSales() {
    return db.pendingSales.where('status').equals('failed').toArray();
  },

  // Retry a specific failed sale
  async retrySale(saleId) {
    await db.pendingSales.update(saleId, {
      status: 'pending',
      retryCount: 0,
      errorMessage: null
    });
    if (this.isOnline()) {
      this.syncPendingSales();
    }
  },

  // Delete a failed sale
  async deleteSale(saleId) {
    await db.pendingSales.delete(saleId);
  },
  
  // Cache menus for offline use
  async cacheMenus() {
    try {
      const response = await menusAPI.list(null, true);
      const menus = response.data.menus;
      
      await db.cachedMenus.clear();
      if (menus.length > 0) {
        await db.cachedMenus.bulkPut(menus);
      }
      
      await db.syncMeta.put({ key: 'menusLastSync', value: new Date().toISOString() });
      return menus;
    } catch (error) {
      console.error('Failed to cache menus:', error);
      return null;
    }
  },
  
  // Get cached menus
  async getCachedMenus() {
    return db.cachedMenus.toArray();
  },
  
  // Cache ingredients
  async cacheIngredients() {
    try {
      const response = await ingredientsAPI.list();
      const ingredients = response.data.ingredients;
      
      await db.cachedIngredients.clear();
      if (ingredients.length > 0) {
        await db.cachedIngredients.bulkPut(ingredients);
      }
      
      return ingredients;
    } catch (error) {
      console.error('Failed to cache ingredients:', error);
      return null;
    }
  },
  
  // Full sync
  async fullSync() {
    const results = {
      sales: await this.syncPendingSales(),
      menus: await this.cacheMenus(),
      ingredients: await this.cacheIngredients(),
    };
    return results;
  },
};

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, syncing...');
    syncManager.fullSync();
  });
}

export default syncManager;

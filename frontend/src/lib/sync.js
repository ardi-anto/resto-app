/**
 * Offline sync manager
 */
import db from './db';
import { salesAPI, menusAPI, ingredientsAPI } from './api';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID = localStorage.getItem('kedaiops_device_id') || (() => {
  const id = `device_${uuidv4().slice(0, 8)}`;
  localStorage.setItem('kedaiops_device_id', id);
  return id;
})();

export const syncManager = {
  // Check online status
  isOnline: () => navigator.onLine,
  
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
    };
    
    await db.pendingSales.add(pendingSale);
    
    // Try to sync immediately if online
    if (this.isOnline()) {
      this.syncPendingSales();
    }
    
    return pendingSale;
  },
  
  // Sync pending sales to server
  async syncPendingSales() {
    const pending = await db.pendingSales
      .where('status')
      .equals('pending')
      .toArray();
    
    if (pending.length === 0) return { synced: 0, failed: 0 };
    
    try {
      const salesData = pending.map(p => p.data);
      const response = await salesAPI.sync(salesData);
      
      // Update status based on results
      for (const result of response.data.results) {
        const sale = pending.find(p => p.data.client_id === result.client_id);
        if (sale) {
          await db.pendingSales.update(sale.id, {
            status: result.success ? 'synced' : 'failed',
            syncResult: result,
          });
        }
      }
      
      // Clean up synced sales older than 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await db.pendingSales
        .where('status')
        .equals('synced')
        .and(s => s.createdAt < oneDayAgo)
        .delete();
      
      return response.data;
    } catch (error) {
      console.error('Sync failed:', error);
      return { synced: 0, failed: pending.length, error: error.message };
    }
  },
  
  // Get pending count
  async getPendingCount() {
    return db.pendingSales.where('status').equals('pending').count();
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

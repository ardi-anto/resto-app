/**
 * Sync Context - manages offline/online state and sync queue with retry support
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import syncManager from '../lib/sync';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [retryingCount, setRetryingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Update counts
  const updateCounts = useCallback(async () => {
    const counts = await syncManager.getPendingCount();
    setPendingCount(counts.pending + counts.syncing);
    setRetryingCount(counts.retrying);
    setFailedCount(counts.failed);
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when back online
      syncNow();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen to sync events
    const unsubscribe = syncManager.addListener((event, data) => {
      if (event === 'sync_start') {
        setIsSyncing(true);
      } else if (event === 'sync_complete' || event === 'sync_error') {
        setIsSyncing(false);
        setLastSyncResult(data);
        updateCounts();
      } else if (event === 'sale_added') {
        updateCounts();
      }
    });
    
    // Initial counts
    updateCounts();
    
    // Poll pending count every 10 seconds
    const interval = setInterval(updateCounts, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, [updateCounts]);

  // Manual sync
  const syncNow = async () => {
    if (isSyncing || !isOnline) return null;
    
    setIsSyncing(true);
    try {
      const result = await syncManager.fullSync();
      setLastSyncResult(result);
      await updateCounts();
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      setLastSyncResult({ error: error.message });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // Add pending sale
  const addPendingSale = async (saleData) => {
    const result = await syncManager.addPendingSale(saleData);
    await updateCounts();
    return result;
  };

  // Get failed sales
  const getFailedSales = async () => {
    return syncManager.getFailedSales();
  };

  // Retry a failed sale
  const retrySale = async (saleId) => {
    await syncManager.retrySale(saleId);
    await updateCounts();
  };

  // Delete a failed sale
  const deleteSale = async (saleId) => {
    await syncManager.deleteSale(saleId);
    await updateCounts();
  };

  return (
    <SyncContext.Provider value={{
      isOnline,
      pendingCount,
      retryingCount,
      failedCount,
      totalPending: pendingCount + retryingCount,
      isSyncing,
      lastSyncResult,
      syncNow,
      addPendingSale,
      updateCounts,
      getFailedSales,
      retrySale,
      deleteSale,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
}

export default SyncContext;

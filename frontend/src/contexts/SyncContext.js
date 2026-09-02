/**
 * Sync Context - manages offline/online state and sync queue
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import syncManager from '../lib/sync';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await syncManager.getPendingCount();
    setPendingCount(count);
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
    
    // Initial pending count
    updatePendingCount();
    
    // Poll pending count every 5 seconds
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [updatePendingCount]);

  // Manual sync
  const syncNow = async () => {
    if (isSyncing || !isOnline) return null;
    
    setIsSyncing(true);
    try {
      const result = await syncManager.fullSync();
      setLastSyncResult(result);
      await updatePendingCount();
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
    await updatePendingCount();
    return result;
  };

  return (
    <SyncContext.Provider value={{
      isOnline,
      pendingCount,
      isSyncing,
      lastSyncResult,
      syncNow,
      addPendingSale,
      updatePendingCount,
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

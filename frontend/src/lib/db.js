/**
 * IndexedDB using Dexie for offline storage
 */
import Dexie from 'dexie';

export const db = new Dexie('KedaiOpsDB');

db.version(1).stores({
  // Offline queue for sales
  pendingSales: '++id, clientId, createdAt, status',
  // Cache for menus (for offline POS)
  cachedMenus: '_id, name, category',
  // Cache for ingredients (for display)
  cachedIngredients: '_id, name',
  // Sync metadata
  syncMeta: 'key'
});

// Initialize DB
db.open().catch(err => {
  console.error('Failed to open DB:', err);
});

export default db;

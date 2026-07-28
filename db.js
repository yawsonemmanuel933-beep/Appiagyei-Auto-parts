/* ===========================================================
 * SYNC-STORE Point of Sale System — Local Database Layer
   Wraps localStorage with sync-status tracking, offline ID
   generation, and queue management for pending sync items.
   All CRUD operations write to localStorage first.
   =========================================================== */
// OFFLINE-MODE

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // UUIDv4 generator (no external dependencies)
  // -----------------------------------------------------------------------
  function generateUUID() {
    // OFFLINE-MODE: Generate RFC-4122 v4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function generateOfflineId() {
    // OFFLINE-MODE: Prefix with OFF- for easy identification
    return 'OFF-' + generateUUID().toUpperCase();
  }

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------
  const STORES = {
    INVENTORY: 'pos_inventory_db',
    SALES: 'pos_sales_history',
    CUSTOMERS: 'pos_customers',
    SUPPLIERS: 'pos_suppliers',
    PURCHASE_ORDERS: 'pos_purchase_orders',
    RESTOCKS: 'pos_restocks',
    AUDIT: 'pos_audit_log',
    USERS: 'pos_users_db'
  };

  const SYNC_STATUS = {
    SYNCED: 'synced',
    PENDING: 'pending_sync',
    FAILED: 'failed',
    CONFIRMATION: 'PENDING_CONFIRMATION' // MM/Bank card awaiting online approval
  };

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------
  function loadStore(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveStore(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function nextId(arr) {
    return arr.length ? Math.max(...arr.map((item) => item.id || 0)) + 1 : 1;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  const DB = {
    // ---------------------------------------------------------------
    // Generic CRUD
    // ---------------------------------------------------------------
    getAll(storeKey) {
      return loadStore(storeKey);
    },

    getById(storeKey, id) {
      const items = loadStore(storeKey);
      return items.find((item) => item.id === id) || null;
    },

    add(storeKey, record) {
      const items = loadStore(storeKey);
      const id = nextId(items);
      const entry = { id, ...record, createdAt: record.createdAt || nowISO() };
      items.push(entry);
      saveStore(storeKey, items);
      return entry;
    },

    update(storeKey, id, changes) {
      const items = loadStore(storeKey);
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...changes, updatedAt: nowISO() };
      saveStore(storeKey, items);
      return items[idx];
    },

    remove(storeKey, id) {
      const items = loadStore(storeKey);
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return false;
      items.splice(idx, 1);
      saveStore(storeKey, items);
      return true;
    },

    clear(storeKey) {
      localStorage.removeItem(storeKey);
    },

    // ---------------------------------------------------------------
    // Sync-status helpers
    // ---------------------------------------------------------------
    // OFFLINE-MODE: Mark a record for sync
    markPendingSync(storeKey, id) {
      return DB.update(storeKey, id, { syncStatus: SYNC_STATUS.PENDING });
    },

    markSynced(storeKey, id) {
      return DB.update(storeKey, id, { syncStatus: SYNC_STATUS.SYNCED });
    },

    markFailed(storeKey, id, error) {
      return DB.update(storeKey, id, {
        syncStatus: SYNC_STATUS.FAILED,
        syncError: typeof error === 'string' ? error : (error && error.message) || 'Unknown error'
      });
    },

    markConfirmation(storeKey, id) {
      return DB.update(storeKey, id, { syncStatus: SYNC_STATUS.CONFIRMATION });
    },

    // OFFLINE-MODE: Get all records that need syncing
    getPendingSync(storeKey) {
      const items = loadStore(storeKey);
      return items.filter(
        (item) =>
          item.syncStatus === SYNC_STATUS.PENDING ||
          item.syncStatus === SYNC_STATUS.FAILED ||
          item.syncStatus === SYNC_STATUS.CONFIRMATION
      );
    },

    getByStatus(storeKey, status) {
      const items = loadStore(storeKey);
      return items.filter((item) => item.syncStatus === status);
    },

    // ---------------------------------------------------------------
    // Offline ID generation
    // ---------------------------------------------------------------
    // OFFLINE-MODE: Generate unique offline sale ID
    generateOfflineTransactionId() {
      return generateOfflineId();
    },

    generateUUID() {
      return generateUUID();
    },

    // ---------------------------------------------------------------
    // Sales-specific helpers
    // ---------------------------------------------------------------
    // OFFLINE-MODE: Create a sale with offline tracking
    createSale(saleData) {
      const isOnline = navigator.onLine;
      const transactionId = saleData.transactionId || DB.generateOfflineTransactionId();
      const sale = {
        transactionId,
        timestamp: nowISO(),
        items: saleData.items || [],
        subtotal: saleData.subtotal || 0,
        tax: saleData.tax || 0,
        total: saleData.total || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        customerName: saleData.customerName || 'Walk-in Customer',
        createdBy: saleData.createdBy || '',
        // OFFLINE-MODE: Track sync status
        syncStatus: isOnline ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING,
        offlineId: transactionId.startsWith('OFF-') ? transactionId : null,
        paymentConfirmed: saleData.paymentMethod === 'cash' ? true : false,
        needsConfirmation: saleData.paymentMethod !== 'cash' && !isOnline
      };
      return DB.add(STORES.SALES, sale);
    },

    // ---------------------------------------------------------------
    // Restock-specific helpers
    // ---------------------------------------------------------------
    // Record a restock entry whenever stock is added to inventory
    createRestock(restockData) {
      const restock = {
        productId: restockData.productId,
        brand: restockData.brand || '',
        carType: restockData.carType || '',
        year: restockData.year || '',
        sidePart: restockData.sidePart || '',
        quantityAdded: restockData.quantityAdded || 0,
        unitCost: restockData.unitCost || 0,
        totalCost: (restockData.quantityAdded || 0) * (restockData.unitCost || 0),
        supplierName: restockData.supplierName || '',
        supplierId: restockData.supplierId || null,
        notes: restockData.notes || '',
        createdBy: restockData.createdBy || '',
        timestamp: new Date().toISOString(),
        syncStatus: SYNC_STATUS.SYNCED,
        restockMonth: new Date().toISOString().slice(0, 7) // e.g. "2026-07"
      };
      return DB.add(STORES.RESTOCKS, restock);
    },

    // Get restocks for a specific month (YYYY-MM)
    getRestocksByMonth(month) {
      const all = DB.getAll(STORES.RESTOCKS);
      return all.filter(r => r.restockMonth === month);
    },

    // Get all available restock months
    getRestockMonths() {
      const all = DB.getAll(STORES.RESTOCKS);
      const months = [...new Set(all.map(r => r.restockMonth))];
      return months.sort().reverse();
    },

    // ---------------------------------------------------------------
    // Bulk operations for sync
    // ---------------------------------------------------------------
    // OFFLINE-MODE: Replace entire store from server data
    replaceStore(storeKey, items) {
      saveStore(storeKey, items);
    },

    // OFFLINE-MODE: Merge server data into local store (upsert by transaction_id for sales, id for others)
    upsertMany(storeKey, items, keyField) {
      const local = loadStore(storeKey);
      const key = keyField || 'id';
      for (const item of items) {
        const idx = local.findIndex((l) => l[key] === item[key]);
        if (idx >= 0) {
          local[idx] = { ...local[idx], ...item, syncStatus: SYNC_STATUS.SYNCED };
        } else {
          local.push({ ...item, syncStatus: SYNC_STATUS.SYNCED });
        }
      }
      saveStore(storeKey, local);
      return local;
    },

    // ---------------------------------------------------------------
    // Sync metadata
    // ---------------------------------------------------------------
    getLastSyncTime() {
      return localStorage.getItem('pos_last_sync_time') || null;
    },

    setLastSyncTime(time) {
      localStorage.setItem('pos_last_sync_time', time || nowISO());
    },

    getPendingCount() {
      let count = 0;
      for (const key of Object.values(STORES)) {
        const items = loadStore(key);
        count += items.filter(
          (item) =>
            item.syncStatus === SYNC_STATUS.PENDING ||
            item.syncStatus === SYNC_STATUS.FAILED ||
            item.syncStatus === SYNC_STATUS.CONFIRMATION
        ).length;
      }
      return count;
    },

    // ---------------------------------------------------------------
    // Store keys (for external use)
    // ---------------------------------------------------------------
    STORES,
    SYNC_STATUS
  };

  // Expose globally
  window.DB = DB;
})();

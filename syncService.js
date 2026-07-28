/* ===========================================================
 * SYNC-STORE Point of Sale System — Background Sync Engine
   Handles online detection, 2-way sync, and conflict tracking.
   OFFLINE-MODE
   =========================================================== */

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------
  const CONFIG = {
    CHECK_INTERVAL: 30 * 1000,        // Check every 30 seconds
    SYNC_INTERVAL: 60 * 1000,         // Full sync every 60 seconds
    UPLOAD_ENDPOINT: '/sync/upload',
    DOWNLOAD_ENDPOINT: '/sync/download',
    HEALTH_ENDPOINT: '/health'
  };

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  let isOnline = navigator.onLine;
  let lastSyncTime = null;
  let syncInProgress = false;
  let checkTimer = null;
  let syncTimer = null;
  let listeners = [];

  // -----------------------------------------------------------------------
  // Event system — notifies UI (ConnectionBanner etc.)
  // -----------------------------------------------------------------------
  function notify(eventType, data) {
    for (const fn of listeners) {
      try { fn(eventType, data); } catch (_) { /* swallow */ }
    }
  }

  // -----------------------------------------------------------------------
  // Connectivity check
  // -----------------------------------------------------------------------
  async function checkConnectivity() {
    // OFFLINE-MODE: Use navigator.onLine + API health check
    if (!navigator.onLine) {
      if (isOnline) {
        isOnline = false;
        notify('connectivity', { online: false });
      }
      return false;
    }
    try {
      const resp = await fetch(window.API.BASE + CONFIG.HEALTH_ENDPOINT, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout for quick detection
        signal: AbortSignal.timeout(5000)
      });
      const reachable = resp.ok;
      if (reachable !== isOnline) {
        isOnline = reachable;
        notify('connectivity', { online: reachable });
      }
      return reachable;
    } catch (_) {
      if (isOnline) {
        isOnline = false;
        notify('connectivity', { online: false });
      }
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Upload — push pending local data to server
  // -----------------------------------------------------------------------
  async function uploadPendingData() {
    // OFFLINE-MODE: Gather all pending sync records
    const pendingSales = DB.getPendingSync(DB.STORES.SALES);
    const pendingInventory = DB.getPendingSync(DB.STORES.INVENTORY);

    if (pendingSales.length === 0 && pendingInventory.length === 0) {
      return { uploaded: 0, conflicts: [] };
    }

    const payload = {};
    if (pendingSales.length > 0) {
      payload.sales = pendingSales.map((s) => ({
        transactionId: s.transactionId,
        offlineId: s.offlineId || s.transactionId,
        items: s.items,
        subtotal: s.subtotal,
        tax: s.tax,
        total: s.total,
        paymentMethod: s.paymentMethod,
        customerName: s.customerName,
        createdBy: s.createdBy || s.createdBy,
        timestamp: s.timestamp,
        syncStatus: s.syncStatus,
        paymentConfirmed: s.paymentConfirmed !== false,
        needsConfirmation: s.needsConfirmation || false
      }));
    }
    if (pendingInventory.length > 0) {
      payload.inventory = pendingInventory;
    }

    try {
      const result = await window.API.post(CONFIG.UPLOAD_ENDPOINT, payload);
      // OFFLINE-MODE: Mark uploaded records as synced
      if (result.syncedSales && Array.isArray(result.syncedSales)) {
        for (const synced of result.syncedSales) {
          const local = DB.getById(DB.STORES.SALES, synced.localId);
          if (local) {
            // Update with server-assigned data (transaction_id, id, etc.)
            DB.update(DB.STORES.SALES, synced.localId, {
              syncStatus: 'synced',
              transactionId: synced.serverTransactionId || local.transactionId,
              serverId: synced.serverId,
              syncedAt: new Date().toISOString()
            });
          }
        }
      }
      // OFFLINE-MODE: Flag sales with sync issues
      if (result.conflicts && result.conflicts.length > 0) {
        for (const conflict of result.conflicts) {
          const local = DB.getById(DB.STORES.SALES, conflict.localId);
          if (local) {
            DB.update(DB.STORES.SALES, conflict.localId, {
              syncStatus: 'failed',
              syncError: conflict.reason || 'Conflict during sync'
            });
          }
        }
        notify('conflicts', { conflicts: result.conflicts });
      }

      notify('upload', { uploaded: result.uploaded || 0, conflicts: result.conflicts || [] });
      return result;
    } catch (err) {
      console.warn('[Sync] Upload failed:', err.message);
      notify('error', { phase: 'upload', error: err.message });
      return { uploaded: 0, conflicts: [], error: err.message };
    }
  }

  // -----------------------------------------------------------------------
  // Download — pull latest data from server
  // -----------------------------------------------------------------------
  async function downloadServerData() {
    // OFFLINE-MODE: Pull fresh data from server
    try {
      const data = await window.API.get(CONFIG.DOWNLOAD_ENDPOINT + '?since=' + (lastSyncTime || ''));

      let imported = 0;

      // Merge inventory
      if (Array.isArray(data.inventory)) {
        DB.upsertMany(DB.STORES.INVENTORY, data.inventory, 'sku');
        imported += data.inventory.length;
      }

      // Merge sales (by transactionId)
      if (Array.isArray(data.sales)) {
        DB.upsertMany(DB.STORES.SALES, data.sales, 'transactionId');
        imported += data.sales.length;
      }

      // Merge customers
      if (Array.isArray(data.customers)) {
        DB.upsertMany(DB.STORES.CUSTOMERS, data.customers, 'id');
        imported += data.customers.length;
      }

      // Merge suppliers
      if (Array.isArray(data.suppliers)) {
        DB.upsertMany(DB.STORES.SUPPLIERS, data.suppliers, 'id');
        imported += data.suppliers.length;
      }

      // Merge purchase orders
      if (Array.isArray(data.purchaseOrders)) {
        DB.upsertMany(DB.STORES.PURCHASE_ORDERS, data.purchaseOrders, 'id');
        imported += data.purchaseOrders.length;
      }

      // Merge restocks
      if (Array.isArray(data.restocks)) {
        DB.upsertMany(DB.STORES.RESTOCKS, data.restocks, 'id');
        imported += data.restocks.length;
      }

      // Update last sync time
      const syncTime = new Date().toISOString();
      lastSyncTime = syncTime;
      DB.setLastSyncTime(syncTime);

      notify('download', { imported });
      return { imported };
    } catch (err) {
      console.warn('[Sync] Download failed:', err.message);
      notify('error', { phase: 'download', error: err.message });
      return { imported: 0, error: err.message };
    }
  }

  // -----------------------------------------------------------------------
  // Full sync cycle
  // -----------------------------------------------------------------------
  async function runSyncCycle() {
    // OFFLINE-MODE: Guard against concurrent syncs
    if (syncInProgress) return { skipped: true };
    syncInProgress = true;

    notify('sync-start', {});

    try {
      const online = await checkConnectivity();
      if (!online) {
        notify('sync-end', { online: false, skipped: true });
        return { online: false };
      }

      // Phase 1: Upload pending local data
      const uploadResult = await uploadPendingData();

      // Phase 2: Download latest server data
      const downloadResult = await downloadServerData();

      const result = {
        online: true,
        uploaded: uploadResult.uploaded || 0,
        conflicts: uploadResult.conflicts || [],
        imported: downloadResult.imported || 0
      };

      notify('sync-end', result);
      return result;
    } catch (err) {
      console.error('[Sync] Sync cycle error:', err);
      notify('sync-end', { error: err.message });
      return { error: err.message };
    } finally {
      syncInProgress = false;
    }
  }

  // -----------------------------------------------------------------------
  // Manual sync trigger
  // -----------------------------------------------------------------------
  async function syncNow() {
    // OFFLINE-MODE: Called from "Sync Now" button
    return runSyncCycle();
  }

  // -----------------------------------------------------------------------
  // Start / stop periodic sync
  // -----------------------------------------------------------------------
  function start() {
    // OFFLINE-MODE: Begin background monitoring
    if (checkTimer) return; // Already running

    // Listen for browser online/offline events
    window.addEventListener('online', () => {
      isOnline = true;
      notify('connectivity', { online: true });
      // Trigger immediate sync when coming online
      setTimeout(runSyncCycle, 1000);
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      notify('connectivity', { online: false });
    });

    // Periodic connectivity check (every 30s)
    checkTimer = setInterval(checkConnectivity, CONFIG.CHECK_INTERVAL);

    // Periodic full sync (every 60s when online)
    syncTimer = setInterval(() => {
      if (isOnline) {
        runSyncCycle();
      }
    }, CONFIG.SYNC_INTERVAL);

    // Initial sync after short delay
    setTimeout(() => {
      if (navigator.onLine) {
        runSyncCycle();
      }
    }, 3000);

    console.log('[Sync] Background sync started (interval: ' + (CONFIG.CHECK_INTERVAL / 1000) + 's)');
  }

  function stop() {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    console.log('[Sync] Background sync stopped');
  }

  // -----------------------------------------------------------------------
  // Event subscription
  // -----------------------------------------------------------------------
  function onEvent(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  // -----------------------------------------------------------------------
  // Status getters
  // -----------------------------------------------------------------------
  function getStatus() {
    return {
      online: isOnline,
      lastSync: lastSyncTime || DB.getLastSyncTime(),
      pendingCount: DB.getPendingCount(),
      syncInProgress
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  window.SyncService = {
    start,
    stop,
    syncNow,
    onEvent,
    getStatus,
    checkConnectivity
  };
})();

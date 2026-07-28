// OFFLINE-MODE: Allow direct file:// opening — app works with localStorage offline
// Server is recommended for full features (sync, multi-device, PWA install).
// The sync service will detect that the API is unreachable and operate in offline-only mode.
if (window.location.protocol === 'file:') {
  console.log('[Offline] Opened directly from file system — running in offline-only mode.');
}

const STORAGE_KEYS = {
  inventory: 'pos_inventory_db',
  sales: 'pos_sales_history',
  customers: 'pos_customers',
  suppliers: 'pos_suppliers',
  purchaseOrders: 'pos_purchase_orders',
  restocks: 'pos_restocks',
  audit: 'pos_audit_log',
  users: 'pos_users_db',
  companyName: 'pos_company_name',
  uploads: 'pos_uploaded_files'
};
const DEFAULT_COMPANY_NAME = 'SYNC-STORE';
const TAX_RATE = 0.08;
const CURRENCY = 'GHS';
const cart = new Map();
let inventory = loadInventory();
let salesHistory = loadSalesHistory();
let customers = loadCustomers();
let suppliers = loadSuppliers();
let purchaseOrders = loadPurchaseOrders();
let restocks = loadRestocks();
let editingRestockId = null; // Track which restock entry is being edited
let restockShowingAll = false; // Track if "All History" view is active
let auditLog = loadAuditLog();
const $productGrid = document.getElementById('productGrid');
const $cartItems = document.getElementById('cartItems');
const $cartCount = document.getElementById('cartCount');
const $subtotal = document.getElementById('subtotal');
const $tax = document.getElementById('tax');
const $total = document.getElementById('total');
const $receiptOutput = document.getElementById('receiptOutput');
const $searchInput = document.getElementById('searchInput');
const $inventorySearch = document.getElementById('inventorySearch');
const $inventoryTableContainer = document.getElementById('inventoryTableContainer');
const $inventoryAlerts = document.getElementById('inventoryAlerts');
const $salesHistoryTable = document.getElementById('salesHistoryTable');
const $lowStockList = document.getElementById('lowStockList');
const $reportTotalSales = document.getElementById('reportTotalSales');
const $reportTransactionCount = document.getElementById('reportTransactionCount');
const $reportItemsSold = document.getElementById('reportItemsSold');
const $reportLowStockCount = document.getElementById('reportLowStockCount');
const $reportPrincipal = document.getElementById('reportPrincipal');
const $reportProfit = document.getElementById('reportProfit');
const $reportLoss = document.getElementById('reportLoss');
const $reportPeriodTitle = document.getElementById('reportPeriodTitle');
const $reportPeriodSummary = document.getElementById('reportPeriodSummary');
const $reportPeriodTransactions = document.getElementById('reportPeriodTransactions');
const reportPeriodButtons = Array.from(document.querySelectorAll('.report-button:not(.add-entry)'));
const $stockForm = document.getElementById('stockForm');
const $itemBrand = document.getElementById('itemBrand');
const $itemCarType = document.getElementById('itemCarType');
const $itemYear = document.getElementById('itemYear');
const $itemSidePart = document.getElementById('itemSidePart');
const $itemPrice = document.getElementById('itemPrice');
const $itemCost = document.getElementById('itemCost');
const $itemQuantity = document.getElementById('itemQuantity');
const $itemLowThreshold = document.getElementById('itemLowThreshold');
let editingItemId = null; // tracks which item is being edited via the form
const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
const $btnCheckout = document.getElementById('btnCheckout');
const $btnClear = document.getElementById('btnClear');
const $btnPrint = document.getElementById('btnPrint');
const $btnExportBackup = document.getElementById('btnExportBackup');
const $networkStatus = document.getElementById('networkStatus');
const $barcodeInput = document.getElementById('barcodeInput');
const $btnAddBarcode = document.getElementById('btnAddBarcode');
const $customerSelect = document.getElementById('customerSelect');
const $customerSearch = document.getElementById('customerSearch');
const $customerTableContainer = document.getElementById('customerTableContainer');
const $customerForm = document.getElementById('customerForm');
const $supplierSearch = document.getElementById('supplierSearch');
const $supplierTableContainer = document.getElementById('supplierTableContainer');
const $supplierForm = document.getElementById('supplierForm');
const $orderSupplier = document.getElementById('orderSupplier');
const $orderProduct = document.getElementById('orderProduct');
const $orderQuantity = document.getElementById('orderQuantity');
const $orderCost = document.getElementById('orderCost');
const $purchaseOrderForm = document.getElementById('purchaseOrderForm');
const $purchaseOrdersList = document.getElementById('purchaseOrdersList');
const $auditFilter = document.getElementById('auditFilter');
const $auditLogContainer = document.getElementById('auditLogContainer');
const $loginForm = document.getElementById('loginForm');
const $loginUsername = document.getElementById('loginUsername');
const $loginPassword = document.getElementById('loginPassword');
const $roleSelect = document.getElementById('roleSelect');
const $loginMessage = document.getElementById('loginMessage');
const $btnLogout = document.getElementById('btnLogout');
// OFFLINE-MODE: New DOM references
const $connectionBanner = document.getElementById('connectionBanner');
const $paymentMethod = document.getElementById('paymentMethod');
const $paymentWarning = document.getElementById('paymentWarning');
const $btnSyncNow = document.getElementById('btnSyncNow');
const $lastSyncTime = document.getElementById('lastSyncTime');
// OFFLINE-MODE: Add Customer modal references
const $btnAddCustomer = document.getElementById('btnAddCustomer');
const $addCustomerModal = document.getElementById('addCustomerModal');
const $salesCustomerForm = document.getElementById('salesCustomerForm');
const $salesCustomerName = document.getElementById('salesCustomerName');
const $salesCustomerEmail = document.getElementById('salesCustomerEmail');
const $salesCustomerPhone = document.getElementById('salesCustomerPhone');
const $btnCloseCustomerModal = document.getElementById('btnCloseCustomerModal');
const $btnCancelCustomer = document.getElementById('btnCancelCustomer');
// Company name editing
const $companyTitle = document.getElementById('companyTitle');
const $btnEditCompanyName = document.getElementById('btnEditCompanyName');
const $companyNameEditor = document.getElementById('companyNameEditor');
const $companyNameInput = document.getElementById('companyNameInput');
const $btnSaveCompanyName = document.getElementById('btnSaveCompanyName');
const $btnCancelCompanyName = document.getElementById('btnCancelCompanyName');
const $btnCloseCompanyNameEditor = document.getElementById('btnCloseCompanyNameEditor');
// IMPORT: DOM references for Excel/CSV import
const $importUploadArea = document.getElementById('importUploadArea');
const $importFileInput = document.getElementById('importFileInput');
const $importFileInfo = document.getElementById('importFileInfo');
const $importFileName = document.getElementById('importFileName');
const $importFileRemove = document.getElementById('importFileRemove');
const $importSheetSelector = document.getElementById('importSheetSelector');
const $importSheetSelect = document.getElementById('importSheetSelect');
const $importMapping = document.getElementById('importMapping');
const $importMappingFields = document.getElementById('importMappingFields');
const $importPreview = document.getElementById('importPreview');
const $importPreviewTable = document.getElementById('importPreviewTable');
const $importPreviewInfo = document.getElementById('importPreviewInfo');
const $importActions = document.getElementById('importActions');
const $btnImportData = document.getElementById('btnImportData');
const $importStatus = document.getElementById('importStatus');
const $importHistory = document.getElementById('importHistory');
const $importHistoryList = document.getElementById('importHistoryList');
const $uploadedFilesList = document.getElementById('uploadedFilesList');
const importTypeButtons = Array.from(document.querySelectorAll('.import-type-btn'));
const ROLE_PAGE_MAP = {
  salesperson: 'salesperson.html',
  manager: 'manager.html'
};
const AUTH_STORAGE_KEY = 'pos_active_session';
const MANAGER_CREDENTIALS_KEY = 'pos_manager_credentials';
const USER_ACCOUNTS = {
  salesperson: {
    username: 'salesperson',
    password: 'sales123',
    role: 'salesperson'
  },
  manager: {
    username: 'manager',
    password: 'manager123',
    role: 'manager'
  }
};
let selectedReportPeriod = 'daily';
let apiConnected = false;
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const currentRole = document.body ? document.body.dataset.role || '' : '';
function normalizeInventoryItem(product) {
  // Migrate old field names (name→brand, sku→carType, category→year)
  if (product.name !== undefined && product.brand === undefined) {
    product.brand = product.name;
  }
  if (product.sku !== undefined && product.carType === undefined) {
    product.carType = product.sku;
  }
  if (product.category !== undefined && product.year === undefined) {
    product.year = product.category;
  }
  if (product.sidePart === undefined) {
    product.sidePart = '';
  }
  if (product.cost == null) {
    product.cost = typeof product.price === 'number' ? Number((product.price * 0.65).toFixed(2)) : 0;
  }
  return product;
}
function loadInventory() {
  const raw = localStorage.getItem(STORAGE_KEYS.inventory);
  try {
    return raw ? JSON.parse(raw).map(normalizeInventoryItem) : [];
  } catch (error) {
    return [];
  }
}
function saveInventory() {
  localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
  if (apiConnected) syncToServer('inventory', inventory);
}
function loadCompanyName() {
  const raw = localStorage.getItem(STORAGE_KEYS.companyName);
  return raw || DEFAULT_COMPANY_NAME;
}
function saveCompanyName(name) {
  localStorage.setItem(STORAGE_KEYS.companyName, name);
}
function updateCompanyTitle() {
  if (!$companyTitle) return;
  const name = loadCompanyName();
  $companyTitle.textContent = name;
  if ($companyNameInput) $companyNameInput.value = name;
  // Update the page title
  document.title = name + ' - ' + (currentRole === 'manager' ? 'Manager Dashboard' : 'Sales Dashboard');
}
let updateBannerShown = false;
let syncInProgress = false;

function updateNetworkStatus(isReachable) {
  if (!$networkStatus) return;
  const online = navigator.onLine;
  const reachable = isReachable !== undefined ? isReachable : apiConnected;
  if (online && reachable) {
    $networkStatus.textContent = 'Online';
    $networkStatus.classList.toggle('online', true);
    $networkStatus.classList.toggle('offline', false);
  } else if (online && !reachable) {
    $networkStatus.textContent = 'Server Unreachable';
    $networkStatus.classList.toggle('online', false);
    $networkStatus.classList.toggle('offline', true);
  } else {
    $networkStatus.textContent = 'Offline';
    $networkStatus.classList.toggle('online', false);
    $networkStatus.classList.toggle('offline', true);
  }
}

async function checkApiReachability() {
  if (!navigator.onLine) {
    apiConnected = false;
    updateNetworkStatus(false);
    return false;
  }
  try {
    const reachable = await API.checkReachable();
    apiConnected = reachable;
    updateNetworkStatus(reachable);
    return reachable;
  } catch (_) {
    apiConnected = false;
    updateNetworkStatus(false);
    return false;
  }
}

async function triggerBackgroundSync() {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    const reachable = await checkApiReachability();
    if (reachable) {
      console.log('[Sync] Online — syncing data from server...');
      // Try to sync all local data to server
      if (inventory.length > 0) {
        try { await syncToServer('inventory', inventory); } catch (_) {}
      }
      // Sync fresh data from server
      try {
        await syncFromServer();
        renderAll();
        console.log('[Sync] Background sync completed successfully.');
      } catch (e) {
        console.warn('[Sync] Background sync from server failed:', e);
      }
    } else {
      console.log('[Sync] Still offline, will retry later.');
    }
  } finally {
    syncInProgress = false;
  }
}
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then((registration) => {
    console.log('[SW] Registered successfully.');

    // ---- Auto-update detection ----
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version is installed and waiting
          console.log('[SW] New version available.');
          showUpdateBanner(registration);
        }
      });
    });

    // Check for updates every 30 minutes
    setInterval(() => {
      registration.update().catch((err) => {
        console.warn('[SW] Update check failed:', err);
      });
    }, 30 * 60 * 1000);
  }).catch((error) => {
    console.warn('[SW] Registration failed:', error);
  });
}

/**
 * Show a banner asking the user to refresh for a new version.
 */
function showUpdateBanner(registration) {
  if (updateBannerShown) return;
  updateBannerShown = true;

  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.innerHTML = `
    <p>&#x1f504; A new version is available!</p>
    <button class="button primary" id="btnUpdateRefresh">Refresh</button>
    <button class="button secondary" id="btnUpdateDismiss">Later</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('btnUpdateRefresh').addEventListener('click', () => {
    banner.remove();
    updateBannerShown = false;
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  });

  document.getElementById('btnUpdateDismiss').addEventListener('click', () => {
    banner.remove();
    updateBannerShown = false;
  });
}

/**
 * Periodically check for API connectivity and sync.
 */
function startPeriodicSync() {
  // Check immediately
  setTimeout(checkApiReachability, 1000);
  // Then every 60 seconds
  setInterval(() => {
    if (navigator.onLine) {
      checkApiReachability().then((reachable) => {
        if (reachable) triggerBackgroundSync();
      });
    }
  }, 60 * 1000);
}
function loadSalesHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.sales);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function saveSalesHistory() {
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(salesHistory));
  if (apiConnected) syncToServer('sales', salesHistory);
}
function loadCustomers() {
  const raw = localStorage.getItem(STORAGE_KEYS.customers);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function saveCustomers() {
  localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
  if (apiConnected) syncToServer('customers', customers);
}
function loadSuppliers() {
  const raw = localStorage.getItem(STORAGE_KEYS.suppliers);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function saveSuppliers() {
  localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
  if (apiConnected) syncToServer('suppliers', suppliers);
}
function loadPurchaseOrders() {
  const raw = localStorage.getItem(STORAGE_KEYS.purchaseOrders);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function savePurchaseOrders() {
  localStorage.setItem(STORAGE_KEYS.purchaseOrders, JSON.stringify(purchaseOrders));
  if (apiConnected) syncToServer('purchaseOrders', purchaseOrders);
}
function loadRestocks() {
  const raw = localStorage.getItem(STORAGE_KEYS.restocks);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function saveRestocks() {
  localStorage.setItem(STORAGE_KEYS.restocks, JSON.stringify(restocks));
  if (apiConnected) syncToServer('restocks', restocks);
}

// Record a restock entry whenever stock is added to inventory
// @param {object} product - The product object (must have id, brand, carType, etc.)
// @param {number} quantityAdded - Quantity added
// @param {string} supplierName - Supplier name
// @param {string} notes - Notes
// @param {string} [customTimestamp] - Optional custom ISO timestamp (defaults to now)
function recordRestock(product, quantityAdded, supplierName, notes, customTimestamp) {
  const timestamp = customTimestamp || new Date().toISOString();
  const restockMonth = timestamp.slice(0, 7);
  const entry = {
    id: restocks.length ? Math.max(...restocks.map((item) => item.id)) + 1 : 1,
    productId: product.id,
    brand: product.brand || '',
    carType: product.carType || '',
    year: product.year || '',
    sidePart: product.sidePart || '',
    quantityAdded,
    unitCost: 0,
    totalCost: 0,
    supplierName: supplierName || '',
    supplierId: null,
    notes: notes || '',
    createdBy: getStoredSession()?.username || '',
    timestamp: timestamp,
    restockMonth: restockMonth,
    syncStatus: 'synced'
  };
  restocks.unshift(entry);
  saveRestocks();
  
  logAudit('inventory', `Restock recorded: ${product.brand} ${product.carType}`,
    `Quantity: ${quantityAdded}${supplierName ? ', Supplier: ' + supplierName : ''}${restockMonth !== new Date().toISOString().slice(0,7) ? ', Month: ' + restockMonth : ''}`);
  
  // Sync to server if connected
  if (apiConnected) {
    API.post('/restocks', {
      productId: product.id,
      brand: product.brand,
      carType: product.carType,
      year: product.year,
      sidePart: product.sidePart,
      quantityAdded,
      unitCost: 0,
      supplierName,
      notes,
      timestamp
    }).catch(e => console.warn('Failed to sync restock to server:', e));
  }
}

// ============================
// API SYNC
// ============================
async function syncFromServer() {
  if (!apiConnected) return;
  try {
    const [inv, sales, cust, supp, orders, restocksData, audit] = await Promise.all([
      API.get('/inventory'),
      API.get('/sales'),
      API.get('/customers'),
      API.get('/suppliers'),
      API.get('/purchase-orders'),
      API.get('/restocks'),
      API.get('/audit')
    ]);
    // Update local arrays (set serverId for items downloaded from server)
    inventory.length = 0; inventory.push(...inv.map(item => { const n = normalizeInventoryItem(item); n.serverId = item.id; return n; }));
    salesHistory.length = 0; salesHistory.push(...sales.map(s => { if (s.id) s.serverId = s.id; return s; }));
    customers.length = 0; customers.push(...cust.map(c => { if (c.id) c.serverId = c.id; return c; }));
    suppliers.length = 0; suppliers.push(...supp.map(s => { if (s.id) s.serverId = s.id; return s; }));
    purchaseOrders.length = 0; purchaseOrders.push(...orders.map(o => { if (o.id) o.serverId = o.id; return o; }));
    restocks.length = 0; restocks.push(...restocksData);
    auditLog.length = 0; auditLog.push(...audit);
    // Update localStorage
    localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(salesHistory));
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
    localStorage.setItem(STORAGE_KEYS.purchaseOrders, JSON.stringify(purchaseOrders));
    localStorage.setItem(STORAGE_KEYS.restocks, JSON.stringify(restocks));
    localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(auditLog));
    console.log('Data synced from server successfully.');
  } catch (e) {
    console.warn('Failed to sync from server, using local data.', e);
    apiConnected = false;
  }
}
async function syncToServer(dataType, data) {
  if (!apiConnected) return;
  try {
    if (dataType === 'inventory') {
      // Sync inventory - POST new items, PUT existing items with serverId
      for (const item of data) {
        try {
          if (item.serverId) {
            await API.put('/inventory/' + item.serverId, item);
          } else {
            const saved = await API.post('/inventory', {
              brand: item.brand,
              carType: item.carType,
              year: item.year || '',
              sidePart: item.sidePart || '',
              price: item.price || 0,
              cost: item.cost || 0,
              quantity: item.quantity || 0,
              lowThreshold: item.lowThreshold || 3
            });
            if (saved && saved.id) item.serverId = saved.id;
          }
        } catch (_) {}
      }
      // Re-save localStorage to capture any new serverIds
      localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
    } else if (dataType === 'customers') {
      for (const c of data) {
        try {
          if (c.serverId) {
            await API.put('/customers/' + c.serverId, c);
          } else {
            const saved = await API.post('/customers', { name: c.name, email: c.email || '', phone: c.phone || '' });
            if (saved && saved.id) c.serverId = saved.id;
          }
        } catch (_) {}
      }
      localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
    } else if (dataType === 'suppliers') {
      for (const s of data) {
        try {
          if (s.serverId) {
            await API.put('/suppliers/' + s.serverId, s);
          } else {
            const saved = await API.post('/suppliers', { name: s.name, contact: s.contact || '', email: s.email || '', phone: s.phone || '' });
            if (saved && saved.id) s.serverId = saved.id;
          }
        } catch (_) {}
      }
      localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
    } else if (dataType === 'purchaseOrders') {
      for (const po of data) {
        try {
          if (po.serverId) {
            await API.put('/purchase-orders/' + po.serverId, po);
          } else {
            const saved = await API.post('/purchase-orders', po);
            if (saved && saved.id) po.serverId = saved.id;
          }
        } catch (_) {}
      }
      localStorage.setItem(STORAGE_KEYS.purchaseOrders, JSON.stringify(purchaseOrders));
    } else if (dataType === 'sales') {
      // Sales are already posted individually during checkout
    } else if (dataType === 'audit') {
      // Audit logs are already posted individually
    } else if (dataType === 'restocks') {
      // Restocks are already posted individually during recording
    }
  } catch (e) {
    console.warn('Failed to sync ' + dataType + ' to server.', e);
  }
}
// Push all local data to server (used before syncing from server to prevent data loss)
async function pushAllLocalData() {
  if (!apiConnected) return;
  const tasks = [];
  if (inventory.length > 0) tasks.push(syncToServer('inventory', inventory));
  if (customers.length > 0) tasks.push(syncToServer('customers', customers));
  if (suppliers.length > 0) tasks.push(syncToServer('suppliers', suppliers));
  if (purchaseOrders.length > 0) tasks.push(syncToServer('purchaseOrders', purchaseOrders));
  await Promise.allSettled(tasks);
}
async function syncUserToServer(action, userData) {
  if (!apiConnected) return;
  try {
    if (action === 'add') {
      await API.post('/users', userData);
    } else if (action === 'remove') {
      await API.del('/users/' + userData.id);
    }
  } catch (e) {
    console.warn('Failed to sync user to server.', e);
  }
}

// ============================
// USER MANAGEMENT
// ============================
let customUsers = loadUsers();
applyStoredManagerCredentials();
function loadUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(customUsers));
}

// ============================
// MANAGER CREDENTIALS OVERRIDE
// ============================
function loadManagerCredentials() {
  try {
    const raw = localStorage.getItem(MANAGER_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function saveManagerCredentials(creds) {
  if (creds) localStorage.setItem(MANAGER_CREDENTIALS_KEY, JSON.stringify(creds));
  else localStorage.removeItem(MANAGER_CREDENTIALS_KEY);
}

/**
 * Apply stored manager credentials override to USER_ACCOUNTS.
 * Call this on page load so login uses the custom credentials.
 */
function applyStoredManagerCredentials() {
  const stored = loadManagerCredentials();
  if (stored && stored.username && stored.password) {
    USER_ACCOUNTS.manager = stored;
  }
}

/**
 * Update the manager's login credentials (username & password).
 * Updates both the in-memory USER_ACCOUNTS and localStorage.
 * If the server is reachable it also syncs the change.
 */
async function updateManagerCredentials(newUsername, newPassword) {
  const normalised = newUsername.toLowerCase().trim();
  if (!normalised || !newPassword) return false;
  if (newPassword.length < 4) return false;

  // Update in-memory default
  USER_ACCOUNTS.manager = {
    username: normalised,
    password: newPassword,
    role: 'manager'
  };

  // Persist to localStorage
  saveManagerCredentials(USER_ACCOUNTS.manager);

  // Sync to server if connected
  if (apiConnected) {
    try {
      await API.post('/auth/credentials', {
        username: normalised,
        password: newPassword
      });
    } catch (e) {
      console.warn('[Credentials] Failed to sync to server:', e);
    }
  }

  // Log audit
  logAudit('user', 'Manager credentials updated', 'Manager login details changed');
  return true;
}
async function authenticateUser(username, password, role) {
  // Normalise username to lowercase for case‑insensitive matching
  const normalisedUsername = username.toLowerCase().trim();
  // Try API login first
  try {
    const user = await API.login(normalisedUsername, password, role);
    apiConnected = true;
    return { username: user.username, password: null, role: user.role };
  } catch (_) {
    apiConnected = false;
  }
  // Fall back to hardcoded defaults (case‑insensitive username)
  const defaultAccount = USER_ACCOUNTS[role];
  if (defaultAccount && defaultAccount.username === normalisedUsername && defaultAccount.password === password) {
    return defaultAccount;
  }
  // Then check custom stored users (case‑insensitive username)
  const customAccount = customUsers.find((u) => u.username.toLowerCase() === normalisedUsername && u.password === password && u.role === role);
  return customAccount || null;
}
function addUser(username, password, role) {
  const normalisedUsername = username.toLowerCase().trim();
  const exists = customUsers.find((u) => u.username.toLowerCase() === normalisedUsername || (u.role === role && u.username.toLowerCase() === normalisedUsername));
  if (exists) return false;
  const newUser = { id: Date.now(), username: normalisedUsername, password, role };
  customUsers.push(newUser);
  saveUsers();
  logAudit('user', `Added ${role} user: ${normalisedUsername}`, `New ${role} account created`);
  if (apiConnected) syncUserToServer('add', { username: normalisedUsername, password, role }).catch(() => {});
  return true;
}
function removeUser(userId) {
  const idx = customUsers.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  const removed = customUsers[idx];
  customUsers.splice(idx, 1);
  saveUsers();
  logAudit('user', `Removed user: ${removed.username}`, `${removed.role} account deleted`);
  if (apiConnected) syncUserToServer('remove', { id: removed.id, username: removed.username }).catch(() => {});
  return true;
}
function renderUserTable() {
  const $container = document.getElementById('userTableContainer');
  if (!$container) return;
  if (customUsers.length === 0) {
    $container.innerHTML = '<p class="empty-state">No custom users created yet.</p>';
    return;
  }
  const rows = customUsers
    .filter((u) => u.role === 'salesperson')
    .map((u) => `
      <tr>
        <td>${u.username}</td>
        <td>${u.role === 'salesperson' ? 'Sales Person' : 'Manager'}</td>
        <td>
          <button type="button" class="button secondary" data-action="remove-user" data-user-id="${u.id}">Remove</button>
        </td>
      </tr>
    `).join('');
  $container.innerHTML = `
    <table class="inventory-table">
      <thead><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3">No salesperson accounts created.</td></tr>'}</tbody>
    </table>`;
}

function loadAuditLog() {
  const raw = localStorage.getItem(STORAGE_KEYS.audit);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}
function saveAuditLog() {
  localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(auditLog));
  if (apiConnected) syncToServer('audit', auditLog);
}
function logAudit(type, title, details) {
  const entry = {
    id: auditLog.length ? Math.max(...auditLog.map((item) => item.id)) + 1 : 1,
    type,
    title,
    details,
    timestamp: new Date().toISOString()
  };
  auditLog.unshift(entry);
  saveAuditLog();
}
function formatCurrency(value) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: CURRENCY }).format(value);
}
function getStockStatus(product) {
  if (product.quantity <= 0) return 'out';
  if (product.quantity <= product.lowThreshold) return 'low';
  return 'normal';
}
function getStatusLabel(status) {
  if (status === 'out') return 'Sold out';
  if (status === 'low') return 'Low stock';
  return 'Available';
}
function renderProducts(filter = '') {
  const normalized = filter.trim().toLowerCase();
  const filtered = inventory.filter((product) => {
    return (
      (product.brand || '').toLowerCase().includes(normalized) ||
      (product.carType || '').toLowerCase().includes(normalized) ||
      (product.year || '').toLowerCase().includes(normalized) ||
      (product.sidePart || '').toLowerCase().includes(normalized)
    );
  });
  
  if (filtered.length === 0) {
    $productGrid.innerHTML = '<p class="empty-state">No products match your search.</p>';
    return;
  }
  
  // Group products by brand + carType
  const groups = {};
  filtered.forEach(product => {
    const key = ((product.brand || 'Unknown') + '|' + (product.carType || '')).toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        brand: product.brand || 'Unknown',
        carType: product.carType || '',
        variants: []
      };
    }
    groups[key].variants.push(product);
  });
  
  $productGrid.innerHTML = `
    <div class="product-accordion">
      ${Object.values(groups).map(group => {
        const totalQty = group.variants.reduce((sum, v) => sum + v.quantity, 0);
        const totalVariants = group.variants.length;
        return `
          <div class="product-accordion-item">
            <div class="product-accordion-header">
              <span class="accordion-arrow">▶</span>
              <span class="prod-accordion-brand">${group.brand}</span>
              <span class="prod-accordion-car">${group.carType}</span>
              <span class="accordion-badge">${totalVariants} variant${totalVariants > 1 ? 's' : ''}</span>
              <span class="prod-accordion-qty">${totalQty} in stock</span>
            </div>
            <div class="product-accordion-body" style="display:none;">
              ${group.variants.map(product => {
                const status = getStockStatus(product);
                const disabled = product.quantity <= 0;
                const detailParts = [product.year, product.sidePart].filter(Boolean);
                return `
                  <div class="prod-variant-card">
                    <div class="prod-variant-info">
                      ${detailParts.length > 0 ? `<span class="prod-variant-id">${detailParts.join(' · ')}</span>` : '<span class="prod-variant-id">Default</span>'}
                      <div class="prod-variant-meta">
                        <span class="price">${formatCurrency(product.price)}</span>
                        <span class="inventory-status ${status === 'low' ? 'status-low' : status === 'out' ? 'status-out' : 'status-normal'}">${getStatusLabel(status)}</span>
                      </div>
                    </div>
                    <button type="button" class="button primary" data-product-id="${product.id}" ${disabled ? 'disabled' : ''}>
                      ${disabled ? 'Out of Stock' : 'Add to cart'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
}
function updateCartTotals() {
  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
  });
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  $subtotal.textContent = formatCurrency(subtotal);
  $tax.textContent = formatCurrency(tax);
  $total.textContent = formatCurrency(total);
  $cartCount.textContent = `${Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0)} item${Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}`;
}
function renderCart() {
  if (cart.size === 0) {
    $cartItems.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
    updateCartTotals();
    return;
  }
  $cartItems.innerHTML = Array.from(cart.values())
    .map((item) => `
      <div class="cart-item">
        <div class="cart-item-details">
          <h3>${item.name}</h3>
          ${item.variant ? `<p class="item-variant">Type: ${item.variant}</p>` : ''}
          <p class="price">${formatCurrency(item.price)} × ${item.quantity} = ${formatCurrency(item.price * item.quantity)}</p>
          <div class="quantity-control">
            <button type="button" data-action="decrease" data-cart-key="${item.key}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" data-cart-key="${item.key}">+</button>
          </div>
        </div>
        <div class="cart-item-actions">
          <button type="button" class="button secondary" data-action="remove" data-cart-key="${item.key}">Remove</button>
        </div>
      </div>`)
    .join('');
  updateCartTotals();
}
function renderInventoryTable(filter = '') {
  const normalized = filter.trim().toLowerCase();
  const filtered = inventory.filter((product) => {
    return (
      (product.brand || '').toLowerCase().includes(normalized) ||
      (product.carType || '').toLowerCase().includes(normalized) ||
      (product.year || '').toLowerCase().includes(normalized) ||
      (product.sidePart || '').toLowerCase().includes(normalized)
    );
  });
  if (filtered.length === 0) {
    $inventoryTableContainer.innerHTML = '<p class="empty-state">No inventory items match your search.</p>';
    return;
  }
  
  // Group products by brand + carType
  const groups = {};
  filtered.forEach(product => {
    const key = ((product.brand || 'Unknown') + '|' + (product.carType || '')).toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        brand: product.brand || 'Unknown',
        carType: product.carType || '',
        variants: []
      };
    }
    groups[key].variants.push(product);
  });
  
  $inventoryTableContainer.innerHTML = `
    <div class="inventory-accordion">
      ${Object.values(groups).map(group => {
        const totalQty = group.variants.reduce((sum, v) => sum + v.quantity, 0);
        const totalVariants = group.variants.length;
        return `
          <div class="inventory-accordion-item inv-group-item">
            <div class="inventory-accordion-header">
              <span class="accordion-arrow">▶</span>
              <span class="inv-accordion-brand">${group.brand}</span>
              <span class="inv-accordion-car">${group.carType}</span>
              <span class="accordion-badge">${totalVariants} variant${totalVariants > 1 ? 's' : ''}</span>
              <span class="inv-accordion-qty">${totalQty} in stock</span>
            </div>
            <div class="inventory-accordion-body" style="display:none;">
              ${group.variants.map(product => {
                const status = getStockStatus(product);
                const statusLabel = getStatusLabel(status);
                const statusClass = status === 'low' ? 'status-low' : status === 'out' ? 'status-out' : 'status-normal';
                const detailParts = [product.year, product.sidePart].filter(Boolean);
                return `
                  <div class="inv-variant-card">
                    <div class="inv-variant-head">
                      ${detailParts.length > 0 ? `<span class="inv-variant-id">${detailParts.join(' · ')}</span>` : '<span class="inv-variant-id">Default</span>'}
                      <span class="inv-variant-qty">${product.quantity} units</span>
                      <span class="inventory-status ${statusClass} inv-accordion-status">${statusLabel}</span>
                    </div>
                    <div class="inv-accordion-detail-grid">
                      <div class="inv-detail-item">
                        <span class="inv-detail-label">Price</span>
                        <span class="inv-detail-value">${formatCurrency(product.price)}</span>
                      </div>
                      <div class="inv-detail-item">
                        <span class="inv-detail-label">Cost</span>
                        <span class="inv-detail-value">${formatCurrency(product.cost)}</span>
                      </div>
                      <div class="inv-detail-item">
                        <span class="inv-detail-label">Low Threshold</span>
                        <span class="inv-detail-value">${product.lowThreshold !== undefined ? product.lowThreshold : 3}</span>
                      </div>
                      <div class="inv-detail-item">
                        <span class="inv-detail-label">Product ID</span>
                        <span class="inv-detail-value">#${product.id}</span>
                      </div>
                    </div>
                    <div class="inv-accordion-actions">
                      <button type="button" class="button secondary" data-action="decrease-stock" data-id="${product.id}" title="Decrease stock by 1">−</button>
                      <button type="button" class="button secondary" data-action="increase-stock" data-id="${product.id}" title="Increase stock by 1">+</button>
                      <button type="button" class="button secondary" data-action="edit-item" data-id="${product.id}">Edit</button>
                      <button type="button" class="button secondary" data-action="rename-item" data-id="${product.id}">Rename</button>
                      <button type="button" class="button secondary btn-danger" data-action="delete-item" data-id="${product.id}">Delete</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
}
function renderSalesHistory() {
  if (salesHistory.length === 0) {
    $salesHistoryTable.innerHTML = '<p class="empty-state">No sales have been recorded yet.</p>';
    return;
  }
  $salesHistoryTable.innerHTML = `
    <div class="report-data-grid">
      ${salesHistory.slice(0, 7).map((sale) => {
        return `
          <div class="report-row">
            <div>
              <strong>${new Date(sale.timestamp).toLocaleString()}</strong>
              <span>${sale.items.length} item${sale.items.length === 1 ? '' : 's'}</span>
            </div>
            <div>
              <span>${sale.transactionId}</span>
              <strong>${formatCurrency(sale.total)}</strong>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}
function renderLowStockList() {
  const lowItems = inventory.filter((product) => product.quantity <= product.lowThreshold);
  if (lowItems.length === 0) {
    $lowStockList.innerHTML = '<p class="empty-state">All inventory levels are healthy.</p>';
    return;
  }
  $lowStockList.innerHTML = `
    <div class="report-data-grid">
      ${lowItems.map((product) => {
        const status = getStockStatus(product);
        const metaParts = [product.carType, product.sidePart, product.year].filter(Boolean);
        return `
          <div class="report-row">
            <div>
              <strong>${product.brand}</strong>
              <span>${metaParts.join(' · ')}</span>
            </div>
            <div>
              <span class="inventory-status ${status === 'out' ? 'status-out' : 'status-low'}">${getStatusLabel(status)}</span>
              <strong>${product.quantity} left</strong>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}
function calculateFinancialSummary() {
  const totalSales = salesHistory.reduce((sum, sale) => sum + sale.total, 0);
  const totalCostSold = salesHistory.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const product = inventory.find((prod) => prod.id === item.id);
      const cost = product ? product.cost : item.price * 0.65;
      return itemSum + cost * item.quantity;
    }, 0);
  }, 0);
  const profit = totalSales - totalCostSold;
  const principalValue = inventory.reduce((sum, product) => sum + product.cost * product.quantity, 0);
  return { totalSales, totalCostSold, profit, principalValue };
}
function renderReportCards() {
  const totalSales = salesHistory.reduce((sum, sale) => sum + sale.total, 0);
  const totalItems = salesHistory.reduce((sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.quantity, 0), 0);
  const lowStockItems = inventory.filter((product) => product.quantity <= product.lowThreshold).length;
  const summary = calculateFinancialSummary();
  const profit = Math.max(summary.profit, 0);
  const loss = Math.max(-summary.profit, 0);
  $reportTotalSales.textContent = formatCurrency(totalSales);
  $reportTransactionCount.textContent = salesHistory.length;
  $reportItemsSold.textContent = totalItems;
  $reportLowStockCount.textContent = lowStockItems;
  $reportPrincipal.textContent = `${CURRENCY}${summary.principalValue.toFixed(2)}`;
  $reportProfit.textContent = formatCurrency(profit);
  $reportLoss.textContent = formatCurrency(loss);
}
function startOfDay(date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}
function startOfWeek(date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = (day + 6) % 7;
  clone.setDate(clone.getDate() - diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
}
function startOfMonth(date) {
  const clone = new Date(date);
  clone.setDate(1);
  clone.setHours(0, 0, 0, 0);
  return clone;
}
function startOfYear(date) {
  const clone = new Date(date);
  clone.setMonth(0, 1);
  clone.setHours(0, 0, 0, 0);
  return clone;
}
function isSaleInPeriod(saleDate, period) {
  const date = new Date(saleDate);
  const now = new Date();
  if (period === 'daily') {
    return date >= startOfDay(now);
  }
  if (period === 'weekly') {
    return date >= startOfWeek(now);
  }
  if (period === 'monthly') {
    return date >= startOfMonth(now);
  }
  if (period === 'yearly') {
    return date >= startOfYear(now);
  }
  return true;
}
function getPeriodMetrics(period) {
  const filteredSales = salesHistory.filter((sale) => isSaleInPeriod(sale.timestamp, period));
  const total = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const transactions = filteredSales.length;
  const itemsSold = filteredSales.reduce((sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.quantity, 0), 0);
  return { total, transactions, itemsSold, sales: filteredSales };
}
function renderReportPeriodSummary(period) {
  const metrics = getPeriodMetrics(period);
  const titleMap = {
    daily: "Today's Breakdown",
    weekly: 'Weekly Breakdown',
    monthly: 'Monthly Breakdown',
    yearly: 'Yearly Breakdown'
  };
  $reportPeriodTitle.textContent = titleMap[period] || 'Period Breakdown';
  $reportPeriodSummary.innerHTML = `
    <div class="report-row"><span>Total Sales</span><strong>${formatCurrency(metrics.total)}</strong></div>
    <div class="report-row"><span>Transactions</span><strong>${metrics.transactions}</strong></div>
    <div class="report-row"><span>Items Sold</span><strong>${metrics.itemsSold}</strong></div>
    <div class="report-row"><span>Average Sale</span><strong>${metrics.transactions ? formatCurrency(metrics.total / metrics.transactions) : formatCurrency(0)}</strong></div>
  `;
  if (metrics.sales.length === 0) {
    $reportPeriodTransactions.innerHTML = '<p class="empty-state">No sales recorded for this period.</p>';
    return;
  }
  const isManager = currentRole === 'manager';
  $reportPeriodTransactions.innerHTML = `
    <div class="report-data-grid">
      ${metrics.sales.map((sale) => `
        <div class="report-row${isManager ? ' is-editable' : ''}">
          <div>
            <strong>${new Date(sale.timestamp).toLocaleString()}</strong>
            <span>${sale.items.length} item${sale.items.length === 1 ? '' : 's'}</span>
          </div>
          <div>
            <span>${sale.transactionId}</span>
            <strong>${formatCurrency(sale.total)}</strong>
          </div>
          ${isManager ? `
          <div class="report-actions">
            <button class="btn-icon btn-edit" onclick="openEditSaleModal(${sale.id})" title="Edit">&#9998;</button>
            <button class="btn-icon btn-delete" onclick="deleteSaleEntry(${sale.id})" title="Delete">&#10005;</button>
          </div>` : ''}
        </div>
      `).join('')}
    </div>`;
}
function updateReportPeriodButtons() {
  reportPeriodButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.period === selectedReportPeriod);
  });
}
// ---- Sale Edit / Add Modal (Manager only) ----
function openEditSaleModal(saleId) {
  const sale = salesHistory.find(s => s.id === saleId);
  if (!sale) return;
  openSaleModal(sale);
}
function openAddSaleModal() {
  openSaleModal(null);
}
function openSaleModal(sale) {
  const modal = document.getElementById('saleEditModal');
  if (!modal) return;
  // Close when clicking outside modal content
  modal.onclick = function(e) { if (e.target === modal) closeSaleModal(); };
  const titleEl = document.getElementById('saleModalTitle');
  const idField = document.getElementById('editSaleId');
  const txnField = document.getElementById('editTransactionId');
  const itemsField = document.getElementById('editItems');
  const subtotalField = document.getElementById('editSubtotal');
  const taxField = document.getElementById('editTax');
  const totalField = document.getElementById('editTotal');
  const paymentField = document.getElementById('editPaymentMethod');
  const customerField = document.getElementById('editCustomerName');
  const timestampField = document.getElementById('editTimestamp');
  if (sale) {
    titleEl.textContent = 'Edit Sale';
    idField.value = sale.id;
    txnField.value = sale.transactionId;
    itemsField.value = JSON.stringify(sale.items, null, 2);
    subtotalField.value = sale.subtotal;
    taxField.value = sale.tax;
    totalField.value = sale.total;
    paymentField.value = sale.paymentMethod || 'cash';
    customerField.value = sale.customerName || '';
    // Format timestamp for datetime-local input
    const d = new Date(sale.timestamp);
    const pad = (n) => String(n).padStart(2, '0');
    timestampField.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    titleEl.textContent = 'Add Manual Entry';
    idField.value = '';
    txnField.value = 'TXN-MANUAL-' + Date.now();
    itemsField.value = '[{"name":"Item","quantity":1,"price":0}]';
    subtotalField.value = '0';
    taxField.value = '0';
    totalField.value = '0';
    paymentField.value = 'cash';
    customerField.value = '';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    timestampField.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  modal.style.display = 'flex';
}
function closeSaleModal() {
  const modal = document.getElementById('saleEditModal');
  if (modal) modal.style.display = 'none';
}
async function saveSaleEdit(event) {
  event.preventDefault();
  const id = document.getElementById('editSaleId').value;
  const transactionId = document.getElementById('editTransactionId').value;
  let items;
  try {
    items = JSON.parse(document.getElementById('editItems').value);
    if (!Array.isArray(items)) throw new Error('Not an array');
  } catch (e) {
    alert('Items must be valid JSON array. e.g. [{"name":"Part","quantity":1,"price":100}]');
    return;
  }
  const subtotal = parseFloat(document.getElementById('editSubtotal').value) || 0;
  const tax = parseFloat(document.getElementById('editTax').value) || 0;
  const total = parseFloat(document.getElementById('editTotal').value) || 0;
  const paymentMethod = document.getElementById('editPaymentMethod').value;
  const customerName = document.getElementById('editCustomerName').value;
  const timestamp = document.getElementById('editTimestamp').value;
  if (!apiConnected) {
    alert('Cannot save: API not connected. Make sure the server is running.');
    return;
  }
  try {
    const payload = { items, subtotal, tax, total, paymentMethod, customerName, timestamp: new Date(timestamp).toISOString() };
    if (id) {
      // Update existing sale
      const updated = await API.put('/sales/' + id, payload);
      const idx = salesHistory.findIndex(s => s.id === Number(id));
      if (idx !== -1) salesHistory[idx] = updated;
    } else {
      // Create new sale
      await API.post('/sales', payload);
      // Refresh sales list from server
      const sales = await API.get('/sales');
      salesHistory.length = 0;
      salesHistory.push(...sales);
    }
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(salesHistory));
    closeSaleModal();
    renderAll();
  } catch (e) {
    alert('Failed to save sale entry. Check console for details.');
    console.error('Save sale error:', e);
  }
}
async function deleteSaleEntry(saleId) {
  if (!confirm('Are you sure you want to delete this sale entry?')) return;
  if (!apiConnected) {
    alert('Cannot delete: API not connected.');
    return;
  }
  try {
    await API.del('/sales/' + saleId);
    salesHistory = salesHistory.filter(s => s.id !== saleId);
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(salesHistory));
    renderAll();
  } catch (e) {
    alert('Failed to delete sale entry.');
    console.error('Delete sale error:', e);
  }
}
async function clearAllSalesRecords() {
  if (!confirm('⚠️ Are you sure you want to clear ALL report records? This cannot be undone.')) return;
  
  // Always clear local data first
  salesHistory.length = 0;
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(salesHistory));
  
  // Try to clear server data if reachable
  let reachable = false;
  try {
    reachable = await API.checkReachable();
  } catch (_) {}
  
  if (reachable) {
    try {
      await API.del('/sales');
      renderAll();
      return;
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('401') || msg.includes('403') || msg.includes('token')) {
        alert('Your session has expired. Please log out and log in again through:\n  http://localhost:3000');
      } else {
        alert('Failed to clear records on server: ' + msg);
      }
      console.error('Clear error:', e);
    }
  }
  
  renderAll();
  alert('Local records cleared. Server was not reachable — changes will sync when connection is restored.');
}
function renderInventoryAlerts() {
  const lowItems = inventory.filter((product) => product.quantity <= product.lowThreshold);
  if (lowItems.length === 0) {
    $inventoryAlerts.innerHTML = '<p>No low stock items at the moment.</p>';
    return;
  }
  const messages = lowItems.map((product) => {
    const label = product.brand || product.name || 'Unknown';
    if (product.quantity <= 0) {
      return `<p>⚠️ <strong>${label}</strong> is sold out.</p>`;
    }
    return `<p>⚠️ <strong>${label}</strong> stock is low: ${product.quantity} remaining.</p>`;
  });
  $inventoryAlerts.innerHTML = messages.join('');
}
function renderCustomerTable(filter = '') {
  const normalized = filter.trim().toLowerCase();
  const filtered = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(normalized) ||
      (customer.email || '').toLowerCase().includes(normalized) ||
      (customer.phone || '').toLowerCase().includes(normalized)
    );
  });
  if (filtered.length === 0) {
    $customerTableContainer.innerHTML = '<p class="empty-state">No customers match your search.</p>';
    return;
  }
  $customerTableContainer.innerHTML = `
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((customer) => `
          <tr>
            <td>${customer.name}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.phone || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}
function renderSupplierTable(filter = '') {
  const normalized = filter.trim().toLowerCase();
  const filtered = suppliers.filter((supplier) => {
    return (
      supplier.name.toLowerCase().includes(normalized) ||
      (supplier.contact || '').toLowerCase().includes(normalized)
    );
  });
  if (filtered.length === 0) {
    $supplierTableContainer.innerHTML = '<p class="empty-state">No suppliers match your search.</p>';
    return;
  }
  $supplierTableContainer.innerHTML = `
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((supplier) => `
          <tr>
            <td>${supplier.name}</td>
            <td>${supplier.contact || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}
function renderPurchaseOrders() {
  if (purchaseOrders.length === 0) {
    $purchaseOrdersList.innerHTML = '<p class="empty-state">No purchase orders recorded yet.</p>';
    return;
  }
  $purchaseOrdersList.innerHTML = `
    <div class="report-data-grid">
      ${purchaseOrders.map((order) => `
        <div class="report-row">
          <div>
            <strong>${new Date(order.receivedAt).toLocaleString()}</strong>
            <span>${order.supplierName} · ${order.productSku}</span>
          </div>
          <div>
            <span>${order.quantity} units</span>
            <strong>${formatCurrency(order.totalCost)}</strong>
          </div>
        </div>
      `).join('')}
    </div>`;
}
// ============================
// RESTOKKS
// ============================
function renderRestockMonthSelect() {
  const $input = document.getElementById('restockMonthSelect');
  if (!$input) return;
  
  // Set default to current month if empty
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (!$input.value) {
    $input.value = currentMonth;
  }
  
  // Sync disabled state with all-mode
  $input.disabled = restockShowingAll;
  
  // Sync the All History button active class
  const $btn = document.getElementById('btnRestockHistory');
  if ($btn) {
    $btn.classList.toggle('active', restockShowingAll);
  }
  
  // Sync search placeholder
  const $search = document.getElementById('restockSearchInput');
  if ($search) {
    $search.placeholder = restockShowingAll
      ? '🔍 Search all restocks...'
      : '🔍 Search by product, brand, supplier...';
  }
}

function renderRestockSummary(month) {
  const $summary = document.getElementById('restockSummary');
  if (!$summary) return;
  
  if (!month && !restockShowingAll) {
    $summary.innerHTML = '';
    return;
  }
  
  let filtered;
  if (restockShowingAll) {
    // Apply search filter in all-mode too
    const searchTerm = getRestockSearchTerm();
    filtered = restocks;
    if (searchTerm) {
      filtered = filterRestocks(filtered, searchTerm);
    }
  } else {
    filtered = restocks.filter(r => r.restockMonth === month || r.timestamp.startsWith(month));
  }
  
  if (filtered.length === 0) {
    $summary.innerHTML = '<p class="empty-state">No restocks recorded for this period.</p>';
    return;
  }
  
  const totalQuantity = filtered.reduce((sum, r) => sum + r.quantityAdded, 0);
  const totalCost = filtered.reduce((sum, r) => sum + r.totalCost, 0);
  const uniqueProducts = new Set(filtered.map(r => r.carType)).size;
  
  $summary.innerHTML = `
    <div class="restock-summary-card">
      <span>${restockShowingAll ? 'Total Restocks (All Time)' : 'Total Restocks'}</span>
      <strong class="restock-items">${filtered.length}</strong>
    </div>
    <div class="restock-summary-card">
      <span>Units Added</span>
      <strong class="restock-qty">${totalQuantity}</strong>
    </div>
    <div class="restock-summary-card">
      <span>Products Restocked</span>
      <strong>${uniqueProducts}</strong>
    </div>
    <div class="restock-summary-card clear-card">
      ${restockShowingAll
        ? `<button class="button secondary btn-danger" onclick="clearAllRestocks()" title="Clear ALL restock records">🗑 Clear All Restocks</button>`
        : `<button class="button secondary btn-danger" onclick="deleteRestockEntry(null, '${month}')" title="Clear all restocks for this period">🗑 Clear Month</button>`
      }
    </div>
  `;
}

function getRestockSearchTerm() {
  const $search = document.getElementById('restockSearchInput');
  return $search ? $search.value.trim().toLowerCase() : '';
}

function filterRestocks(items, searchTerm) {
  if (!searchTerm) return items;
  return items.filter(r => {
    const searchable = [
      r.brand, r.carType, r.year, r.sidePart,
      r.supplierName, r.notes, r.createdBy,
      r.quantityAdded
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(searchTerm);
  });
}

function renderRestockTable(month) {
  const $container = document.getElementById('restockTableContainer');
  if (!$container) return;
  
  if (!month && !restockShowingAll) {
    $container.innerHTML = '<p class="empty-state">Select a month or click "All History" to view restock records.</p>';
    return;
  }
  
  let filtered;
  if (restockShowingAll) {
    filtered = [...restocks];
  } else {
    // Support both exact month match and prefix match (for flexible date ranges)
    filtered = restocks.filter(r => r.restockMonth === month || r.timestamp.startsWith(month));
  }
  
  // Apply search filter
  const searchTerm = getRestockSearchTerm();
  if (searchTerm) {
    filtered = filterRestocks(filtered, searchTerm);
  }
  
  if (filtered.length === 0) {
    $container.innerHTML = '<p class="empty-state">No restocks recorded for this period.</p>';
    return;
  }
  
  // ---- ALL HISTORY: Accordion view grouped by date ----
  if (restockShowingAll) {
    // Group by date (YYYY-MM-DD)
    const grouped = {};
    filtered.forEach(r => {
      const dateKey = r.timestamp.slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(r);
    });
    
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first
    
    $container.innerHTML = `
      <div class="restock-accordion">
        ${sortedDates.map((dateKey, idx) => {
          const entries = grouped[dateKey];
          const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
          });
          const totalQty = entries.reduce((sum, e) => sum + e.quantityAdded, 0);
          return `
            <div class="restock-accordion-item">
              <div class="restock-accordion-header ${idx === 0 ? 'expanded' : ''}" data-date="${dateKey}">
                <span class="accordion-arrow">${idx === 0 ? '▼' : '▶'}</span>
                <span class="accordion-date">${dateLabel}</span>
                <span class="accordion-badge">${entries.length} restock(s)</span>
                <span class="accordion-qty">+${totalQty} units</span>
              </div>
              <div class="restock-accordion-body" style="${idx === 0 ? 'display:block;' : 'display:none;'}">
                <table class="restock-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Brand</th>
                      <th>Year</th>
                      <th>Side/Part</th>
                      <th>Qty Added</th>
                      <th>Supplier</th>
                      <th>Recorded By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${entries.map(r => `
                      <tr>
                        <td>${r.carType || '-'}</td>
                        <td>${r.brand || '-'}</td>
                        <td>${r.year || '-'}</td>
                        <td>${r.sidePart || '-'}</td>
                        <td>${r.quantityAdded}</td>
                        <td>${r.supplierName || '-'}</td>
                        <td>${r.createdBy || '-'}</td>
                        <td class="restock-actions">
                          <button class="button secondary btn-edit-restock" data-restock-id="${r.id}" title="Edit this restock record">✏️</button>
                          <button class="button secondary btn-delete-restock" data-restock-id="${r.id}" title="Delete this restock record">✕</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <p style="text-align:right;color:#94a3b8;font-size:0.85rem;margin-top:8px;">
        Total: ${filtered.length} restock record(s) across ${sortedDates.length} day(s)
      </p>
    `;
    return;
  }
  
  // ---- MONTH VIEW: Flat table ----
  $container.innerHTML = `
    <table class="restock-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Product</th>
          <th>Brand</th>
          <th>Year</th>
          <th>Side/Part</th>
          <th>Qty Added</th>
          <th>Supplier</th>
          <th>Recorded By</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(r => `
          <tr>
            <td>${new Date(r.timestamp).toLocaleDateString()}</td>
            <td>${r.carType || '-'}</td>
            <td>${r.brand || '-'}</td>
            <td>${r.year || '-'}</td>
            <td>${r.sidePart || '-'}</td>
            <td>${r.quantityAdded}</td>
            <td>${r.supplierName || '-'}</td>
            <td>${r.createdBy || '-'}</td>
            <td class="restock-actions">
              <button class="button secondary btn-edit-restock" data-restock-id="${r.id}" title="Edit this restock record">✏️</button>
              <button class="button secondary btn-delete-restock" data-restock-id="${r.id}" title="Delete this restock record">✕</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="text-align:right;color:#94a3b8;font-size:0.85rem;margin-top:8px;">
      Total: ${filtered.length} restock record(s)
    </p>
  `;
}

function updateRestockView() {
  const $input = document.getElementById('restockMonthSelect');
  if (!$input) return;
  const month = $input.value;
  renderRestockSummary(month);
  renderRestockTable(month);
}

// ---- Delete / Clear restock functions ----

function deleteRestockEntry(restockId, month) {
  if (restockId) {
    // Delete single entry
    if (!confirm('Delete this restock record?')) return;
    const idx = restocks.findIndex(r => r.id === restockId);
    if (idx === -1) return;
    restocks.splice(idx, 1);
    saveRestocks();
    // Sync deletion to server if connected
    if (apiConnected) {
      API.del('/restocks/' + restockId).catch(e => console.warn('Failed to delete restock on server:', e));
    }
    logAudit('inventory', 'Restock entry deleted', `ID: ${restockId}`, getStoredSession()?.username);
  } else if (month) {
    // Clear all restocks for the given month
    if (!confirm('Clear ALL restock records for ' + month + '? This cannot be undone.')) return;
    const count = restocks.filter(r => r.restockMonth === month || r.timestamp.startsWith(month)).length;
    restocks = restocks.filter(r => r.restockMonth !== month && !r.timestamp.startsWith(month));
    saveRestocks();
    // Sync deletion to server if connected
    if (apiConnected) {
      API.del('/restocks?month=' + encodeURIComponent(month)).catch(e => console.warn('Failed to clear restocks on server:', e));
    }
    logAudit('inventory', `Restocks cleared for ${month}`, `${count} records deleted`, getStoredSession()?.username);
  }
  updateRestockView();
  renderRestockMonthSelect();
  renderAll();
}

function clearAllRestocks() {
  if (!confirm('⚠️ Are you sure you want to clear ALL restock records across all months? This cannot be undone.')) return;
  const count = restocks.length;
  restocks = [];
  saveRestocks();
  if (apiConnected) {
    API.del('/restocks?all=true').catch(e => console.warn('Failed to clear all restocks on server:', e));
  }
  logAudit('inventory', 'All restocks cleared', `${count} records deleted`, getStoredSession()?.username);
  updateRestockView();
  renderRestockMonthSelect();
  renderAll();
}

function populateRestockProductSelect() {
  const $select = document.getElementById('restockProduct');
  if (!$select) return;
  $select.innerHTML = '<option value="">-- Select Existing Product --</option>' +
    '<option value="new">➕ Add New Product</option>' +
    inventory.map(p => `<option value="${p.id}" data-brand="${p.brand}" data-car="${p.carType}" data-year="${p.year}" data-side="${p.sidePart}" data-cost="${p.cost}">${p.brand} - ${p.carType} (${p.year || ''} ${p.sidePart || ''})</option>`).join('');
}

function populateRestockSupplierSelect() {
  const $select = document.getElementById('restockSupplier');
  if (!$select) return;
  $select.innerHTML = '<option value="">-- None --</option>' +
    suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

// Toggle new product fields visibility based on product selection
function toggleRestockNewProductFields() {
  const $select = document.getElementById('restockProduct');
  const $newFields = document.getElementById('restockNewProductFields');
  if (!$select || !$newFields) return;
  const showNew = $select.value === 'new';
  $newFields.style.display = showNew ? 'block' : 'none';
  // Toggle required attributes on new product fields
  const $brand = document.getElementById('restockNewBrand');
  const $carType = document.getElementById('restockNewCarType');
  if ($brand) $brand.required = showNew;
  if ($carType) $carType.required = showNew;
}

// Update the inventory update indicator based on selected date
function updateRestockDateIndicator() {
  const $dateInput = document.getElementById('restockDate');
  const $indicator = document.getElementById('restockInventoryIndicator');
  if (!$dateInput || !$indicator) return;
  
  const selectedDate = $dateInput.value;
  if (!selectedDate) {
    $indicator.innerHTML = '';
    $indicator.className = 'restock-indicator';
    return;
  }
  
  const selectedMonth = selectedDate.slice(0, 7);
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (selectedMonth < currentMonth) {
    $indicator.innerHTML = '&#x26a0;&#xfe0f; Past month — will be recorded for history only, inventory <strong>will not</strong> be updated.';
    $indicator.className = 'restock-indicator indicator-past';
  } else if (selectedMonth === currentMonth) {
    $indicator.innerHTML = '&#x2705; Current month — inventory <strong>will be updated</strong> (added to existing stock).';
    $indicator.className = 'restock-indicator indicator-current';
  } else {
    $indicator.innerHTML = '&#x1f7e2; Future month — inventory <strong>will be updated</strong> (added to existing stock).';
    $indicator.className = 'restock-indicator indicator-future';
  }
}

function resetEditingRestock() {
  editingRestockId = null;
  const $title = document.getElementById('restockFormTitle');
  if ($title) $title.textContent = 'Record Restock';
  const $submitBtn = document.getElementById('restockFormSubmit');
  if ($submitBtn) $submitBtn.textContent = 'Save Restock';
}

function showRestockForm(restockEntry) {
  const $panel = document.getElementById('restockFormPanel');
  if (!$panel) return;
  $panel.style.display = 'block';
  populateRestockProductSelect();
  populateRestockSupplierSelect();
  
  const $dateInput = document.getElementById('restockDate');
  const $title = document.getElementById('restockFormTitle');
  const $submitBtn = document.getElementById('restockFormSubmit');
  
  if (restockEntry) {
    // EDIT MODE — pre-fill form with existing data
    editingRestockId = restockEntry.id;
    if ($title) $title.textContent = 'Edit Restock';
    if ($submitBtn) $submitBtn.textContent = 'Update Restock';
    
    // Set date
    if ($dateInput) {
      $dateInput.value = restockEntry.timestamp.slice(0, 10);
      updateRestockDateIndicator();
    }
    
    // Set product — try to match existing product
    const $product = document.getElementById('restockProduct');
    if ($product) {
      const matchingProduct = inventory.find(p => 
        p.carType === restockEntry.carType && p.brand === restockEntry.brand
      );
      if (matchingProduct) {
        $product.value = String(matchingProduct.id);
      } else {
        // Product may have been deleted or changed — select "new" and show fields
        $product.value = 'new';
        toggleRestockNewProductFields();
        if (document.getElementById('restockNewBrand')) document.getElementById('restockNewBrand').value = restockEntry.brand || '';
        if (document.getElementById('restockNewCarType')) document.getElementById('restockNewCarType').value = restockEntry.carType || '';
        if (document.getElementById('restockNewYear')) document.getElementById('restockNewYear').value = restockEntry.year || '';
        if (document.getElementById('restockNewSidePart')) document.getElementById('restockNewSidePart').value = restockEntry.sidePart || '';
      }
    }
    
    // Quantity
    const $qty = document.getElementById('restockQuantity');
    if ($qty) $qty.value = restockEntry.quantityAdded;
    
    // Supplier
    const $supplier = document.getElementById('restockSupplier');
    if ($supplier && restockEntry.supplierId) {
      // Try to match by supplier name as fallback
      const matchingSupplier = suppliers.find(s => s.id === Number(restockEntry.supplierId));
      if (matchingSupplier) {
        $supplier.value = String(matchingSupplier.id);
      } else {
        // Try to match by name
        const byName = suppliers.find(s => s.name === restockEntry.supplierName);
        if (byName) $supplier.value = String(byName.id);
      }
    }
    
    // Notes
    const $notes = document.getElementById('restockNotes');
    if ($notes) $notes.value = restockEntry.notes || '';
    
  } else {
    // ADD MODE — default to today
    resetEditingRestock();
    if ($dateInput) {
      $dateInput.value = new Date().toISOString().slice(0, 10);
      updateRestockDateIndicator();
    }
  }
  
  // Hide new product fields initially (will be shown if 'new' is selected)
  const $newFields = document.getElementById('restockNewProductFields');
  if ($newFields && document.getElementById('restockProduct')?.value !== 'new') {
    $newFields.style.display = 'none';
  }
}

function hideRestockForm() {
  const $panel = document.getElementById('restockFormPanel');
  if (!$panel) return;
  $panel.style.display = 'none';
  resetEditingRestock();
  const $form = document.getElementById('restockForm');
  if ($form) $form.reset();
  // Hide new product fields
  const $newFields = document.getElementById('restockNewProductFields');
  if ($newFields) $newFields.style.display = 'none';
}

function handleRestockFormSubmit(event) {
  event.preventDefault();
  
  const $dateInput = document.getElementById('restockDate');
  const $product = document.getElementById('restockProduct');
  const $quantity = document.getElementById('restockQuantity');
  const $supplier = document.getElementById('restockSupplier');
  const $notes = document.getElementById('restockNotes');
  
  const restockDate = $dateInput.value;
  const quantity = parseInt($quantity.value, 10);
  const unitCost = 0;
  const supplierId = Number($supplier.value) || null;
  const notes = $notes.value.trim();
  const restockTimestamp = restockDate ? new Date(restockDate + 'T12:00:00').toISOString() : new Date().toISOString();
  
  if (!restockDate || !quantity || quantity <= 0) {
    alert('Please enter a valid date and quantity.');
    return;
  }
  
  // ---- EDIT MODE ----
  if (editingRestockId) {
    const idx = restocks.findIndex(r => r.id === editingRestockId);
    if (idx === -1) {
      alert('Restock record not found. It may have been deleted.');
      resetEditingRestock();
      return;
    }
    
    const existing = restocks[idx];
    
    // Determine product details from form
    let brand = existing.brand;
    let carType = existing.carType;
    let year = existing.year;
    let sidePart = existing.sidePart;
    let productId = existing.productId;
    
    if ($product.value === 'new') {
      // User changed product details via "Add New Product" fields
      brand = document.getElementById('restockNewBrand').value.trim() || brand;
      carType = (document.getElementById('restockNewCarType').value.trim().toUpperCase()) || carType;
      year = document.getElementById('restockNewYear').value.trim() || year;
      sidePart = document.getElementById('restockNewSidePart').value.trim() || sidePart;
    } else if ($product.value) {
      // User selected an existing product
      const selectedProduct = inventory.find(p => p.id === Number($product.value));
      if (selectedProduct) {
        brand = selectedProduct.brand;
        carType = selectedProduct.carType;
        year = selectedProduct.year || '';
        sidePart = selectedProduct.sidePart || '';
        productId = selectedProduct.id;
      }
    }
    
    const supplier = supplierId ? suppliers.find(s => s.id === supplierId) : null;
    const supplierName = supplier ? supplier.name : '';
    
    // Update the existing restock entry (NO inventory changes)
    restocks[idx] = {
      ...existing,
      productId: productId || existing.productId,
      brand: brand || existing.brand,
      carType: carType || existing.carType,
      year: year || existing.year,
      sidePart: sidePart || existing.sidePart,
      quantityAdded: quantity,
      unitCost: 0,
      totalCost: 0,
      supplierId: supplierId,
      supplierName: supplierName || existing.supplierName,
      notes: notes,
      timestamp: restockTimestamp,
      restockMonth: restockTimestamp.slice(0, 7)
    };
    
    saveRestocks();
    
    // Sync update to server if connected
    if (apiConnected) {
      API.put('/restocks/' + editingRestockId, {
        productId: restocks[idx].productId,
        brand: restocks[idx].brand,
        carType: restocks[idx].carType,
        year: restocks[idx].year,
        sidePart: restocks[idx].sidePart,
        quantityAdded: restocks[idx].quantityAdded,
        unitCost: 0,
        totalCost: 0,
        supplierName: restocks[idx].supplierName,
        supplierId: restocks[idx].supplierId,
        notes: restocks[idx].notes,
        timestamp: restocks[idx].timestamp
      }).catch(e => console.warn('Failed to update restock on server:', e));
    }
    
    logAudit('inventory', 'Restock entry updated', `ID: ${editingRestockId}, Product: ${restocks[idx].brand} ${restocks[idx].carType}, Qty: ${quantity}`, getStoredSession()?.username);
    
    hideRestockForm();
    updateRestockView();
    renderRestockMonthSelect();
    if (typeof renderInventoryTable === 'function' && $inventorySearch) renderInventoryTable($inventorySearch.value);
    renderAll();
    alert(`Restock updated: ${quantity} units of ${restocks[idx].brand} ${restocks[idx].carType}. (Inventory was not modified.)`);
    return;
  }
  
  // ---- ADD MODE (existing logic) ----
  const selectedMonth = restockDate ? restockDate.slice(0, 7) : '';
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isPastMonth = selectedMonth < currentMonth;
  
  const productSelection = $product.value;
  let product = null;
  let isNewProduct = false;
  
  if (productSelection === 'new') {
    // Adding a new product
    const brand = document.getElementById('restockNewBrand').value.trim();
    const carType = document.getElementById('restockNewCarType').value.trim().toUpperCase();
    const year = document.getElementById('restockNewYear').value.trim();
    const sidePart = document.getElementById('restockNewSidePart').value.trim();
    const lowThreshold = parseInt(document.getElementById('restockNewLowThreshold').value, 10) || 3;
    
    if (!brand || !carType) {
      alert('Brand and Car Type are required for new products.');
      return;
    }
    
    // Always create a new product entry (do not merge with existing by carType)
    isNewProduct = true;
    const id = inventory.length ? Math.max(...inventory.map((item) => item.id)) + 1 : 1;
    product = {
      id, brand, carType, year, sidePart,
      price: 0,
      cost: 0,
      quantity: isPastMonth ? 0 : quantity,
      lowThreshold
    };
    if (!isPastMonth) {
      inventory.push(product);
      saveInventory();
    }
  } else {
    // Selecting existing product
    const productId = Number(productSelection);
    if (!productId) {
      alert('Please select a product.');
      return;
    }
    product = inventory.find(p => p.id === productId);
    if (!product) {
      alert('Product not found.');
      return;
    }
    
    // Only update inventory if current/future month
    if (!isPastMonth) {
      product.quantity += quantity;
      saveInventory();
    }
  }
  
  if (!product) {
    alert('Could not determine product. Please try again.');
    return;
  }
  
  const supplier = supplierId ? suppliers.find(s => s.id === supplierId) : null;
  const supplierName = supplier ? supplier.name : '';
  
  // Record restock with the selected date (always record regardless of month)
  recordRestock(product, quantity, supplierName, notes, restockTimestamp);
  
  hideRestockForm();
  updateRestockView();
  renderRestockMonthSelect();
  
  // Refresh inventory display
  if ($inventorySearch) renderInventoryTable($inventorySearch.value);
  renderAll();
  
  const invNote = isPastMonth ? ' (inventory not updated — past month)' : (isNewProduct ? ' (new product created)' : '');
  alert(`Restock recorded: ${quantity} units of ${product.brand} ${product.carType}.${invNote}`);
}

function renderAuditLog(filter = 'all') {
  const filtered = auditLog.filter((entry) => filter === 'all' || entry.type === filter);
  if (filtered.length === 0) {
    $auditLogContainer.innerHTML = '<p class="empty-state">No audit entries available.</p>';
    return;
  }
  $auditLogContainer.innerHTML = `
    <div class="report-data-grid">
      ${filtered.map((entry) => `
        <div class="report-row">
          <div>
            <strong>${new Date(entry.timestamp).toLocaleString()}</strong>
            <span>${entry.type.toUpperCase()} · ${entry.title}</span>
          </div>
          <div>
            <span class="note">${entry.details}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}
function populateCustomerSelect() {
  if (!$customerSelect) return;
  $customerSelect.innerHTML = '<option value="">Walk-in Customer</option>' +
    customers.map((customer) => `<option value="${customer.id}">${customer.name}</option>`).join('');
}
function populateOrderSupplierOptions() {
  if (!$orderSupplier) return;
  $orderSupplier.innerHTML = '<option value="">Select supplier</option>' +
    suppliers.map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`).join('');
}
function getProductBySku(sku) {
  if (!sku) return null;
  return inventory.find((product) => (product.carType || '').toLowerCase() === sku.toLowerCase());
}
function addBarcodeItem() {
  if (!$barcodeInput) return;
  const searchTerm = $barcodeInput.value.trim();
  if (!searchTerm) {
    alert('Enter a car type or barcode to add the product.');
    return;
  }
  const product = getProductBySku(searchTerm);
  if (!product) {
    alert('No product matches that car type.');
    return;
  }
  addProductToCart(product.id);
  $barcodeInput.value = '';
}
function handleCustomerSave(event) {
  event.preventDefault();
  const name = document.getElementById('customerName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  if (!name) {
    alert('Please provide a customer name.');
    return;
  }
  const id = customers.length ? Math.max(...customers.map((item) => item.id)) + 1 : 1;
  customers.push({ id, name, email, phone });
  saveCustomers();
  logAudit('customer', `Added customer ${name}`, `Email: ${email || 'N/A'} | Phone: ${phone || 'N/A'}`);
  renderAll();
  if ($customerForm) $customerForm.reset();
  alert(`Customer ${name} saved.`);
}

// ---- Salesperson: Add Customer Modal ----
function showAddCustomerModal() {
  if ($addCustomerModal) $addCustomerModal.style.display = 'flex';
}
function hideAddCustomerModal() {
  if ($addCustomerModal) $addCustomerModal.style.display = 'none';
  if ($salesCustomerForm) $salesCustomerForm.reset();
}
function handleSalesAddCustomer(event) {
  event.preventDefault();
  const name = $salesCustomerName ? $salesCustomerName.value.trim() : '';
  const email = $salesCustomerEmail ? $salesCustomerEmail.value.trim() : '';
  const phone = $salesCustomerPhone ? $salesCustomerPhone.value.trim() : '';
  if (!name) {
    alert('Please provide a customer name.');
    return;
  }
  const id = customers.length ? Math.max(...customers.map((item) => item.id)) + 1 : 1;
  customers.push({ id, name, email, phone });
  saveCustomers();
  logAudit('customer', `Added customer ${name}`, `Email: ${email || 'N/A'} | Phone: ${phone || 'N/A'}`);
  renderAll();
  hideAddCustomerModal();
  // Auto-select the newly added customer
  if ($customerSelect) $customerSelect.value = String(id);
}
function handleSupplierSave(event) {
  event.preventDefault();
  const name = document.getElementById('supplierName').value.trim();
  const contact = document.getElementById('supplierContact').value.trim();
  if (!name) {
    alert('Please provide a supplier name.');
    return;
  }
  const id = suppliers.length ? Math.max(...suppliers.map((item) => item.id)) + 1 : 1;
  suppliers.push({ id, name, contact });
  saveSuppliers();
  logAudit('supplier', `Added supplier ${name}`, `Contact: ${contact || 'N/A'}`);
  renderAll();
  if ($supplierForm) $supplierForm.reset();
  alert(`Supplier ${name} saved.`);
}
function handleReceiveStock(event) {
  event.preventDefault();
  const supplierId = $orderSupplier ? Number($orderSupplier.value) : null;
  const supplier = suppliers.find((supplierItem) => supplierItem.id === supplierId);
  const sku = $orderProduct ? $orderProduct.value.trim() : '';
  const quantity = parseInt($orderQuantity.value, 10);
  const cost = parseFloat($orderCost.value);
  if (!supplierId || !supplier) {
    alert('Please select a supplier.');
    return;
  }
  if (!sku || Number.isNaN(quantity) || Number.isNaN(cost) || quantity <= 0 || cost < 0) {
    alert('Please provide valid purchase order details.');
    return;
  }
  const product = getProductBySku(sku);
  if (!product) {
    alert('The product Car Type does not exist in inventory.');
    return;
  }
  product.quantity += quantity;
  product.cost = cost;
  saveInventory();
  const totalCost = quantity * cost;
  const id = purchaseOrders.length ? Math.max(...purchaseOrders.map((item) => item.id)) + 1 : 1;
  purchaseOrders.unshift({ id, supplierId, supplierName: supplier.name, productSku: product.carType, quantity, cost, totalCost, receivedAt: new Date().toISOString() });
  savePurchaseOrders();
  // Record restock
  recordRestock(product, quantity, supplier.name, 'Purchase order received');
  logAudit('purchase', `Received stock from ${supplier.name}`, `Car Type ${product.carType}, quantity ${quantity}, cost ${formatCurrency(cost)}`);
  renderAll();
  if ($purchaseOrderForm) $purchaseOrderForm.reset();
  alert(`Received ${quantity} units of ${product.brand} from ${supplier.name}.`);
}
function getStoredSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}
function saveStoredSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}
function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
function redirectToLoginPage() {
  window.location.href = 'login.html';
}
function redirectToRoleDashboard(role) {
  const targetPage = ROLE_PAGE_MAP[role] || 'salesperson.html';
  window.location.href = targetPage;
}
function enforceRoleAccess() {
  if (currentPage === 'index.html' || currentPage === 'login.html') {
    return;
  }
  const session = getStoredSession();
  if (!session || !session.role) {
    redirectToLoginPage();
    return;
  }
  const expectedPage = ROLE_PAGE_MAP[session.role];
  if (!expectedPage) {
    clearStoredSession();
    redirectToLoginPage();
    return;
  }
  if (currentPage !== expectedPage) {
    redirectToRoleDashboard(session.role);
  }
}
function applyRoleRestrictions() {
  if (!currentRole || !['salesperson', 'manager'].includes(currentRole)) {
    return;
  }
  if (currentRole === 'salesperson') {
    const restrictedTabs = Array.from(document.querySelectorAll('.tab-button[data-tab="inventory"], .tab-button[data-tab="customers"], .tab-button[data-tab="suppliers"], .tab-button[data-tab="audit"]'));
    restrictedTabs.forEach((button) => button.remove());
    const restrictedPanels = Array.from(document.querySelectorAll('#inventory, #customers, #suppliers, #audit'));
    restrictedPanels.forEach((panel) => panel.remove());
    // Hide manager-only report cards (Principal Value, Profit, Loss)
    const managerOnlyCards = Array.from(document.querySelectorAll('.manager-only'));
    managerOnlyCards.forEach((card) => card.remove());
    if (tabButtons.length) {
      switchTab('sales');
    }
  }
}
function renderAll() {
  updateCompanyTitle();
  if ($searchInput) {
    renderProducts($searchInput.value);
  }
  if ($cartItems) {
    renderCart();
  }
  if ($inventorySearch) {
    renderInventoryTable($inventorySearch.value);
  }
  if ($customerSearch) {
    renderCustomerTable($customerSearch.value);
  }
  if ($supplierSearch) {
    renderSupplierTable($supplierSearch.value);
  }
  if ($purchaseOrdersList) {
    renderPurchaseOrders();
  }
  // Restocks
  if (document.getElementById('restockMonthSelect')) {
    renderRestockMonthSelect();
    updateRestockView();
  }
  if ($auditFilter) {
    renderAuditLog($auditFilter.value);
  }
  if ($salesHistoryTable) {
    renderSalesHistory();
  }
  if ($lowStockList) {
    renderLowStockList();
  }
  if ($reportLowStockCount) {
    renderReportCards();
  }
  if ($reportPeriodSummary) {
    renderReportPeriodSummary(selectedReportPeriod);
  }
  if (reportPeriodButtons.length) {
    updateReportPeriodButtons();
  }
  if ($inventoryAlerts) {
    renderInventoryAlerts();
  }
  if ($customerSelect) {
    populateCustomerSelect();
  }
  if ($orderSupplier) {
    populateOrderSupplierOptions();
  }
  // User management table
  if (document.getElementById('userTableContainer')) {
    renderUserTable();
  }
  // Uploaded files list (if panel is visible)
  if ($uploadedFilesList && document.getElementById('filesSubPanel')?.classList.contains('active')) {
    renderUploadedFiles();
  }
}
function escapeExcelHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function buildExcelTable(title, headers, rows) {
  const headerHtml = headers.map((header) => `<th>${escapeExcelHtml(header)}</th>`).join('');
  const rowHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeExcelHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `
    <table border="1">
      <tr><th colspan="${headers.length}" style="background:#f2f2f2;">${escapeExcelHtml(title)}</th></tr>
      <tr>${headerHtml}</tr>
      ${rowHtml}
    </table>
  `;
}
function getBackupReportRows() {
  const periods = ['daily', 'weekly', 'monthly', 'yearly'];
  return periods.map((period) => {
    const metrics = getPeriodMetrics(period);
    const periodCost = metrics.sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = inventory.find((prod) => prod.id === item.id);
        const cost = product ? product.cost : item.price * 0.65;
        return itemSum + cost * item.quantity;
      }, 0);
    }, 0);
    const periodProfit = metrics.total - periodCost;
    return [
      period.charAt(0).toUpperCase() + period.slice(1),
      formatCurrency(metrics.total),
      formatCurrency(periodCost),
      formatCurrency(periodProfit),
      metrics.transactions,
      metrics.itemsSold,
      metrics.transactions ? formatCurrency(metrics.total / metrics.transactions) : formatCurrency(0)
    ];
  });
}
function generateExcelBackupHtml() {
  const inventoryRows = inventory.map((product) => [
    product.id,
    product.brand || '',
    product.carType || '',
    product.year || '',
    product.sidePart || '',
    formatCurrency(product.price),
    product.quantity,
    product.lowThreshold,
    getStatusLabel(getStockStatus(product))
  ]);
  const salesRows = salesHistory.map((sale) => {
    const totalCost = sale.items.reduce((sum, item) => {
      const product = inventory.find((prod) => prod.id === item.id);
      const cost = product ? product.cost : item.price * 0.65;
      return sum + cost * item.quantity;
    }, 0);
    return [
      sale.transactionId,
      new Date(sale.timestamp).toLocaleString(),
      sale.items.length,
      sale.items.map((item) => `${item.quantity}× ${item.name}`).join(' | '),
      formatCurrency(totalCost),
      formatCurrency(sale.subtotal),
      formatCurrency(sale.tax),
      formatCurrency(sale.total),
      formatCurrency(sale.total - totalCost)
    ];
  });
  const reportRows = getBackupReportRows();
  const restockRows = restocks.map((r) => [
    new Date(r.timestamp).toLocaleDateString(),
    r.brand || '',
    r.carType || '',
    r.year || '',
    r.sidePart || '',
    r.quantityAdded,
    formatCurrency(r.unitCost),
    formatCurrency(r.totalCost),
    r.supplierName || '',
    r.restockMonth || ''
  ]);
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        ${buildExcelTable('Inventory', ['ID', 'Brand', 'Car Type', 'Year', 'Side/Part', 'Price', 'Quantity', 'Low Threshold', 'Status'], inventoryRows)}
        ${buildExcelTable('Sales History', ['Transaction ID', 'Timestamp', 'Items Count', 'Items Detail', 'Cost', 'Subtotal', 'Tax', 'Total', 'Profit'], salesRows)}
        ${buildExcelTable('Restock Records', ['Date', 'Brand', 'Car Type', 'Year', 'Side/Part', 'Qty Added', 'Unit Cost', 'Total Cost', 'Supplier', 'Month'], restockRows)}
        ${buildExcelTable('Report Summary', ['Period', 'Total Sales', 'Cost', 'Profit', 'Transactions', 'Items Sold', 'Average Sale'], reportRows)}
      </body>
    </html>`;
  return html;
}
function downloadExcelBackup() {
  const filename = `pos-backup-${new Date().toISOString().slice(0, 10)}.xls`;
  const html = generateExcelBackupHtml();
  const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
// ============================
// IMPORT / FILE UPLOAD SYSTEM
// ============================

// --- State ---
let importFileData = null;     // raw parsed data (array of arrays)
let importHeaders = [];         // column headers from first row
let importRows = [];            // data rows (array of arrays)
let importType = 'inventory';   // 'inventory' | 'sales'
let importMapping = {};         // { fieldKey: columnIndex }
let importSheetNames = [];      // sheet names for multi-sheet workbooks
let importSelectedSheet = '';
let importRawFileBase64 = '';   // base64 of the uploaded file
let importRawFileName = '';
let importRawFileSize = 0;
let importRawFileType = '';

const STORAGE_KEY_UPLOADS = 'pos_uploaded_files';

// --- Field definitions for mapping ---
const IMPORT_FIELDS = {
  inventory: [
    { key: 'brand', label: 'Brand', required: true },
    { key: 'carType', label: 'Car Type', required: true },
    { key: 'year', label: 'Year', required: false },
    { key: 'sidePart', label: 'Side/Part', required: false },
    { key: 'price', label: 'Price', required: true },
    { key: 'cost', label: 'Cost', required: false },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'lowThreshold', label: 'Low Stock Threshold', required: false }
  ],
  sales: [
    { key: 'transactionId', label: 'Transaction ID', required: false },
    { key: 'itemName', label: 'Item Name', required: true },
    { key: 'itemSku', label: 'Item S/N (SKU)', required: false },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'price', label: 'Unit Price', required: true },
    { key: 'subtotal', label: 'Subtotal', required: false },
    { key: 'tax', label: 'Tax', required: false },
    { key: 'total', label: 'Total', required: true },
    { key: 'paymentMethod', label: 'Payment Method', required: false },
    { key: 'customerName', label: 'Customer Name', required: false },
    { key: 'timestamp', label: 'Date/Time', required: false }
  ]
};

// --- Auto-detection aliases ---
const COLUMN_ALIASES = {
  brand: ['brand', 'make', 'manufacturer', 'product name', 'product', 'item name', 'item', 'name', 'part', 'part name', 'description'],
  carType: ['car type', 'cartype', 'car', 'model', 'sku', 'code', 'sn', 'serial', 'part number', 'product code', 'item code', 'part no', 'skucode'],
  year: ['year', 'model year', 'yom', 'category', 'type', 'group', 'department', 'section', 'class'],
  sidePart: ['side', 'part', 'side/part', 'side part', 'position', 'location', 'sidepart', 'side_part'],
  price: ['price', 'unit price', 'selling price', 'retail price', 'amount', 'unit price (ghs)', 'price (ghs)'],
  cost: ['cost', 'unit cost', 'purchase price', 'buying price', 'wholesale price', 'cost price', 'cost (ghs)'],
  quantity: ['quantity', 'qty', 'stock', 'inventory', 'on hand', 'qoh', 'stock level', 'quanity'],
  lowThreshold: ['threshold', 'low stock', 'min stock', 'reorder level', 'alert', 'min qty', 'low threshold'],
  transactionId: ['transaction', 'id', 'txn', 'receipt', 'invoice', 'order', 'transaction id', 'receipt no', 'invoice no', 'order id'],
  itemName: ['name', 'product', 'item', 'description', 'item name', 'product name'],
  itemSku: ['sku', 'code', 'sn', 'item code', 'product code', 'part no'],
  subtotal: ['subtotal', 'sub total', 'sub-total'],
  tax: ['tax', 'vat', 'gst', 'sales tax'],
  total: ['total', 'grand total', 'amount', 'total amount', 'total (ghs)'],
  paymentMethod: ['payment', 'method', 'payment method', 'mode', 'payment mode', 'payment type'],
  customerName: ['customer', 'name', 'customer name', 'client', 'client name', 'buyer'],
  timestamp: ['date', 'time', 'datetime', 'timestamp', 'transaction date', 'sale date', 'created at', 'date/time']
};

// --- Helpers ---
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getFileIcon(filename) {
  const ext = getFileExtension(filename);
  const icons = {
    xlsx: '📊', xls: '📊', csv: '📋', json: '📋',
    pdf: '📄', doc: '📝', docx: '📝', txt: '📄',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', webp: '🖼', svg: '🖼',
    mp4: '🎬', mp3: '🎵', zip: '📦', rar: '📦', '7z': '📦',
    html: '🌐', htm: '🌐', xml: '📋'
  };
  return icons[ext] || '📎';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// --- Main file handler ---
async function handleImportFile(file) {
  // Reset state
  importFileData = null;
  importHeaders = [];
  importRows = [];
  importMapping = {};
  importSheetNames = [];
  importSelectedSheet = '';
  importRawFileBase64 = '';
  importRawFileName = file.name;
  importRawFileSize = file.size;
  importRawFileType = file.type;

  // Read the raw file as base64 for storage
  try {
    importRawFileBase64 = await readFileAsBase64(file);
  } catch (e) {
    console.warn('Could not read file as base64:', e);
  }

  const ext = getFileExtension(file.name);
  const parsableExts = ['xlsx', 'xls', 'csv', 'json'];

  // Show file info
  if ($importFileInfo) {
    $importFileInfo.style.display = 'flex';
    if ($importFileName) $importFileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
  }
  if ($importUploadArea) $importUploadArea.style.display = 'none';

  if (parsableExts.includes(ext)) {
    // Parse the file
    try {
      const arrayBuffer = await file.arrayBuffer();
      let parsed = false;

      if (ext === 'xlsx' || ext === 'xls') {
        parsed = parseExcelFile(arrayBuffer, file.name);
      } else if (ext === 'csv') {
        const text = new TextDecoder().decode(arrayBuffer);
        parsed = parseCSVFile(text);
      } else if (ext === 'json') {
        const text = new TextDecoder().decode(arrayBuffer);
        parsed = parseJSONFile(text);
      }

      if (parsed && importHeaders.length > 0 && importRows.length > 0) {
        // Auto-detect column mapping
        const fields = IMPORT_FIELDS[importType];
        importMapping = autoDetectImportColumns(importHeaders, fields);

        renderImportMapping();
        renderImportPreview();

        if ($importMapping) $importMapping.style.display = 'block';
        if ($importPreview) $importPreview.style.display = 'block';
        if ($importActions) $importActions.style.display = 'flex';
        if ($importStatus) {
          $importStatus.className = 'import-status info';
          $importStatus.textContent = '✅ Parsed ' + importRows.length + ' rows. Review mapping and click "Import Data" or "Just Store File".';
        }
      } else {
        // Parsed but no data
        showImportStatus('info', 'File parsed but no data rows found. You can still store the file.');
        if ($importActions) $importActions.style.display = 'flex';
        if ($btnImportData) $btnImportData.style.display = 'none';
      }
    } catch (e) {
      console.error('Parse error:', e);
      showImportStatus('error', 'Could not parse file: ' + e.message + ' You can still store the file as-is.');
      if ($importActions) $importActions.style.display = 'flex';
      if ($btnImportData) $btnImportData.style.display = 'none';
    }
  } else {
    // Non-parsable file — just show store option
    showImportStatus('info', 'File type "' + ext + '" is not automatically parsable. You can store it as a reference file.');
    if ($importActions) $importActions.style.display = 'flex';
    if ($btnImportData) $btnImportData.style.display = 'none';
  }

  // Hide sheet selector unless there are multiple sheets
  if ($importSheetSelector) $importSheetSelector.style.display = 'none';
  if (importSheetNames.length > 1 && $importSheetSelector && $importSheetSelect) {
    $importSheetSelector.style.display = 'flex';
    $importSheetSelect.innerHTML = importSheetNames.map((s, i) =>
      '<option value="' + i + '">' + s + '</option>'
    ).join('');
    $importSheetSelect.value = '0';
  }
}

// --- Parse Excel with SheetJS ---
function parseExcelFile(arrayBuffer, fileName) {
  if (typeof XLSX === 'undefined') {
    showImportStatus('error', 'Excel parser library not loaded. Please check your internet connection and refresh.');
    return false;
  }
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    importSheetNames = workbook.SheetNames;
    const firstSheet = importSheetNames[0];
    importSelectedSheet = firstSheet;
    const sheet = workbook.Sheets[firstSheet];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (jsonData.length < 2) {
      showImportStatus('info', 'The sheet is empty or has only headers. No data rows found.');
      return false;
    }

    importHeaders = jsonData[0].map(h => String(h).trim());
    importRows = jsonData.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));
    importFileData = jsonData;

    return true;
  } catch (e) {
    console.error('Excel parse error:', e);
    showImportStatus('error', 'Failed to parse Excel file: ' + e.message);
    return false;
  }
}

// --- Parse CSV ---
function parseCSVFile(text) {
  try {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showImportStatus('info', 'CSV file has no data rows.');
      return false;
    }

    // Detect delimiter (comma, semicolon, tab)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            current += ch;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
          } else if (ch === delimiter) {
            result.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
      }
      result.push(current.trim());
      return result;
    }

    importHeaders = parseCSVLine(lines[0]).map(h => h.trim());
    importRows = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.some(cell => cell !== '')) {
        importRows.push(row);
      }
    }

    return importRows.length > 0;
  } catch (e) {
    console.error('CSV parse error:', e);
    showImportStatus('error', 'Failed to parse CSV: ' + e.message);
    return false;
  }
}

// --- Parse JSON ---
function parseJSONFile(text) {
  try {
    const data = JSON.parse(text);
    let rows = Array.isArray(data) ? data : (data.rows || data.data || data.items || data.records || []);
    if (!Array.isArray(rows) || rows.length === 0) {
      showImportStatus('info', 'JSON file has no array data.');
      return false;
    }

    // Convert array of objects to array of arrays
    importHeaders = Object.keys(rows[0]);
    importRows = rows.map(row => importHeaders.map(h => {
      const val = row[h];
      return val !== null && val !== undefined ? String(val) : '';
    }));

    return importRows.length > 0;
  } catch (e) {
    console.error('JSON parse error:', e);
    showImportStatus('error', 'Failed to parse JSON: ' + e.message);
    return false;
  }
}

// --- Auto-detect column mapping ---
function autoDetectImportColumns(headers, fields) {
  const mapping = {};
  const usedColumns = new Set();

  for (const field of fields) {
    const aliases = COLUMN_ALIASES[field.key];
    let matchedIndex = -1;
    let matchedScore = 0;

    headers.forEach((header, idx) => {
      if (usedColumns.has(idx)) return;
      const lower = header.toLowerCase().trim();
      if (aliases) {
        for (const alias of aliases) {
          if (lower === alias) {
            // Exact match — highest score
            if (3 > matchedScore) {
              matchedScore = 3;
              matchedIndex = idx;
            }
          } else if (lower.includes(alias) || alias.includes(lower)) {
            // Partial match
            if (1 > matchedScore) {
              matchedScore = 1;
              matchedIndex = idx;
            }
          }
        }
      }
    });

    if (matchedIndex >= 0) {
      mapping[field.key] = matchedIndex;
      usedColumns.add(matchedIndex);
    }
  }

  return mapping;
}

// --- Render column mapping UI ---
function renderImportMapping() {
  if (!$importMappingFields) return;
  const fields = IMPORT_FIELDS[importType];
  const options = ['<option value="-1">— Skip —</option>'] +
    importHeaders.map((h, i) => '<option value="' + i + '">' + h + '</option>').join('');

  const html = fields.map(field => {
    const mappedIdx = importMapping[field.key] !== undefined ? importMapping[field.key] : -1;
    const required = field.required;
    const star = required ? '<span class="required-star">*</span>' : '';
    const cls = required && mappedIdx === -1 ? 'unmapped-required' : (mappedIdx >= 0 ? 'mapped' : '');
    return '<div class="import-mapping-row" data-field="' + field.key + '">' +
      '<label>' + field.label + star + '</label>' +
      '<select class="' + cls + '">' +
        options +
      '</select>' +
    '</div>';
  }).join('');

  $importMappingFields.innerHTML = html;

  // Set selected values
  $importMappingFields.querySelectorAll('.import-mapping-row').forEach(row => {
    const fieldKey = row.dataset.field;
    const select = row.querySelector('select');
    const mappedIdx = importMapping[fieldKey] !== undefined ? importMapping[fieldKey] : -1;
    select.value = String(mappedIdx);
  });
}

// Handle mapping changes (event delegation, set up once in setupEventListeners)
function handleMappingChange(e) {
  const select = e.target.closest('select');
  if (!select || !$importMappingFields || !$importMappingFields.contains(select)) return;
  const row = select.closest('.import-mapping-row');
  if (!row) return;
  const fieldKey = row.dataset.field;
  const colIdx = parseInt(select.value, 10);
  if (colIdx >= 0) {
    importMapping[fieldKey] = colIdx;
    select.className = 'mapped';
  } else {
    delete importMapping[fieldKey];
    const field = IMPORT_FIELDS[importType].find(f => f.key === fieldKey);
    if (field && field.required) {
      select.className = 'unmapped-required';
    } else {
      select.className = '';
    }
  }
  // Update preview
  renderImportPreview();
}

// --- Render data preview ---
function renderImportPreview() {
  if (!$importPreviewTable || !$importPreviewInfo) return;

  if (importRows.length === 0) {
    $importPreviewTable.innerHTML = '<p class="empty-state">No data rows to preview.</p>';
    $importPreviewInfo.textContent = 'No data available';
    return;
  }

  // Build field -> header name mapping for preview
  const fields = IMPORT_FIELDS[importType];
  const mappedHeaders = fields
    .filter(f => importMapping[f.key] !== undefined)
    .map(f => ({
      label: f.label,
      colIdx: importMapping[f.key],
      key: f.key
    }));

  const previewRows = importRows.slice(0, 10);
  const totalRows = importRows.length;

  $importPreviewInfo.textContent = 'Showing ' + previewRows.length + ' of ' + totalRows + ' rows';

  if (mappedHeaders.length === 0) {
    // Show raw data
    const cols = importHeaders.length;
    const html = '<table><thead><tr>' +
      importHeaders.map(h => '<th>' + h + '</th>').join('') +
      '</tr></thead><tbody>' +
      previewRows.map(row => '<tr>' +
        Array.from({ length: cols }, (_, i) => '<td>' + (row[i] !== undefined ? row[i] : '') + '</td>').join('') +
      '</tr>').join('') +
      '</tbody></table>';
    $importPreviewTable.innerHTML = html;
    return;
  }

  // Show mapped data
  const html = '<table><thead><tr>' +
    mappedHeaders.map(h => '<th>' + h.label + '</th>').join('') +
    '</tr></thead><tbody>' +
    previewRows.map(row => '<tr>' +
      mappedHeaders.map(h => {
        const val = row[h.colIdx] !== undefined ? row[h.colIdx] : '';
        return '<td title="' + String(val).replace(/"/g, '&quot;') + '">' + String(val).slice(0, 80) + '</td>';
      }).join('') +
    '</tr>').join('') +
    '</tbody></table>';

  $importPreviewTable.innerHTML = html;
}

// --- Import data into system ---
function importDataToSystem() {
  // Validate mapping
  const fields = IMPORT_FIELDS[importType];
  const missingRequired = fields.filter(f => f.required && importMapping[f.key] === undefined);

  if (missingRequired.length > 0) {
    showImportStatus('error', 'Please map all required fields: ' + missingRequired.map(f => f.label).join(', '));
    return;
  }

  if (importRows.length === 0) {
    showImportStatus('error', 'No data rows to import.');
    return;
  }

  let imported = 0;
  let skipped = 0;
  const errors = [];

  if (importType === 'inventory') {
    // Import inventory items
    importRows.forEach((row, rowIdx) => {
      try {
        const brand = String(row[importMapping.brand] || '').trim();
        const carType = String(row[importMapping.carType] || '').trim().toUpperCase();
        const year = String(row[importMapping.year] || '').trim();
        const sidePart = String(row[importMapping.sidePart] || '').trim();
        const price = parseFloat(String(row[importMapping.price] || '0').replace(/[^0-9.-]/g, '')) || 0;
        const cost = importMapping.cost !== undefined
          ? parseFloat(String(row[importMapping.cost] || '0').replace(/[^0-9.-]/g, '')) || 0
          : 0;
        const quantity = parseInt(String(row[importMapping.quantity] || '0').replace(/[^0-9]/g, ''), 10) || 0;
        const lowThreshold = importMapping.lowThreshold !== undefined
          ? parseInt(String(row[importMapping.lowThreshold] || '5').replace(/[^0-9]/g, ''), 10) || 5
          : 5;

        if (!brand || !carType) {
          skipped++;
          return;
        }

        // Check if Car Type already exists
        const existing = inventory.find(p => (p.carType || '').toUpperCase() === carType);
        if (existing) {
          // Update existing
          existing.quantity += quantity;
          existing.price = price;
          existing.cost = cost || existing.cost;
          existing.brand = brand || existing.brand;
          existing.year = year || existing.year;
          existing.sidePart = sidePart || existing.sidePart;
          existing.lowThreshold = lowThreshold;
        } else {
          // Add new
          const id = inventory.length ? Math.max(...inventory.map(item => item.id)) + 1 : 1;
          inventory.push({ id, brand, carType, year, sidePart, price, cost, quantity, lowThreshold });
        }
        imported++;
      } catch (e) {
        errors.push('Row ' + (rowIdx + 1) + ': ' + e.message);
        skipped++;
      }
    });

    saveInventory();
    logAudit('inventory', 'Imported inventory from file', imported + ' items imported, ' + skipped + ' skipped');

  } else if (importType === 'sales') {
    // Import sales records
    importRows.forEach((row, rowIdx) => {
      try {
        const itemName = String(row[importMapping.itemName] || '').trim();
        const quantity = parseInt(String(row[importMapping.quantity] || '1').replace(/[^0-9]/g, ''), 10) || 1;
        const price = parseFloat(String(row[importMapping.price] || '0').replace(/[^0-9.-]/g, '')) || 0;
        const transactionId = importMapping.transactionId !== undefined
          ? String(row[importMapping.transactionId] || '').trim()
          : '';
        const subtotal = importMapping.subtotal !== undefined
          ? parseFloat(String(row[importMapping.subtotal] || '0').replace(/[^0-9.-]/g, '')) || 0
          : price * quantity;
        const tax = importMapping.tax !== undefined
          ? parseFloat(String(row[importMapping.tax] || '0').replace(/[^0-9.-]/g, '')) || 0
          : subtotal * TAX_RATE;
        const total = importMapping.total !== undefined
          ? parseFloat(String(row[importMapping.total] || '0').replace(/[^0-9.-]/g, '')) || 0
          : subtotal + tax;
        const paymentMethod = importMapping.paymentMethod !== undefined
          ? String(row[importMapping.paymentMethod] || '').trim().toLowerCase() || 'cash'
          : 'cash';
        const customerName = importMapping.customerName !== undefined
          ? String(row[importMapping.customerName] || '').trim() || 'Walk-in Customer'
          : 'Walk-in Customer';
        const timestamp = importMapping.timestamp !== undefined
          ? String(row[importMapping.timestamp] || '').trim()
          : new Date().toISOString();

        if (!itemName) {
          skipped++;
          return;
        }

        // Try to find the item in inventory by SKU or name
        let itemSku = importMapping.itemSku !== undefined
          ? String(row[importMapping.itemSku] || '').trim().toUpperCase()
          : '';
        let product = null;
        if (itemSku) product = inventory.find(p => p.sku === itemSku);
        if (!product) product = inventory.find(p => p.name.toLowerCase() === itemName.toLowerCase());

        const saleItems = [{
          id: product ? product.id : 0,
          name: itemName,
          sku: itemSku || '',
          quantity: quantity,
          price: price
        }];

        const tid = transactionId || DB.generateOfflineTransactionId();

        // Create sale via DB layer
        const saleRecord = DB.createSale({
          transactionId: tid,
          items: saleItems,
          subtotal,
          tax,
          total,
          paymentMethod,
          customerName,
          createdBy: getStoredSession()?.username || 'imported'
        });

        salesHistory.unshift(saleRecord);
        imported++;
      } catch (e) {
        errors.push('Row ' + (rowIdx + 1) + ': ' + e.message);
        skipped++;
      }
    });

    saveSalesHistory();
    logAudit('sale', 'Imported sales from file', imported + ' sales imported, ' + skipped + ' skipped');
  }

  renderAll();

  // Store the imported file automatically
  storeCurrentFile(importType === 'inventory' ? 'inventory_import' : 'sales_import', imported);

  // Show result
  const msg = '✅ Import complete: ' + imported + ' ' + importType + ' record(s) imported' +
    (skipped > 0 ? ', ' + skipped + ' skipped' : '') +
    (errors.length > 0 ? '. Errors: ' + errors.join('; ') : '');

  if (errors.length > 0) {
    showImportStatus('error', msg);
  } else {
    showImportStatus('success', msg);
  }

  // Disable import button to prevent double-import
  if ($btnImportData) {
    $btnImportData.disabled = true;
    $btnImportData.textContent = '✅ Imported';
  }
}

// --- Store file in localStorage ---
function storeCurrentFile(category, importedCount) {
  if (!importRawFileBase64) return;

  const files = loadUploadedFiles();
  const record = {
    id: Date.now(),
    name: importRawFileName,
    size: importRawFileSize,
    type: importRawFileType,
    data: importRawFileBase64,
    uploadedAt: new Date().toISOString(),
    category: category || 'upload',
    importedCount: importedCount || 0
  };

  files.unshift(record);
  saveUploadedFiles(files);
  renderUploadedFiles();
}

function storeFileOnly() {
  storeCurrentFile('upload', 0);
  showImportStatus('success', '✅ File stored successfully: ' + importRawFileName);
  if ($importFileInfo) $importFileInfo.style.display = 'none';
  if ($importUploadArea) $importUploadArea.style.display = 'flex';
  resetImportState();
}

function resetImportState() {
  importFileData = null;
  importHeaders = [];
  importRows = [];
  importMapping = {};
  importSheetNames = [];
  importSelectedSheet = '';
  importRawFileBase64 = '';
  importRawFileName = '';
  importRawFileSize = 0;
  importRawFileType = '';
  if ($importMapping) $importMapping.style.display = 'none';
  if ($importPreview) $importPreview.style.display = 'none';
  if ($importActions) $importActions.style.display = 'none';
  if ($importSheetSelector) $importSheetSelector.style.display = 'none';
  if ($btnImportData) {
    $btnImportData.disabled = false;
    $btnImportData.textContent = '⬇ Import Data';
  }
  if ($btnImportData) $btnImportData.style.display = 'inline-flex';
}

function showImportStatus(type, message) {
  if (!$importStatus) return;
  $importStatus.className = 'import-status ' + type;
  $importStatus.textContent = message;
}

// --- Uploaded files management ---
function loadUploadedFiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UPLOADS);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveUploadedFiles(files) {
  // Limit stored files to prevent localStorage overflow
  const MAX_FILES = 50;
  const trimmed = files.slice(0, MAX_FILES);
  // Limit total base64 data size to ~4MB
  try {
    localStorage.setItem(STORAGE_KEY_UPLOADS, JSON.stringify(trimmed));
  } catch (e) {
    // If quota exceeded, remove oldest files
    console.warn('Upload storage quota exceeded, removing oldest files');
    while (trimmed.length > 0) {
      trimmed.pop();
      try {
        localStorage.setItem(STORAGE_KEY_UPLOADS, JSON.stringify(trimmed));
        break;
      } catch (_) { /* continue removing */ }
    }
  }
}

function renderUploadedFiles() {
  if (!$uploadedFilesList) return;
  const files = loadUploadedFiles();

  if (files.length === 0) {
    $uploadedFilesList.innerHTML = '<p class="empty-state">No files uploaded yet. Go to the <strong>Import Data</strong> tab to upload files.</p>';
    if ($importHistory) $importHistory.style.display = 'none';
    return;
  }

  if ($importHistory) {
    $importHistory.style.display = 'block';
    // Update import history too
    renderImportHistory(files);
  }

  $uploadedFilesList.innerHTML = files.map(file => {
    const icon = getFileIcon(file.name);
    const ext = getFileExtension(file.name).toUpperCase();
    const date = new Date(file.uploadedAt).toLocaleString();
    const size = formatFileSize(file.size);
    const catLabel = file.category === 'inventory_import' ? '📦 Inventory Import' :
                     file.category === 'sales_import' ? '💵 Sales Import' : '📁 Upload';

    return '<div class="uploaded-file-item" data-file-id="' + file.id + '">' +
      '<span class="uploaded-file-icon">' + icon + '</span>' +
      '<div class="uploaded-file-details">' +
        '<div class="uploaded-file-name" title="' + file.name + '">' + file.name + '</div>' +
        '<div class="uploaded-file-meta">' +
          '<span>' + size + '</span>' +
          '<span>' + ext + '</span>' +
          '<span>' + date + '</span>' +
          '<span>' + catLabel + '</span>' +
          (file.importedCount > 0 ? '<span>✅ ' + file.importedCount + ' records</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="uploaded-file-actions">' +
        '<button class="button secondary btn-download-upload" data-file-id="' + file.id + '">⬇ Download</button>' +
        '<button class="button secondary btn-delete-upload" data-file-id="' + file.id + '">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderImportHistory(files) {
  if (!$importHistoryList) return;
  const imports = files.filter(f => f.category === 'inventory_import' || f.category === 'sales_import');
  if (imports.length === 0) {
    $importHistoryList.innerHTML = '<p class="empty-state">No import operations yet.</p>';
    return;
  }
  $importHistoryList.innerHTML = '<div class="import-history-list">' +
    imports.map(f => {
      const date = new Date(f.uploadedAt).toLocaleString();
      const label = f.category === 'inventory_import' ? '📦 Inventory Import' : '💵 Sales Import';
      const badge = f.importedCount > 0 ? 'success' : 'error';
      const badgeText = f.importedCount > 0 ? f.importedCount + ' records' : 'Failed';
      return '<div class="import-history-item">' +
        '<div class="history-left">' +
          '<span class="history-title">' + label + ' — ' + f.name + '</span>' +
          '<span class="history-meta">' + date + '</span>' +
        '</div>' +
        '<span class="history-badge ' + badge + '">' + badgeText + '</span>' +
      '</div>';
    }).join('') +
  '</div>';
}

function downloadUploadedFile(fileId) {
  const files = loadUploadedFiles();
  const file = files.find(f => f.id === fileId);
  if (!file || !file.data) {
    alert('File data not found.');
    return;
  }
  try {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    alert('Could not download file: ' + e.message);
  }
}

function deleteUploadedFile(fileId) {
  if (!confirm('Delete this uploaded file?')) return;
  let files = loadUploadedFiles();
  files = files.filter(f => f.id !== fileId);
  saveUploadedFiles(files);
  renderUploadedFiles();
}

function clearAllUploads() {
  if (!confirm('Permanently delete ALL uploaded files? This cannot be undone.')) return;
  saveUploadedFiles([]);
  renderUploadedFiles();
  showImportStatus('info', 'All uploaded files cleared.');
}

function getProductById(productId) {
  return inventory.find((item) => item.id === productId);
}
function addProductToCart(productId, variant = '') {
  const product = getProductById(productId);
  if (!product) return;
  if (product.quantity <= 0) {
    alert(`${product.brand || product.name} is sold out.`);
    return;
  }
  const key = `${productId}|${variant}`;
  const existing = cart.get(key);
  const currentQuantity = existing ? existing.quantity : 0;
  if (currentQuantity >= product.quantity) {
    alert('There is no more stock available for this item.');
    return;
  }
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.set(key, {
      key,
      id: product.id,
      name: product.brand || product.name,
      price: product.price,
      variant: variant || '',
      quantity: 1
    });
  }
  renderCart();
}
function changeQuantity(cartKey, delta) {
  const item = cart.get(cartKey);
  if (!item) return;
  const product = getProductById(item.id);
  if (!product) return;
  const newQuantity = item.quantity + delta;
  if (newQuantity <= 0) {
    cart.delete(cartKey);
  } else if (newQuantity > product.quantity) {
    alert('Quantity cannot exceed current stock level.');
    return;
  } else {
    item.quantity = newQuantity;
  }
  renderCart();
}
function removeFromCart(cartKey) {
  cart.delete(cartKey);
  renderCart();
}
function clearCart() {
  cart.clear();
  renderCart();
}
function generateReceipt() {
  if (cart.size === 0) {
    return 'No items in cart. Add products before checking out.';
  }
  const now = new Date();
  const selectedCustomerId = $customerSelect ? Number($customerSelect.value) : null;
  const customer = selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) : null;
  const customerName = customer ? customer.name : 'Walk-in Customer';
  const customerEmail = customer ? customer.email || 'N/A' : 'N/A';
  const customerPhone = customer ? customer.phone || 'N/A' : 'N/A';
  const lines = [];
  lines.push('*** POS RECEIPT ***');
  lines.push(`Date: ${now.toLocaleString()}`);
  lines.push(`Customer: ${customerName}`);
  lines.push(`Email: ${customerEmail}`);
  lines.push(`Contact: ${customerPhone}`);
  lines.push('------------------------------');
  cart.forEach((item) => {
    const variantLabel = item.variant ? ` (${item.variant})` : '';
    lines.push(`${item.name}${variantLabel} x${item.quantity} · ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}`);
  });
  lines.push('------------------------------');
  const subtotal = Array.from(cart.values()).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
  lines.push(`Tax (8%): ${formatCurrency(tax)}`);
  lines.push(`Total: ${formatCurrency(total)}`);
  lines.push('------------------------------');
  lines.push('Thank you for shopping with us!');
  return lines.join('\n');
}
function openReceiptPrintWindow(receiptText) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Unable to open the receipt print window. Please allow popups and try again.');
    return;
  }
  const safeText = receiptText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { margin: 0; padding: 20px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background: #fff; color: #111; }
          h1 { margin-top: 0; font-size: 1.4rem; }
          pre { white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>Latest Receipt</h1>
        <pre>${safeText}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
function checkout() {
  // OFFLINE-MODE: Enhanced checkout with offline support and payment methods
  if (cart.size === 0) {
    alert('Your cart is empty. Add an item before checkout.');
    return;
  }

  const items = Array.from(cart.values()).map((item) => ({ ...item }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const customerId = $customerSelect ? Number($customerSelect.value) : null;
  const customer = customerId ? customers.find((c) => c.id === customerId) : null;

  // OFFLINE-MODE: Get selected payment method
  const paymentMethod = $paymentMethod ? $paymentMethod.value : 'cash';
  const isOnline = navigator.onLine && apiConnected;
  const isCash = paymentMethod === 'cash';

  // OFFLINE-MODE: Block MM/Bank card when offline
  if (!isCash && !isOnline) {
    alert('Mobile Money and Bank Card payments require an internet connection.\n\nPlease use Cash for offline transactions, or connect to the internet.');
    return;
  }

  const transactionId = DB.generateOfflineTransactionId();
  const customerName = customer ? customer.name : 'Walk-in Customer';

  // OFFLINE-MODE: Deduct inventory locally first
  items.forEach((item) => {
    const product = getProductById(item.id);
    if (product) {
      product.quantity = Math.max(product.quantity - item.quantity, 0);
    }
  });
  saveInventory();

  // OFFLINE-MODE: Create sale via DB layer (handles sync_status, offline ID)
  const saleRecord = DB.createSale({
    transactionId,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    customerName,
    createdBy: getStoredSession()?.username || ''
  });

  salesHistory.unshift(saleRecord);
  saveSalesHistory();

  logAudit('sale', `Processed sale ${transactionId}`,
    `Customer: ${customerName} | Total: ${formatCurrency(total)} | Payment: ${paymentMethod}${!isOnline && !isCash ? ' (PENDING)' : ''}`);

  $receiptOutput.textContent = generateReceipt();
  clearCart();
  renderAll();

  // OFFLINE-MODE: Try to sync to server if online, otherwise queue for later
  if (isOnline) {
    API.post('/sales', {
      items, subtotal, tax, total,
      paymentMethod,
      customerName
    }).then((r) => {
      console.log('Sale synced to server:', r.transactionId);
      // Mark as synced
      DB.markSynced(DB.STORES.SALES, saleRecord.id);
    }).catch((e) => {
      console.warn('Sale sync failed (will retry later):', e);
      // OFFLINE-MODE: Already saved as pending_sync by DB.createSale
    });
  } else {
    // OFFLINE-MODE: Sale saved locally with sync_status='pending_sync'
    console.log('Sale saved offline. Will sync when internet returns.');
    updateConnectionBanner();
  }
}
function handleInventoryAction(action, productId) {
  const product = getProductById(productId);
  if (!product) return;
  if (action === 'increase-stock') {
    product.quantity += 1;
  } else if (action === 'decrease-stock') {
    product.quantity = Math.max(product.quantity - 1, 0);
  } else if (action === 'edit-item') {
    // Fill the stock form with the item's current data for editing
    $itemBrand.value = product.brand || '';
    $itemCarType.value = product.carType || '';
    $itemYear.value = product.year || '';
    $itemSidePart.value = product.sidePart || '';
    $itemPrice.value = product.price !== undefined ? product.price : '';
    $itemCost.value = product.cost !== undefined ? product.cost : '';
    $itemQuantity.value = product.quantity !== undefined ? product.quantity : 0;
    $itemLowThreshold.value = product.lowThreshold !== undefined ? product.lowThreshold : 5;
    editingItemId = product.id;
    // Scroll the form into view
    if ($stockForm) $stockForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $stockForm.querySelector('button[type="submit"]').focus();
    return; // don't save or re-render yet
  } else if (action === 'rename-item') {
    const newName = prompt('Enter a new brand for this part:', product.brand);
    if (newName && newName.trim()) {
      product.brand = newName.trim();
      logAudit('inventory', `Renamed part ${product.carType}`, `New brand: ${product.brand}`);
    }
  } else if (action === 'delete-item') {
    const label = product.brand || product.name || 'Unknown';
    if (confirm(`Permanently delete "${label}" (${product.carType}) from the system? This cannot be undone.`)) {
      const deletedName = label;
      const deletedSku = product.carType;
      inventory = inventory.filter((p) => p.id !== productId);
      saveInventory();
      logAudit('inventory', `Deleted item ${deletedName}`, `Car Type ${deletedSku} permanently removed from inventory`);
      renderAll();
      return; // renderAll already called, skip the final one
    }
  }
  saveInventory();
  renderAll();
}
function addOrUpdateStock(event) {
  event.preventDefault();
  const brand = $itemBrand.value.trim();
  const carType = $itemCarType.value.trim().toUpperCase();
  const year = $itemYear.value.trim();
  const sidePart = $itemSidePart.value.trim();
  const price = parseFloat($itemPrice.value);
  const cost = parseFloat($itemCost.value);
  const quantity = parseInt($itemQuantity.value, 10);
  const lowThreshold = parseInt($itemLowThreshold.value, 10);
  if (!brand || !carType || Number.isNaN(price) || Number.isNaN(cost) || Number.isNaN(quantity) || Number.isNaN(lowThreshold)) {
    alert('Please enter valid product details (Brand and Car Type are required).');
    return;
  }

  // Check if we are editing an existing item
  if (editingItemId !== null) {
    const existing = getProductById(editingItemId);
    if (existing) {
      existing.brand = brand;
      existing.carType = carType;
      existing.year = year;
      existing.sidePart = sidePart;
      existing.price = price;
      existing.cost = cost;
      existing.quantity = quantity; // replace, not add
      existing.lowThreshold = lowThreshold;
      alert(`Updated "${brand}" (${carType}).`);
      logAudit('inventory', `Edited item: ${brand}`, `Car Type ${carType}, all fields updated`);
      editingItemId = null;
      saveInventory();
      $stockForm.reset();
      $itemLowThreshold.value = '5';
      $itemCost.value = '';
      renderAll();
      return;
    }
    // If item was deleted, fall through to add as new
    editingItemId = null;
  }

  // Always create a new product entry (do not merge with existing by carType)
  const id = inventory.length ? Math.max(...inventory.map((item) => item.id)) + 1 : 1;
  inventory.push({ id, brand, carType, year, sidePart, price, cost, quantity, lowThreshold });
  alert(`Added new product ${brand} (${carType}) - Variant #${id}.`);
  logAudit('inventory', `Added new inventory item ${brand}`, `Car Type ${carType}, quantity ${quantity}`);
  // Record restock for quantity added
  if (quantity > 0) {
    recordRestock({ id, brand, carType, year, sidePart }, quantity, '', 'Inventory form update');
  }
  saveInventory();
  $stockForm.reset();
  $itemLowThreshold.value = '5';
  $itemCost.value = '';
  renderAll();
}
// OFFLINE-MODE: Update the connection banner based on sync status
function updateConnectionBanner() {
  if (!$connectionBanner) return;
  const status = SyncService ? SyncService.getStatus() : { online: false, pendingCount: 0 };
  const pendingCount = DB.getPendingCount();

  if (status.online && pendingCount === 0) {
    $connectionBanner.style.display = 'none';
  } else if (!status.online) {
    $connectionBanner.style.display = 'flex';
    $connectionBanner.className = 'connection-banner offline';
    $connectionBanner.innerHTML = `
      <span class="banner-icon">&#x26a0;&#xfe0f;</span>
      <span class="banner-text">OFFLINE MODE &mdash; <strong>${pendingCount}</strong> sale${pendingCount === 1 ? '' : 's'} queued for sync</span>
      <button class="button secondary banner-close" onclick="this.parentElement.style.display='none'">&times;</button>
    `;
  } else if (pendingCount > 0) {
    $connectionBanner.style.display = 'flex';
    $connectionBanner.className = 'connection-banner pending';
    $connectionBanner.innerHTML = `
      <span class="banner-icon">&#x1f504;</span>
      <span class="banner-text">Syncing <strong>${pendingCount}</strong> pending sale${pendingCount === 1 ? '' : 's'}...</span>
    `;
  }
}

// OFFLINE-MODE: Update last sync time display
function updateLastSyncTime() {
  if (!$lastSyncTime) return;
  const lastSync = DB.getLastSyncTime();
  if (lastSync) {
    const date = new Date(lastSync);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    let label;
    if (diff < 60) label = 'Just now';
    else if (diff < 3600) label = Math.floor(diff / 60) + 'm ago';
    else if (diff < 86400) label = Math.floor(diff / 3600) + 'h ago';
    else label = date.toLocaleDateString();
    $lastSyncTime.textContent = 'Last sync: ' + label;
  } else {
    $lastSyncTime.textContent = '';
  }
}

function switchTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabName);
  });
}
function setupEventListeners() {
  if ($loginForm && $loginUsername && $loginPassword && $roleSelect) {
    // ---- Frontend rate limiting: prevent rapid submissions ----
    let loginSubmitting = false;
    let loginCooldownTimer = null;

    $loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Prevent duplicate submissions
      if (loginSubmitting) return;
      loginSubmitting = true;
      const $btn = document.getElementById('btnLoginSubmit');
      if ($btn) { $btn.disabled = true; $btn.textContent = 'Signing in…'; }

      try {
        const username = $loginUsername.value.trim();
        const password = $loginPassword.value.trim();
        const role = $roleSelect.value;
        const account = await authenticateUser(username, password, role);
        if (!account) {
          if ($loginMessage) {
            $loginMessage.textContent = 'Invalid username, password, or role selection.';
            $loginMessage.classList.add('error');
          }
          return;
        }
        saveStoredSession({ role: account.role, username: account.username });
        // If API is connected, push local data then sync from server
        if (apiConnected) {
          try {
            await pushAllLocalData();
            await syncFromServer();
          } catch (e) {
            console.warn('Initial data sync failed, using local data.', e);
          }
        }
        redirectToRoleDashboard(account.role);
      } finally {
        // Re‑enable after a short cooldown (prevents rapid retry)
        if (loginCooldownTimer) clearTimeout(loginCooldownTimer);
        loginCooldownTimer = setTimeout(() => {
          loginSubmitting = false;
          if ($btn) { $btn.disabled = false; $btn.textContent = 'Sign In'; }
        }, 2000);
      }
    });
  }
  if ($btnLogout) {
    $btnLogout.addEventListener('click', () => {
      clearStoredSession();
      redirectToLoginPage();
    });
  }
  if (tabButtons.length) {
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
  }
  window.addEventListener('online', () => {
    updateNetworkStatus(true);
    renderAll();
    updateConnectionBanner();
    // Trigger background sync when coming back online
    triggerBackgroundSync();
  });
  window.addEventListener('offline', () => {
    updateNetworkStatus(false);
    apiConnected = false;
    updateConnectionBanner();
  });
  if ($productGrid) {
    $productGrid.addEventListener('click', (event) => {
      // Accordion toggle for product groups
      const header = event.target.closest('.product-accordion-header');
      if (header) {
        const item = header.closest('.product-accordion-item');
        if (item) {
          const body = item.querySelector('.product-accordion-body');
          const arrow = header.querySelector('.accordion-arrow');
          if (body && arrow) {
            const isOpen = body.style.display === 'block';
            body.style.display = isOpen ? 'none' : 'block';
            arrow.textContent = isOpen ? '▶' : '▼';
            header.classList.toggle('expanded', !isOpen);
          }
        }
        return;
      }
      // Add to cart button
      const button = event.target.closest('button');
      if (!button || !button.dataset.productId) return;
      const productId = Number(button.dataset.productId);
      const select = document.querySelector(`#variant-${productId}`);
      const selectedVariant = select ? select.value : '';
      addProductToCart(productId, selectedVariant);
    });
  }
  if ($cartItems) {
    $cartItems.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || !button.dataset.action) return;
      const cartKey = button.dataset.cartKey;
      if (!cartKey) return;
      if (button.dataset.action === 'increase') {
        changeQuantity(cartKey, 1);
      } else if (button.dataset.action === 'decrease') {
        changeQuantity(cartKey, -1);
      } else if (button.dataset.action === 'remove') {
        removeFromCart(cartKey);
      }
    });
  }
  if ($inventoryTableContainer) {
    $inventoryTableContainer.addEventListener('click', (event) => {
      // Accordion toggle for inventory items
      const header = event.target.closest('.inventory-accordion-header');
      if (header) {
        const item = header.closest('.inventory-accordion-item');
        if (item) {
          const body = item.querySelector('.inventory-accordion-body');
          const arrow = header.querySelector('.accordion-arrow');
          if (body && arrow) {
            const isOpen = body.style.display === 'block';
            body.style.display = isOpen ? 'none' : 'block';
            arrow.textContent = isOpen ? '▶' : '▼';
            header.classList.toggle('expanded', !isOpen);
          }
        }
        return;
      }
      // Handle action buttons
      const button = event.target.closest('button');
      if (!button || !button.dataset.action) return;
      const productId = Number(button.dataset.id);
      handleInventoryAction(button.dataset.action, productId);
    });
  }
  if ($searchInput) {
    $searchInput.addEventListener('input', () => renderProducts($searchInput.value));
  }
  if ($barcodeInput) {
    $barcodeInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addBarcodeItem();
      }
    });
  }
  if ($btnAddBarcode) {
    $btnAddBarcode.addEventListener('click', addBarcodeItem);
  }
  // OFFLINE-MODE: Salesperson Add Customer modal
  if ($btnAddCustomer) {
    $btnAddCustomer.addEventListener('click', showAddCustomerModal);
  }
  if ($btnCloseCustomerModal) {
    $btnCloseCustomerModal.addEventListener('click', hideAddCustomerModal);
  }
  if ($btnCancelCustomer) {
    $btnCancelCustomer.addEventListener('click', hideAddCustomerModal);
  }
  if ($addCustomerModal) {
    $addCustomerModal.addEventListener('click', (e) => {
      if (e.target === $addCustomerModal) hideAddCustomerModal();
    });
  }
  if ($salesCustomerForm) {
    $salesCustomerForm.addEventListener('submit', handleSalesAddCustomer);
  }
  if ($customerSearch) {
    $customerSearch.addEventListener('input', () => renderCustomerTable($customerSearch.value));
  }
  if ($supplierSearch) {
    $supplierSearch.addEventListener('input', () => renderSupplierTable($supplierSearch.value));
  }
  if ($customerForm) {
    $customerForm.addEventListener('submit', handleCustomerSave);
  }
  if ($supplierForm) {
    $supplierForm.addEventListener('submit', handleSupplierSave);
  }
  if ($purchaseOrderForm) {
    $purchaseOrderForm.addEventListener('submit', handleReceiveStock);
  }

  // OFFLINE-MODE: Payment method change handler
  if ($paymentMethod) {
    $paymentMethod.addEventListener('change', () => {
      const isCash = $paymentMethod.value === 'cash';
      const isOnline = navigator.onLine && apiConnected;
      if ($paymentWarning) {
        $paymentWarning.style.display = (!isCash && !isOnline) ? 'inline' : 'none';
      }
    });
  }

  // OFFLINE-MODE: Sync Now button
  if ($btnSyncNow) {
    $btnSyncNow.addEventListener('click', async () => {
      $btnSyncNow.disabled = true;
      $btnSyncNow.textContent = 'Syncing...';
      try {
        // First push local data to server
        await pushAllLocalData();
        // Then run SyncService sync cycle
        const result = await SyncService.syncNow();
        if (result && result.online) {
          // Refresh all data from DB/localStorage
          inventory = loadInventory();
          salesHistory = loadSalesHistory();
          customers = loadCustomers();
          suppliers = loadSuppliers();
          purchaseOrders = loadPurchaseOrders();
          restocks = loadRestocks();
          auditLog = loadAuditLog();
          renderAll();
        }
      } catch (e) {
        console.warn('Manual sync failed:', e);
      } finally {
        $btnSyncNow.disabled = false;
        $btnSyncNow.textContent = '\u21bb Sync';
      }
    });
  }

  if ($auditFilter) {
    $auditFilter.addEventListener('change', () => renderAuditLog($auditFilter.value));
  }
  reportPeriodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedReportPeriod = button.dataset.period;
      renderReportPeriodSummary(selectedReportPeriod);
      updateReportPeriodButtons();
    });
  });
  const $btnAddSaleEntry = document.getElementById('btnAddSaleEntry');
  if ($btnAddSaleEntry) {
    $btnAddSaleEntry.addEventListener('click', openAddSaleModal);
  }
  const $btnClearAllSales = document.getElementById('btnClearAllSales');
  if ($btnClearAllSales) {
    $btnClearAllSales.addEventListener('click', clearAllSalesRecords);
  }
  if ($inventorySearch) {
    $inventorySearch.addEventListener('input', () => renderInventoryTable($inventorySearch.value));
  }
  if ($stockForm) {
    $stockForm.addEventListener('submit', addOrUpdateStock);
  }
  if ($btnCheckout) {
    $btnCheckout.addEventListener('click', checkout);
  }
  if ($btnClear) {
    $btnClear.addEventListener('click', () => {
      if (cart.size > 0 && confirm('Clear the entire cart?')) {
        clearCart();
      }
    });
  }
  if ($btnPrint) {
    $btnPrint.addEventListener('click', () => {
      if (cart.size === 0) {
        alert('Add items to the cart first, then print the receipt for those selected items.');
        return;
      }
      const receiptText = generateReceipt();
      openReceiptPrintWindow(receiptText);
    });
  }
  if ($btnExportBackup) {
    $btnExportBackup.addEventListener('click', () => {
      downloadExcelBackup();
    });
  }
  const $btnExportBackupReports = document.getElementById('btnExportBackupReports');
  if ($btnExportBackupReports) {
    $btnExportBackupReports.addEventListener('click', () => {
      downloadExcelBackup();
    });
  }
  // User management form
  const $userForm = document.getElementById('userForm');
  const $userUsername = document.getElementById('userUsername');
  const $userPassword = document.getElementById('userPassword');
  const $userRole = document.getElementById('userRole');
  if ($userForm && $userUsername && $userPassword && $userRole) {
    $userForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const uname = $userUsername.value.trim();
      const pwd = $userPassword.value.trim();
      const role = $userRole.value;
      if (!uname || !pwd) {
        alert('Please enter both username and password.');
        return;
      }
      if (pwd.length < 4) {
        alert('Password must be at least 4 characters.');
        return;
      }
      if (addUser(uname, pwd, role)) {
        alert(`User "${uname}" (${role}) created successfully.`);
        $userForm.reset();
        renderUserTable();
      } else {
        alert(`A user with username "${uname}" already exists.`);
      }
    });
  }
  // Remove user via delegation on user table container
  const $userTableContainer = document.getElementById('userTableContainer');
  if ($userTableContainer) {
    $userTableContainer.addEventListener('click', (event) => {
      const btn = event.target.closest('button');
      if (btn && btn.dataset.action === 'remove-user') {
        const userId = Number(btn.dataset.userId);
        if (confirm('Remove this user account?')) {
          removeUser(userId);
          renderUserTable();
        }
      }
    });
  }

  // ============================
  // CHANGE MANAGER CREDENTIALS MODAL
  // ============================
  const $btnChangeCredentials = document.getElementById('btnChangeCredentials');
  const $credentialsModal = document.getElementById('changeCredentialsModal');
  const $credentialsForm = document.getElementById('changeCredentialsForm');
  const $credCurrentPassword = document.getElementById('credCurrentPassword');
  const $credNewUsername = document.getElementById('credNewUsername');
  const $credNewPassword = document.getElementById('credNewPassword');
  const $credConfirmPassword = document.getElementById('credConfirmPassword');
  const $credMessage = document.getElementById('credMessage');
  const $btnCloseCredentials = document.getElementById('btnCloseCredentials');
  const $btnCancelCredentials = document.getElementById('btnCancelCredentials');

  if ($btnChangeCredentials) {
    $btnChangeCredentials.addEventListener('click', () => {
      if ($credentialsModal) {
        $credentialsModal.style.display = 'flex';
        if ($credCurrentPassword) $credCurrentPassword.value = '';
        if ($credNewUsername) $credNewUsername.value = USER_ACCOUNTS.manager.username;
        if ($credNewPassword) $credNewPassword.value = '';
        if ($credConfirmPassword) $credConfirmPassword.value = '';
        if ($credMessage) { $credMessage.textContent = ''; $credMessage.className = 'login-message'; }
      }
    });
  }

  function closeCredentialsModal() {
    if ($credentialsModal) $credentialsModal.style.display = 'none';
  }

  if ($btnCloseCredentials) {
    $btnCloseCredentials.addEventListener('click', closeCredentialsModal);
  }
  if ($btnCancelCredentials) {
    $btnCancelCredentials.addEventListener('click', closeCredentialsModal);
  }
  if ($credentialsModal) {
    $credentialsModal.addEventListener('click', (e) => {
      if (e.target === $credentialsModal) closeCredentialsModal();
    });
  }

  if ($credentialsForm) {
    $credentialsForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const currentPassword = $credCurrentPassword ? $credCurrentPassword.value.trim() : '';
      const newUsername = $credNewUsername ? $credNewUsername.value.trim() : '';
      const newPassword = $credNewPassword ? $credNewPassword.value.trim() : '';
      const confirmPassword = $credConfirmPassword ? $credConfirmPassword.value.trim() : '';

      // Verify current password matches the stored manager password
      const stored = loadManagerCredentials() || USER_ACCOUNTS.manager;
      if (currentPassword !== stored.password) {
        if ($credMessage) {
          $credMessage.textContent = 'Current password is incorrect.';
          $credMessage.className = 'login-message error';
        }
        return;
      }

      if (!newUsername) {
        if ($credMessage) {
          $credMessage.textContent = 'Username cannot be empty.';
          $credMessage.className = 'login-message error';
        }
        return;
      }

      if (newPassword.length < 4) {
        if ($credMessage) {
          $credMessage.textContent = 'Password must be at least 4 characters.';
          $credMessage.className = 'login-message error';
        }
        return;
      }

      if (newPassword !== confirmPassword) {
        if ($credMessage) {
          $credMessage.textContent = 'Passwords do not match.';
          $credMessage.className = 'login-message error';
        }
        return;
      }

      const success = await updateManagerCredentials(newUsername, newPassword);
      if (success) {
        // Also update the active session username if it's the current manager
        const session = getStoredSession();
        if (session && session.role === 'manager') {
          session.username = newUsername.toLowerCase().trim();
          saveStoredSession(session);
        }
        if ($credMessage) {
          $credMessage.textContent = 'Login details updated successfully!';
          $credMessage.className = 'login-message';
        }
        setTimeout(closeCredentialsModal, 1500);
        // Update the user table display
        renderUserTable();
      } else {
        if ($credMessage) {
          $credMessage.textContent = 'Failed to update credentials. Try again.';
          $credMessage.className = 'login-message error';
        }
      }
    });
  }

  // ============================
  // PUSH / PULL DATA SYNC BUTTONS
  // ============================
  const $btnPushToServer = document.getElementById('btnPushToServer');
  const $btnPullFromServer = document.getElementById('btnPullFromServer');
  const $syncDataMessage = document.getElementById('syncDataMessage');

  if ($btnPushToServer) {
    $btnPushToServer.addEventListener('click', async () => {
      if (!apiConnected) {
        if ($syncDataMessage) { $syncDataMessage.textContent = 'Cannot connect to server. Please check your connection.'; $syncDataMessage.className = 'login-message error'; }
        return;
      }
      $btnPushToServer.disabled = true;
      $btnPushToServer.textContent = 'Syncing...';
      if ($syncDataMessage) { $syncDataMessage.textContent = ''; $syncDataMessage.className = 'login-message'; }
      try {
        // Use API.importLocalData() to push all localStorage data to server
        const result = await API.importLocalData();
        if ($syncDataMessage) {
          const counts = result.imported ? Object.values(result.imported).reduce((a, b) => a + b, 0) : 0;
          $syncDataMessage.textContent = `✅ Synced ${counts} records to server successfully!`;
          $syncDataMessage.className = 'login-message';
        }
        console.log('[Sync] Local data pushed to server:', result);
      } catch (e) {
        console.warn('[Sync] Failed to push data to server:', e);
        if ($syncDataMessage) { $syncDataMessage.textContent = '❌ Failed to sync data: ' + e.message; $syncDataMessage.className = 'login-message error'; }
      } finally {
        $btnPushToServer.disabled = false;
        $btnPushToServer.textContent = '⬆ Push All Data to Server';
      }
    });
  }

  if ($btnPullFromServer) {
    $btnPullFromServer.addEventListener('click', async () => {
      if (!apiConnected) {
        if ($syncDataMessage) { $syncDataMessage.textContent = 'Cannot connect to server. Please check your connection.'; $syncDataMessage.className = 'login-message error'; }
        return;
      }
      $btnPullFromServer.disabled = true;
      $btnPullFromServer.textContent = 'Pulling...';
      if ($syncDataMessage) { $syncDataMessage.textContent = ''; $syncDataMessage.className = 'login-message'; }
      try {
        await syncFromServer();
        renderAll();
        if ($syncDataMessage) { $syncDataMessage.textContent = '✅ Data refreshed from server!'; $syncDataMessage.className = 'login-message'; }
      } catch (e) {
        console.warn('[Sync] Failed to pull data from server:', e);
        if ($syncDataMessage) { $syncDataMessage.textContent = '❌ Failed to pull: ' + e.message; $syncDataMessage.className = 'login-message error'; }
      } finally {
        $btnPullFromServer.disabled = false;
        $btnPullFromServer.textContent = '⬇ Pull Latest from Server';
      }
    });
  }

  // Company name editor
  if ($btnEditCompanyName) {
    $btnEditCompanyName.addEventListener('click', () => {
      if ($companyNameEditor) {
        if ($companyNameInput) $companyNameInput.value = loadCompanyName();
        $companyNameEditor.style.display = 'flex';
        if ($companyNameInput) $companyNameInput.focus();
      }
    });
  }
  if ($btnSaveCompanyName) {
    $btnSaveCompanyName.addEventListener('click', () => {
      if (!$companyNameInput) return;
      const name = $companyNameInput.value.trim();
      if (!name) { alert('Company name cannot be empty.'); return; }
      saveCompanyName(name);
      updateCompanyTitle();
      if ($companyNameEditor) $companyNameEditor.style.display = 'none';
      // Update the HTML title
      document.title = name + ' - ' + (currentRole === 'manager' ? 'Manager Dashboard' : 'Sales Dashboard');
    });
  }
  if ($btnCloseCompanyNameEditor) {
    $btnCloseCompanyNameEditor.addEventListener('click', () => {
      if ($companyNameEditor) $companyNameEditor.style.display = 'none';
    });
  }
  if ($btnCancelCompanyName) {
    $btnCancelCompanyName.addEventListener('click', () => {
      if ($companyNameEditor) $companyNameEditor.style.display = 'none';
    });
  }
  if ($companyNameEditor) {
    $companyNameEditor.addEventListener('click', (e) => {
      if (e.target === $companyNameEditor) $companyNameEditor.style.display = 'none';
    });
  }
  if ($companyNameInput) {
    $companyNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && $btnSaveCompanyName) $btnSaveCompanyName.click();
      if (e.key === 'Escape' && $btnCancelCompanyName) $btnCancelCompanyName.click();
    });
  }

  // ============================
  // IMPORT / FILE UPLOAD EVENT LISTENERS
  // ============================

  // File input change
  if ($importFileInput) {
    $importFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleImportFile(file);
    });
  }

  // Drag & drop on upload area
  if ($importUploadArea) {
    $importUploadArea.addEventListener('click', () => {
      if ($importFileInput) $importFileInput.click();
    });

    $importUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      $importUploadArea.classList.add('drag-over');
    });

    $importUploadArea.addEventListener('dragleave', () => {
      $importUploadArea.classList.remove('drag-over');
    });

    $importUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      $importUploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleImportFile(file);
    });
  }

  // File remove button
  if ($importFileRemove) {
    $importFileRemove.addEventListener('click', () => {
      // Store the current file first
      if (importRawFileBase64) {
        storeCurrentFile('upload', 0);
      }
      if ($importFileInfo) $importFileInfo.style.display = 'none';
      if ($importUploadArea) $importUploadArea.style.display = 'flex';
      if ($importFileInput) $importFileInput.value = '';
      resetImportState();
    });
  }

  // Sheet selector change
  if ($importSheetSelect) {
    $importSheetSelect.addEventListener('change', () => {
      // Re-parse with selected sheet
      // (Simplified: just notify user to re-upload for now)
      showImportStatus('info', 'Selected different sheet. Please re-upload the file to re-parse.');
    });
  }

  // Column mapping changes (event delegation)
  if ($importMappingFields) {
    $importMappingFields.addEventListener('change', handleMappingChange);
  }

  // Import type toggle buttons
  if (importTypeButtons.length) {
    importTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        importTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        importType = btn.dataset.importType;

        // Re-render mapping if we have data
        if (importHeaders.length > 0 && importRows.length > 0) {
          const fields = IMPORT_FIELDS[importType];
          importMapping = autoDetectImportColumns(importHeaders, fields);
          renderImportMapping();
          renderImportPreview();
        }
      });
    });
  }

  // Import data button
  if ($btnImportData) {
    $btnImportData.addEventListener('click', importDataToSystem);
  }

  // Store file only button
  const $btnStoreFileOnly = document.getElementById('btnStoreFileOnly');
  if ($btnStoreFileOnly) {
    $btnStoreFileOnly.addEventListener('click', storeFileOnly);
  }

  // Import sub-tabs toggle
  const importSubTabs = Array.from(document.querySelectorAll('.import-sub-tab'));
  if (importSubTabs.length) {
    importSubTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        importSubTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sub = btn.dataset.importSub;
        const $importSub = document.getElementById('importSubPanel');
        const $filesSub = document.getElementById('filesSubPanel');
        if ($importSub) $importSub.classList.toggle('active', sub === 'import');
        if ($filesSub) $filesSub.classList.toggle('active', sub === 'files');
        if (sub === 'files') renderUploadedFiles();
      });
    });
  }

  // Uploaded files actions (delegation)
  const $uploadedFilesList = document.getElementById('uploadedFilesList');
  if ($uploadedFilesList) {
    $uploadedFilesList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const fileId = parseInt(btn.dataset.fileId, 10);

      if (btn.classList.contains('btn-download-upload')) {
        downloadUploadedFile(fileId);
      } else if (btn.classList.contains('btn-delete-upload')) {
        deleteUploadedFile(fileId);
      }
    });
  }

  // Clear all uploads button
  const $btnClearAllUploads = document.getElementById('btnClearAllUploads');
  if ($btnClearAllUploads) {
    $btnClearAllUploads.addEventListener('click', clearAllUploads);
  }

  // ============================
  // RESTOCK EVENT LISTENERS
  // ============================
  const $restockMonthSelect = document.getElementById('restockMonthSelect');
  if ($restockMonthSelect) {
    $restockMonthSelect.addEventListener('change', updateRestockView);
  }

  const $btnAddRestock = document.getElementById('btnAddRestock');
  if ($btnAddRestock) {
    $btnAddRestock.addEventListener('click', showRestockForm);
  }

  const $restockForm = document.getElementById('restockForm');
  if ($restockForm) {
    $restockForm.addEventListener('submit', handleRestockFormSubmit);
  }

  // Toggle new product fields when product selection changes
  const $restockProduct = document.getElementById('restockProduct');
  if ($restockProduct) {
    $restockProduct.addEventListener('change', toggleRestockNewProductFields);
  }

  // Update inventory indicator when date changes
  const $restockDate = document.getElementById('restockDate');
  if ($restockDate) {
    $restockDate.addEventListener('change', updateRestockDateIndicator);
  }

  const $btnCancelRestock = document.getElementById('btnCancelRestock');
  if ($btnCancelRestock) {
    $btnCancelRestock.addEventListener('click', hideRestockForm);
  }

  // Clear month restocks button
  const $btnClearMonthRestocks = document.getElementById('btnClearMonthRestocks');
  if ($btnClearMonthRestocks) {
    $btnClearMonthRestocks.addEventListener('click', () => {
      const $input = document.getElementById('restockMonthSelect');
      const month = $input ? $input.value : '';
      if (month) deleteRestockEntry(null, month);
      else alert('Please select a month first.');
    });
  }

  // Clear ALL restocks button
  const $btnClearAllRestocks = document.getElementById('btnClearAllRestocks');
  if ($btnClearAllRestocks) {
    $btnClearAllRestocks.addEventListener('click', clearAllRestocks);
  }

  // All History toggle button
  const $btnRestockHistory = document.getElementById('btnRestockHistory');
  if ($btnRestockHistory) {
    $btnRestockHistory.addEventListener('click', () => {
      restockShowingAll = !restockShowingAll;
      $btnRestockHistory.classList.toggle('active', restockShowingAll);
      
      // Update the month select enabled state
      if ($restockMonthSelect) {
        $restockMonthSelect.disabled = restockShowingAll;
      }
      
      // Update placeholder text in search
      const $search = document.getElementById('restockSearchInput');
      if ($search) {
        $search.placeholder = restockShowingAll
          ? '🔍 Search all restocks...'
          : '🔍 Search by product, brand, supplier...';
      }
      
      updateRestockView();
    });
  }

  // Restock search with debounce
  const $restockSearch = document.getElementById('restockSearchInput');
  if ($restockSearch) {
    let searchTimeout;
    $restockSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const month = $restockMonthSelect ? $restockMonthSelect.value : '';
        renderRestockSummary(month);
        renderRestockTable(month);
      }, 250);
    });
  }

  // Delete individual restock entries via event delegation
  const $restockTableContainer = document.getElementById('restockTableContainer');
  if ($restockTableContainer) {
    $restockTableContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete-restock');
      if (btn && btn.dataset.restockId) {
        deleteRestockEntry(Number(btn.dataset.restockId));
      }
      const editBtn = e.target.closest('.btn-edit-restock');
      if (editBtn && editBtn.dataset.restockId) {
        const restockId = Number(editBtn.dataset.restockId);
        const restockEntry = restocks.find(r => r.id === restockId);
        if (restockEntry) {
          showRestockForm(restockEntry);
        }
      }
      // Accordion toggle for All History view
      const header = e.target.closest('.restock-accordion-header');
      if (header) {
        const body = header.nextElementSibling;
        const arrow = header.querySelector('.accordion-arrow');
        if (body && arrow) {
          const isOpen = body.style.display === 'block';
          body.style.display = isOpen ? 'none' : 'block';
          arrow.textContent = isOpen ? '▶' : '▼';
          header.classList.toggle('expanded', !isOpen);
        }
      }
    });
  }
}
if (currentPage === 'login.html') {
  if ($loginForm && $loginUsername && $loginPassword && $roleSelect) {
    $loginUsername.value = 'salesperson';
    $roleSelect.value = 'salesperson';
  }
} else if (currentPage === 'salesperson.html' || currentPage === 'manager.html') {
  enforceRoleAccess();
  applyRoleRestrictions();
  // Try API token verification and data sync
  API.verifyToken().then((user) => {
    if (user) {
      apiConnected = true;
      // Push local data first, then sync from server
      return pushAllLocalData().then(() => syncFromServer()).then(() => renderAll());
    }
  }).catch(() => {});
}
renderAll();
setupEventListeners();
updateNetworkStatus();
registerServiceWorker();
startPeriodicSync();

// Initialize uploaded files display
if ($uploadedFilesList) renderUploadedFiles();

// OFFLINE-MODE: Initialize the SyncService
if (window.SyncService) {
  SyncService.start();

  // Listen for sync events to update the UI
  SyncService.onEvent((eventType, data) => {
    switch (eventType) {
      case 'connectivity':
        updateNetworkStatus(data.online);
        updateConnectionBanner();
        break;
      case 'sync-start':
        if ($btnSyncNow) $btnSyncNow.disabled = true;
        updateConnectionBanner();
        break;
      case 'sync-end':
        if ($btnSyncNow) $btnSyncNow.disabled = false;
        // Refresh data after sync
        if (data.online !== false) {
          inventory = loadInventory();
          salesHistory = loadSalesHistory();
          customers = loadCustomers();
          suppliers = loadSuppliers();
          purchaseOrders = loadPurchaseOrders();
          restocks = loadRestocks();
          auditLog = loadAuditLog();
          renderAll();
        }
        updateConnectionBanner();
        updateLastSyncTime();
        break;
      case 'conflicts':
        console.warn('[Sync] Conflicts detected:', data.conflicts);
        break;
      case 'error':
        console.warn('[Sync] Error during', data.phase + ':', data.error);
        break;
    }
  });

  // Update last sync time and banner on load
  updateLastSyncTime();
  updateConnectionBanner();

  // OFFLINE-MODE: Update payment method warning on load
  if ($paymentMethod && $paymentWarning) {
    const isCash = $paymentMethod.value === 'cash';
    const isOnline = navigator.onLine && apiConnected;
    $paymentWarning.style.display = (!isCash && !isOnline) ? 'inline' : 'none';
  }
}

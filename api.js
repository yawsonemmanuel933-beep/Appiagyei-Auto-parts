/* ===========================================================
 * SYNC-STORE Point of Sale System — API Layer
   Bridge between frontend and backend REST API
   =========================================================== */
const API_BASE = window.location.origin + '/api';
const AUTH_TOKEN_KEY = 'pos_api_token';
let apiToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
let apiUser = null;

try {
  const stored = localStorage.getItem('pos_api_user');
  if (stored) apiUser = JSON.parse(stored);
} catch (_) {}

// -----------------------------------------------------------------------
// Token management
// -----------------------------------------------------------------------
function setApiToken(token, user) {
  apiToken = token;
  apiUser = user;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (user) localStorage.setItem('pos_api_user', JSON.stringify(user));
  else localStorage.removeItem('pos_api_user');
}

function clearApiToken() {
  apiToken = '';
  apiUser = null;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('pos_api_user');
}

// -----------------------------------------------------------------------
// HTTP helpers
// -----------------------------------------------------------------------
async function apiFetch(method, path, body) {
  const url = API_BASE + path;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (apiToken) opts.headers['Authorization'] = 'Bearer ' + apiToken;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function apiGet(path) { return apiFetch('GET', path); }
function apiPost(path, body) { return apiFetch('POST', path, body); }
function apiPut(path, body) { return apiFetch('PUT', path, body); }
function apiPatch(path, body) { return apiFetch('PATCH', path, body); }
function apiDel(path) { return apiFetch('DELETE', path); }

// -----------------------------------------------------------------------
// Check online / reachable
// -----------------------------------------------------------------------
async function checkApiReachable() {
  if (!navigator.onLine) return false;
  try {
    await apiGet('/health');
    return true;
  } catch (_) {
    return false;
  }
}

// -----------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------
async function apiLogin(username, password, role) {
  const result = await apiPost('/auth/login', { username, password, role });
  setApiToken(result.token, result.user);
  return result.user;
}

async function apiVerifyToken() {
  if (!apiToken) return null;
  try {
    const result = await apiPost('/auth/verify');
    return result.user;
  } catch (_) {
    clearApiToken();
    return null;
  }
}

function apiLogout() {
  clearApiToken();
}

function getApiUser() { return apiUser; }
function getApiToken() { return apiToken; }

// -----------------------------------------------------------------------
// Data sync (import localStorage data into server)
// -----------------------------------------------------------------------
async function importLocalData() {
  const payload = {};
  const keys = {
    inventory: 'pos_inventory_db',
    sales: 'pos_sales_history',
    customers: 'pos_customers',
    suppliers: 'pos_suppliers',
    purchaseOrders: 'pos_purchase_orders',
    restocks: 'pos_restocks',
    auditLog: 'pos_audit_log',
    users: 'pos_users_db'
  };
  for (const [key, lsKey] of Object.entries(keys)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) payload[key] = JSON.parse(raw);
    } catch (_) {}
  }
  if (Object.keys(payload).length === 0) return { imported: {} };
  return apiPost('/sync/import', payload);
}

// -----------------------------------------------------------------------
// Exported global API object
// -----------------------------------------------------------------------
window.API = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  del: apiDel,
  login: apiLogin,
  logout: apiLogout,
  verifyToken: apiVerifyToken,
  checkReachable: checkApiReachable,
  importLocalData,
  getToken: getApiToken,
  getUser: getApiUser,
  BASE: API_BASE
};
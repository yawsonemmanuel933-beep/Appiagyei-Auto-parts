require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const initSqlJs = require('sql.js');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sync-store-secret-key-change-in-production';
const DB_PATH = path.join(__dirname, 'pos.db');

// ---------------------------------------------------------------------------
// Rate Limiter — brute‑force / credential‑stuffing protection
// ---------------------------------------------------------------------------
const rateLimiter = {
  attempts: new Map(),
  maxAttempts: 5,               // 5 attempts…
  windowMs: 60 * 1000,          // …per 60‑second sliding window…
  lockoutMs: 15 * 60 * 1000,    // …then locked out for 15 minutes

  _now() { return Date.now(); },

  check(ip) {
    const now = this._now();
    const rec = this.attempts.get(ip) || { count: 0, lockoutUntil: 0, windowStart: now };

    // Locked out ?
    if (rec.lockoutUntil > now) {
      const left = Math.ceil((rec.lockoutUntil - now) / 60000);
      return { allowed: false, message: `Account temporarily locked. Try again in ${left} min.` };
    }

    // Window expired → reset counter
    if (now - rec.windowStart > this.windowMs) {
      rec.count = 0;
      rec.windowStart = now;
    }

    return { allowed: rec.count < this.maxAttempts, record: rec };
  },

  increment(ip) {
    const now = this._now();
    let rec = this.attempts.get(ip);
    if (!rec) {
      rec = { count: 0, lockoutUntil: 0, windowStart: now };
      this.attempts.set(ip, rec);
    }
    if (now - rec.windowStart > this.windowMs) {
      rec.count = 0;
      rec.windowStart = now;
    }
    rec.count++;
    if (rec.count >= this.maxAttempts) {
      rec.lockoutUntil = now + this.lockoutMs;
      rec.count = 0;
    }
  },

  reset(ip) { this.attempts.delete(ip); },

  // Periodic cleanup — prevents memory leak on long‑running servers
  _cleanup() {
    const now = this._now();
    for (const [ip, rec] of this.attempts.entries()) {
      if (rec.lockoutUntil < now && now - rec.windowStart > this.windowMs * 2) {
        this.attempts.delete(ip);
      }
    }
  }
};
setInterval(() => rateLimiter._cleanup(), 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Simple IP extraction helper (trusts X-Forwarded-For if behind a proxy)
// ---------------------------------------------------------------------------
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

let db, SQL;

// ---------------------------------------------------------------------------
// sql.js wrapper helpers
// ---------------------------------------------------------------------------
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}
function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}
function dbTransaction(fn) {
  db.run('BEGIN');
  try {
    fn();
    db.run('COMMIT');
    saveDb();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}
function lastInsertId() {
  const r = db.exec('SELECT last_insert_rowid() as id');
  return r?.[0]?.values?.[0]?.[0] || 0;
}
function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  } catch (e) {
    console.error('Failed to save database:', e.message);
  }
}
function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
}

// ===========================================================================
// Async initialization
// ===========================================================================
async function start() {
  SQL = await initSqlJs();
  loadDb();

  // Create tables
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN (\'salesperson\',\'manager\')), is_default INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sku TEXT UNIQUE NOT NULL, category TEXT NOT NULL DEFAULT \'\', price REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0, quantity INTEGER NOT NULL DEFAULT 0, low_threshold INTEGER NOT NULL DEFAULT 3, variants TEXT DEFAULT \'[]\', image TEXT DEFAULT \'\', brand TEXT DEFAULT \'\', car_type TEXT DEFAULT \'\', year TEXT DEFAULT \'\', side_part TEXT DEFAULT \'\', created_at TEXT DEFAULT (datetime(\'now\')), updated_at TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id TEXT UNIQUE NOT NULL, items TEXT NOT NULL DEFAULT \'[]\', subtotal REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, payment_method TEXT DEFAULT \'cash\', customer_name TEXT DEFAULT \'\', created_by TEXT DEFAULT \'\', timestamp TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT DEFAULT \'\', phone TEXT DEFAULT \'\', created_at TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT DEFAULT \'\', email TEXT DEFAULT \'\', phone TEXT DEFAULT \'\', created_at TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, supplier_name TEXT DEFAULT \'\', items TEXT NOT NULL DEFAULT \'[]\', total REAL NOT NULL DEFAULT 0, status TEXT DEFAULT \'pending\' CHECK(status IN (\'pending\',\'received\',\'cancelled\')), created_by TEXT DEFAULT \'\', created_at TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS restocks (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, brand TEXT DEFAULT \'\', car_type TEXT DEFAULT \'\', year TEXT DEFAULT \'\', side_part TEXT DEFAULT \'\', quantity_added INTEGER NOT NULL DEFAULT 0, unit_cost REAL NOT NULL DEFAULT 0, total_cost REAL NOT NULL DEFAULT 0, supplier_name TEXT DEFAULT \'\', supplier_id INTEGER, notes TEXT DEFAULT \'\', created_by TEXT DEFAULT \'\', timestamp TEXT DEFAULT (datetime(\'now\')), restock_month TEXT DEFAULT (strftime(\'%Y-%m\',\'now\')))');
  db.run('CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL DEFAULT \'general\', title TEXT NOT NULL DEFAULT \'\', details TEXT DEFAULT \'\', created_by TEXT DEFAULT \'\', timestamp TEXT DEFAULT (datetime(\'now\')))');

  // ---- OFFLINE-MODE: Migration — add sync_status and offline_id to sales ----
  try { db.run("ALTER TABLE sales ADD COLUMN sync_status TEXT DEFAULT 'synced'"); } catch(_) {}
  try { db.run("ALTER TABLE sales ADD COLUMN offline_id TEXT"); } catch(_) {}
  try { db.run("ALTER TABLE sales ADD COLUMN payment_confirmed INTEGER DEFAULT 1"); } catch(_) {}
  try { db.run("ALTER TABLE sales ADD COLUMN needs_confirmation INTEGER DEFAULT 0"); } catch(_) {}
  // ---- Migration: add brand, car_type, year, side_part to inventory ----
  try { db.run("ALTER TABLE inventory ADD COLUMN brand TEXT DEFAULT ''"); } catch(_) {}
  try { db.run("ALTER TABLE inventory ADD COLUMN car_type TEXT DEFAULT ''"); } catch(_) {}
  try { db.run("ALTER TABLE inventory ADD COLUMN year TEXT DEFAULT ''"); } catch(_) {}
  try { db.run("ALTER TABLE inventory ADD COLUMN side_part TEXT DEFAULT ''"); } catch(_) {}

  saveDb();

  // Seed default data
  seedDefaults();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ---- Security headers ----
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Optional: enable HSTS only in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // ---- Input sanitisation helper (inline) ----
  function sanitise(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>&"']/g, (ch) => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }
  function sanitiseUsername(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[^a-zA-Z0-9_@.\- ]/g, '').trim();
  }

  // Register all routes
  registerRoutes();

  // Serve frontend
  const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '..');
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found' });
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`✅ SYNC-STORE Server running on http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/health`);
  });
}

// ---------------------------------------------------------------------------
// Seed defaults
// ---------------------------------------------------------------------------
function seedDefaults() {
  const uc = dbAll('SELECT COUNT(*) as count FROM users');
  if (uc[0].count === 0) {
    db.run('INSERT INTO users (username, password, role, is_default) VALUES (?,?,?,1)', ['salesperson', bcrypt.hashSync('sales123', 10), 'salesperson']);
    db.run('INSERT INTO users (username, password, role, is_default) VALUES (?,?,?,1)', ['manager', bcrypt.hashSync('manager123', 10), 'manager']);
    saveDb();
    console.log('Default users created.');
  }
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireManager(req, res, next) {
  if (req.user.role !== 'manager')
    return res.status(403).json({ error: 'Manager access required' });
  next();
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------
function registerRoutes() {
  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role required' });

    // ---- Rate limiting & brute‑force protection ----
    const ip = clientIp(req);
    const limit = rateLimiter.check(ip);
    if (!limit.allowed) {
      logAudit('security', `Login blocked (rate limit)`, `IP: ${ip}, user: ${sanitise(username)}`, 'system');
      return res.status(429).json({ error: limit.message });
    }

    // ---- Input sanitisation ----
    const cleanUsername = sanitiseUsername(username);
    if (!cleanUsername) return res.status(400).json({ error: 'Invalid username format' });

    // ---- Case‑insensitive lookup (LOWER on both sides) ----
    const user = dbGet('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND role = ?', [cleanUsername, role]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      rateLimiter.increment(ip);
      logAudit('security', `Failed login attempt`, `IP: ${ip}, user: ${sanitise(cleanUsername)}, role: ${role}`, 'system');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ---- Successful login — reset rate limiter ----
    rateLimiter.reset(ip);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    logAudit('auth', `User logged in: ${user.username}`, `Role: ${user.role}, IP: ${ip}`, user.username);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });
  app.post('/api/auth/verify', authenticate, (req, res) => res.json({ valid: true, user: req.user }));

  // ---- Update own credentials (manager only) ----
  app.put('/api/auth/credentials', authenticate, requireManager, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const cleanUsername = sanitiseUsername(username).toLowerCase();
    if (!cleanUsername) return res.status(400).json({ error: 'Invalid username format' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    // Check if new username is already taken by another user
    const existing = dbGet('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [cleanUsername, req.user.id]);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    // Update the current manager's credentials
    dbRun('UPDATE users SET username = ?, password = ? WHERE id = ?', [
      cleanUsername,
      bcrypt.hashSync(password, 10),
      req.user.id
    ]);

    logAudit('auth', 'Manager credentials updated', `Username changed to: ${cleanUsername}`, cleanUsername);
    res.json({ success: true, username: cleanUsername });
  });

  // Users
  app.get('/api/users', authenticate, requireManager, (req, res) => res.json(dbAll('SELECT id,username,role,is_default,created_at FROM users ORDER BY created_at DESC')));
  app.post('/api/users', authenticate, requireManager, (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role || !['salesperson','manager'].includes(role)) return res.status(400).json({ error: 'Username, password, and valid role required' });
    const cleanUsername = sanitiseUsername(username).toLowerCase();
    if (!cleanUsername) return res.status(400).json({ error: 'Invalid username format' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    if (dbGet('SELECT id FROM users WHERE LOWER(username)=?', [cleanUsername])) return res.status(409).json({ error: 'Username already exists' });
    dbRun('INSERT INTO users (username,password,role) VALUES (?,?,?)', [cleanUsername, bcrypt.hashSync(password, 10), role]);
    logAudit('user', `Added ${role} user: ${username}`, `New ${role} account created`, req.user.username);
    res.status(201).json(dbGet('SELECT id,username,role,is_default,created_at FROM users WHERE id=?', [lastInsertId()]));
  });
  app.delete('/api/users/:id', authenticate, requireManager, (req, res) => {
    const user = dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_default) return res.status(400).json({ error: 'Cannot remove default accounts' });
    dbRun('DELETE FROM users WHERE id = ?', [user.id]);
    logAudit('user', `Removed user: ${user.username}`, `${user.role} account deleted`, req.user.username);
    res.json({ success: true });
  });

  // Inventory
  app.get('/api/inventory', authenticate, (req, res) => res.json(dbAll('SELECT * FROM inventory ORDER BY brand ASC, car_type ASC').map(formatItem)));
  app.post('/api/inventory', authenticate, requireManager, (req, res) => {
    const { brand, carType, year, sidePart, price, cost, quantity, lowThreshold, variants, image } = req.body;
    const name = brand || req.body.name;
    const sku = carType || req.body.sku;
    if (!brand || !carType) return res.status(400).json({ error: 'Brand and Car Type required' });
    if (dbGet('SELECT id FROM inventory WHERE car_type=?', [carType])) return res.status(409).json({ error: 'Car Type already exists' });
    dbRun('INSERT INTO inventory (name,sku,category,brand,car_type,year,side_part,price,cost,quantity,low_threshold,variants,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [brand, carType, year||'', brand, carType, year||'', sidePart||'', price||0, cost||0, quantity||0, lowThreshold||3, JSON.stringify(variants||[]), image||'']);
    logAudit('inventory', `Added item: ${brand}`, `Car Type: ${carType}`, req.user.username);
    res.status(201).json(formatItem(dbGet('SELECT * FROM inventory WHERE id=?', [lastInsertId()])));
  });
  app.put('/api/inventory/:id', authenticate, requireManager, (req, res) => {
    const item = dbGet('SELECT * FROM inventory WHERE id=?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { brand, carType, year, sidePart, price, cost, quantity, lowThreshold, variants, image } = req.body;
    const name = brand || req.body.name;
    const sku = carType || req.body.sku;
    dbRun("UPDATE inventory SET name=?,sku=?,brand=?,car_type=?,year=?,side_part=?,price=?,cost=?,quantity=?,low_threshold=?,variants=?,image=?,updated_at=datetime('now') WHERE id=?", [
      name||item.name, sku||item.sku,
      brand||item.brand, carType||item.car_type,
      year!==undefined ? year : item.year,
      sidePart!==undefined ? sidePart : item.side_part,
      price!==undefined ? price : item.price,
      cost!==undefined ? cost : item.cost,
      quantity!==undefined ? quantity : item.quantity,
      lowThreshold!==undefined ? lowThreshold : item.low_threshold,
      variants ? JSON.stringify(variants) : item.variants,
      image!==undefined ? image : item.image,
      Number(req.params.id)
    ]);
    logAudit('inventory', `Updated item: ${item.brand || item.name}`, `Car Type: ${item.car_type || item.sku}`, req.user.username);
    res.json(formatItem(dbGet('SELECT * FROM inventory WHERE id=?', [req.params.id])));
  });
  app.patch('/api/inventory/:id/stock', authenticate, (req, res) => {
    const { change } = req.body;
    if (typeof change !== 'number') return res.status(400).json({ error: 'Change must be a number' });
    if (!dbGet('SELECT id FROM inventory WHERE id=?', [req.params.id])) return res.status(404).json({ error: 'Item not found' });
    dbRun("UPDATE inventory SET quantity=MAX(0,quantity+?),updated_at=datetime('now') WHERE id=?", [change, Number(req.params.id)]);
    res.json(formatItem(dbGet('SELECT * FROM inventory WHERE id=?', [req.params.id])));
  });
  app.delete('/api/inventory/:id', authenticate, requireManager, (req, res) => {
    const item = dbGet('SELECT * FROM inventory WHERE id=?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    dbRun('DELETE FROM inventory WHERE id=?', [item.id]);
    logAudit('inventory', `Deleted item: ${item.brand || item.name}`, `Car Type: ${item.car_type || item.sku}`, req.user.username);
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', authenticate, (req, res) => res.json(dbAll('SELECT * FROM sales ORDER BY timestamp DESC').map(formatSale)));
  // OFFLINE-MODE: Updated to accept offline sync fields
  app.post('/api/sales', authenticate, (req, res) => {
    const { items, subtotal, tax, total, paymentMethod, customerName, syncStatus, offlineId, paymentConfirmed, needsConfirmation } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Items are required' });
    // OFFLINE-MODE: Preserve offline-generated transaction ID if provided
    const tid = req.body.transactionId || `TXN-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const offId = offlineId || (tid.startsWith('OFF-') ? tid : null);
    const syncStat = syncStatus || 'synced';
    const pmtConfirmed = paymentConfirmed !== undefined ? (paymentConfirmed ? 1 : 0) : 1;
    const needsConfirm = needsConfirmation ? 1 : 0;
    dbTransaction(() => {
      for (const item of items) db.run("UPDATE inventory SET quantity=MAX(0,quantity-?),updated_at=datetime('now') WHERE id=?", [item.quantity, item.id]);
      db.run('INSERT INTO sales (transaction_id,offline_id,items,subtotal,tax,total,payment_method,customer_name,created_by,sync_status,payment_confirmed,needs_confirmation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [tid, offId, JSON.stringify(items), subtotal||0, tax||0, total||0, paymentMethod||'cash', customerName||'', req.user.username, syncStat, pmtConfirmed, needsConfirm]);
    });
    const newId = lastInsertId();
    logAudit('sale', `Sale completed: ${tid}`, `Amount: ${total} | Items: ${items.length}`, req.user.username);
    res.status(201).json({ transactionId: tid, success: true, id: newId, syncStatus: syncStat });
  });
  app.get('/api/sales/report', authenticate, (req, res) => {
    const { period } = req.query;
    let since; const n = new Date();
    if (period==='daily') since=new Date(n.getFullYear(),n.getMonth(),n.getDate()).toISOString();
    else if (period==='weekly') { const w=new Date(n); w.setDate(w.getDate()-((w.getDay()+6)%7)); since=new Date(w.getFullYear(),w.getMonth(),w.getDate()).toISOString(); }
    else if (period==='monthly') since=new Date(n.getFullYear(),n.getMonth(),1).toISOString();
    else if (period==='yearly') since=new Date(n.getFullYear(),0,1).toISOString();
    else since='1970-01-01';
    const sales = dbAll('SELECT * FROM sales WHERE timestamp >= ? ORDER BY timestamp DESC', [since]).map(formatSale);
    res.json({ total:sales.reduce((s,sl)=>s+sl.total,0), transactions:sales.length, itemsSold:sales.reduce((s,sl)=>s+sl.items.reduce((a,i)=>a+i.quantity,0),0), sales, period: period||'all' });
  });
  // OFFLINE-MODE: Updated to handle sync_status and offline fields
  app.put('/api/sales/:id', authenticate, requireManager, (req, res) => {
    const sale = dbGet('SELECT * FROM sales WHERE id=?', [req.params.id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    const { items, subtotal, tax, total, paymentMethod, customerName, timestamp, syncStatus, paymentConfirmed, needsConfirmation } = req.body;
    const updatedItems = items !== undefined ? items : JSON.parse(sale.items);
    const updatedSubtotal = subtotal !== undefined ? subtotal : sale.subtotal;
    const updatedTax = tax !== undefined ? tax : sale.tax;
    const updatedTotal = total !== undefined ? total : sale.total;
    const updatedPayment = paymentMethod !== undefined ? paymentMethod : sale.payment_method;
    const updatedCustomer = customerName !== undefined ? customerName : sale.customer_name;
    const updatedTimestamp = timestamp !== undefined ? timestamp : sale.timestamp;
    const updatedSyncStatus = syncStatus !== undefined ? syncStatus : sale.sync_status;
    const updatedPmtConfirmed = paymentConfirmed !== undefined ? (paymentConfirmed ? 1 : 0) : sale.payment_confirmed;
    const updatedNeedsConfirm = needsConfirmation !== undefined ? (needsConfirmation ? 1 : 0) : sale.needs_confirmation;
    dbRun('UPDATE sales SET items=?,subtotal=?,tax=?,total=?,payment_method=?,customer_name=?,timestamp=?,sync_status=?,payment_confirmed=?,needs_confirmation=? WHERE id=?',
      [JSON.stringify(updatedItems), updatedSubtotal, updatedTax, updatedTotal, updatedPayment, updatedCustomer, updatedTimestamp, updatedSyncStatus, updatedPmtConfirmed, updatedNeedsConfirm, Number(req.params.id)]);
    logAudit('sale', `Sale updated: ${sale.transaction_id}`, `Amount: ${updatedTotal}`, req.user.username);
    res.json(formatSale(dbGet('SELECT * FROM sales WHERE id=?', [req.params.id])));
  });
  app.delete('/api/sales/:id', authenticate, requireManager, (req, res) => {
    const sale = dbGet('SELECT * FROM sales WHERE id=?', [req.params.id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    dbRun('DELETE FROM sales WHERE id=?', [Number(req.params.id)]);
    logAudit('sale', `Sale deleted: ${sale.transaction_id}`, `Amount: ${sale.total}`, req.user.username);
    res.json({ success: true });
  });
  app.delete('/api/sales', authenticate, requireManager, (req, res) => {
    const count = dbGet('SELECT COUNT(*) as c FROM sales');
    dbRun('DELETE FROM sales');
    logAudit('sale', 'All sales cleared', `${count.c} records deleted`, req.user.username);
    res.json({ success: true, deleted: count.c });
  });

  // Customers
  app.get('/api/customers', authenticate, (req, res) => res.json(dbAll('SELECT * FROM customers ORDER BY name ASC')));
  app.post('/api/customers', authenticate, (req, res) => {
    const { name, email, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    dbRun('INSERT INTO customers (name,email,phone) VALUES (?,?,?)', [name, email||'', phone||'']);
    logAudit('customer',`Added customer: ${name}`,`Email: ${email||'N/A'}`, req.user.username);
    res.status(201).json(dbGet('SELECT * FROM customers WHERE id=?', [lastInsertId()]));
  });
  app.put('/api/customers/:id', authenticate, requireManager, (req,res) => {
    const c = dbGet('SELECT * FROM customers WHERE id=?', [req.params.id]);
    if (!c) return res.status(404).json({error:'Customer not found'});
    const {name,email,phone}=req.body;
    dbRun('UPDATE customers SET name=?,email=?,phone=? WHERE id=?', [name||c.name, email!==undefined?email:c.email, phone!==undefined?phone:c.phone, Number(req.params.id)]);
    res.json(dbGet('SELECT * FROM customers WHERE id=?', [req.params.id]));
  });
  app.delete('/api/customers/:id', authenticate, requireManager, (req,res) => {
    const c = dbGet('SELECT * FROM customers WHERE id=?', [req.params.id]);
    if (!c) return res.status(404).json({error:'Customer not found'});
    dbRun('DELETE FROM customers WHERE id=?', [c.id]);
    logAudit('customer',`Deleted customer: ${c.name}`,'',req.user.username);
    res.json({success:true});
  });

  // Suppliers
  app.get('/api/suppliers', authenticate, (req,res) => res.json(dbAll('SELECT * FROM suppliers ORDER BY name ASC')));
  app.post('/api/suppliers', authenticate, (req,res) => {
    const {name,contact,email,phone}=req.body;
    if(!name) return res.status(400).json({error:'Name is required'});
    dbRun('INSERT INTO suppliers (name,contact,email,phone) VALUES (?,?,?,?)', [name,contact||'',email||'',phone||'']);
    logAudit('supplier',`Added supplier: ${name}`, `Contact: ${contact||'N/A'}`, req.user.username);
    res.status(201).json(dbGet('SELECT * FROM suppliers WHERE id=?', [lastInsertId()]));
  });
  app.put('/api/suppliers/:id', authenticate, requireManager, (req,res) => {
    const s = dbGet('SELECT * FROM suppliers WHERE id=?', [req.params.id]);
    if(!s) return res.status(404).json({error:'Supplier not found'});
    const {name,contact,email,phone}=req.body;
    dbRun('UPDATE suppliers SET name=?,contact=?,email=?,phone=? WHERE id=?', [name||s.name, contact!==undefined?contact:s.contact, email!==undefined?email:s.email, phone!==undefined?phone:s.phone, Number(req.params.id)]);
    res.json(dbGet('SELECT * FROM suppliers WHERE id=?', [req.params.id]));
  });
  app.delete('/api/suppliers/:id', authenticate, requireManager, (req,res) => {
    const s = dbGet('SELECT * FROM suppliers WHERE id=?', [req.params.id]);
    if(!s) return res.status(404).json({error:'Supplier not found'});
    dbRun('DELETE FROM suppliers WHERE id=?', [s.id]);
    logAudit('supplier',`Deleted supplier: ${s.name}`,'',req.user.username);
    res.json({success:true});
  });

  // Purchase Orders
  app.get('/api/purchase-orders', authenticate, (req,res) => res.json(dbAll('SELECT * FROM purchase_orders ORDER BY created_at DESC').map(formatPO)));
  app.post('/api/purchase-orders', authenticate, requireManager, (req,res) => {
    const {supplierId,supplierName,items,total}=req.body;
    if(!items||!items.length) return res.status(400).json({error:'Items are required'});
    dbRun('INSERT INTO purchase_orders (supplier_id,supplier_name,items,total,created_by) VALUES (?,?,?,?,?)', [supplierId||null, supplierName||'', JSON.stringify(items), total||0, req.user.username]);
    logAudit('purchase','Purchase order created',`Supplier: ${supplierName||'N/A'}`,req.user.username);
    res.status(201).json(formatPO(dbGet('SELECT * FROM purchase_orders WHERE id=?', [lastInsertId()])));
  });
  app.put('/api/purchase-orders/:id', authenticate, requireManager, (req,res) => {
    const o = dbGet('SELECT * FROM purchase_orders WHERE id=?', [req.params.id]);
    if(!o) return res.status(404).json({error:'Purchase order not found'});
    const {status,items,total,supplierName}=req.body;
    dbRun('UPDATE purchase_orders SET status=?,supplier_name=?,items=?,total=? WHERE id=?', [status||o.status, supplierName!==undefined?supplierName:o.supplier_name, items?JSON.stringify(items):o.items, total!==undefined?total:o.total, Number(req.params.id)]);
    res.json(formatPO(dbGet('SELECT * FROM purchase_orders WHERE id=?', [req.params.id])));
  });

  // Restocks
  app.get('/api/restocks', authenticate, (req, res) => {
    const { month } = req.query;
    if (month) {
      res.json(dbAll('SELECT * FROM restocks WHERE restock_month = ? ORDER BY timestamp DESC', [month]).map(formatRestock));
    } else {
      res.json(dbAll('SELECT * FROM restocks ORDER BY timestamp DESC').map(formatRestock));
    }
  });
  app.get('/api/restocks/months', authenticate, (req, res) => {
    const rows = dbAll("SELECT DISTINCT restock_month FROM restocks ORDER BY restock_month DESC");
    res.json(rows.map(r => r.restock_month));
  });
  app.post('/api/restocks', authenticate, requireManager, (req, res) => {
    const { productId, brand, carType, year, sidePart, quantityAdded, unitCost, totalCost, supplierName, supplierId, notes, timestamp } = req.body;
    if (!productId || !quantityAdded) return res.status(400).json({ error: 'Product ID and quantity added are required' });
    const costPerUnit = unitCost || 0;
    const totCost = totalCost || (quantityAdded * costPerUnit);
    // Use provided timestamp or default to now
    const ts = timestamp || new Date().toISOString();
    const month = ts.slice(0, 7);
    dbRun("INSERT INTO restocks (product_id,brand,car_type,year,side_part,quantity_added,unit_cost,total_cost,supplier_name,supplier_id,notes,created_by,timestamp,restock_month) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [productId, brand||'', carType||'', year||'', sidePart||'', quantityAdded, costPerUnit, totCost, supplierName||'', supplierId||null, notes||'', req.user.username, ts, month]);
    logAudit('inventory', `Restock recorded: ${brand||''} ${carType||''}`, `Quantity: ${quantityAdded}, Total Cost: ${totCost}${timestamp ? ', Date: ' + ts.slice(0,10) : ''}`, req.user.username);
    res.status(201).json(formatRestock(dbGet('SELECT * FROM restocks WHERE id=?', [lastInsertId()])));
  });
  app.get('/api/restocks/:id', authenticate, (req, res) => {
    const r = dbGet('SELECT * FROM restocks WHERE id=?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Restock not found' });
    res.json(formatRestock(r));
  });
  app.delete('/api/restocks', authenticate, requireManager, (req, res) => {
    const { month, all } = req.query;
    if (month) {
      const count = dbGet('SELECT COUNT(*) as c FROM restocks WHERE restock_month = ?', [month]);
      dbRun('DELETE FROM restocks WHERE restock_month = ?', [month]);
      logAudit('inventory', `Cleared restocks for ${month}`, `${count.c} records deleted`, req.user.username);
      res.json({ success: true, deleted: count.c, month });
    } else if (all === 'true') {
      const count = dbGet('SELECT COUNT(*) as c FROM restocks');
      dbRun('DELETE FROM restocks');
      logAudit('inventory', 'All restocks cleared', `${count.c} records deleted`, req.user.username);
      res.json({ success: true, deleted: count.c });
    } else {
      res.status(400).json({ error: 'Provide ?month=YYYY-MM or ?all=true query parameter' });
    }
  });
  app.delete('/api/restocks/:id', authenticate, requireManager, (req, res) => {
    const r = dbGet('SELECT * FROM restocks WHERE id=?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Restock not found' });
    dbRun('DELETE FROM restocks WHERE id=?', [Number(req.params.id)]);
    logAudit('inventory', `Restock deleted`, `ID: ${req.params.id}, Product: ${r.brand} ${r.car_type}`, req.user.username);
    res.json({ success: true });
  });
  app.put('/api/restocks/:id', authenticate, requireManager, (req, res) => {
    const existing = dbGet('SELECT * FROM restocks WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Restock not found' });
    const { productId, brand, carType, year, sidePart, quantityAdded, unitCost, totalCost, supplierName, supplierId, notes, timestamp } = req.body;
    const costPerUnit = unitCost !== undefined ? unitCost : existing.unit_cost;
    const totCost = totalCost || (quantityAdded * costPerUnit);
    const ts = timestamp || existing.timestamp;
    const month = ts.slice(0, 7);
    dbRun('UPDATE restocks SET product_id=?,brand=?,car_type=?,year=?,side_part=?,quantity_added=?,unit_cost=?,total_cost=?,supplier_name=?,supplier_id=?,notes=?,timestamp=?,restock_month=? WHERE id=?',
      [productId || existing.product_id, brand || existing.brand, carType || existing.car_type, year || existing.year, sidePart || existing.side_part,
       quantityAdded || existing.quantity_added, costPerUnit, totCost,
       supplierName !== undefined ? supplierName : existing.supplier_name, supplierId !== undefined ? supplierId : existing.supplier_id,
       notes !== undefined ? notes : existing.notes, ts, month, Number(req.params.id)]);
    logAudit('inventory', `Restock updated: ${existing.brand} ${existing.car_type}`, `ID: ${req.params.id}`, req.user.username);
    res.json(formatRestock(dbGet('SELECT * FROM restocks WHERE id=?', [req.params.id])));
  });

  // Audit
  app.get('/api/audit', authenticate, (req,res) => res.json(dbAll('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 200')));

  // Export
  app.get('/api/export', authenticate, requireManager, (req,res) => {
    const data = {
      exportedAt:new Date().toISOString(),
      inventory: dbAll('SELECT * FROM inventory ORDER BY name').map(formatItem),
      sales: dbAll('SELECT * FROM sales ORDER BY timestamp DESC').map(formatSale),
      customers: dbAll('SELECT * FROM customers ORDER BY name'),
      suppliers: dbAll('SELECT * FROM suppliers ORDER BY name'),
      purchaseOrders: dbAll('SELECT * FROM purchase_orders ORDER BY created_at DESC').map(formatPO),
      restocks: dbAll('SELECT * FROM restocks ORDER BY timestamp DESC').map(formatRestock),
      auditLog: dbAll('SELECT * FROM audit_log ORDER BY timestamp DESC'),
      users: dbAll('SELECT id,username,role,is_default,created_at FROM users ORDER BY created_at DESC')
    };
    res.setHeader('Content-Disposition',`attachment; filename="pos-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(data);
  });

  // Sync import
  app.post('/api/sync/import', authenticate, requireManager, (req,res) => {
    const {inventory:li,sales:ls,customers:lc,suppliers:lsup,purchaseOrders:lpo,restocks:lr,auditLog:la,users:lu}=req.body;
    const imp={inventory:0,sales:0,customers:0,suppliers:0,purchaseOrders:0,restocks:0,auditLog:0,users:0};
    dbTransaction(() => {
      if(Array.isArray(li)){for(const i of li){const brandName = i.brand || i.name || ''; const carTypeStr = i.carType || i.sku || `CT-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; db.run('INSERT OR IGNORE INTO inventory (name,sku,category,brand,car_type,year,side_part,price,cost,quantity,low_threshold,variants,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[brandName, carTypeStr, i.year || i.category || '', brandName, carTypeStr, i.year || i.category || '', i.sidePart || '', i.price||0, i.cost||0, i.quantity||0, i.lowThreshold||3, JSON.stringify(i.variants||[]), i.image||'']);imp.inventory++;}}
      if(Array.isArray(ls)){for(const sl of ls){db.run("INSERT OR IGNORE INTO sales (transaction_id,offline_id,items,subtotal,tax,total,payment_method,customer_name,created_by,timestamp,sync_status,payment_confirmed,needs_confirmation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",[sl.transactionId||`TXN-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,sl.offlineId||null,JSON.stringify(sl.items||[]),sl.subtotal||0,sl.tax||0,sl.total||0,sl.paymentMethod||'cash',sl.customerName||'',sl.createdBy||'imported',sl.timestamp||new Date().toISOString(),sl.syncStatus||'synced',sl.paymentConfirmed!==false?1:0,sl.needsConfirmation?1:0]);imp.sales++;}}
      if(Array.isArray(lc)){for(const c of lc){db.run('INSERT OR IGNORE INTO customers (name,email,phone) VALUES (?,?,?)',[c.name,c.email||'',c.phone||'']);imp.customers++;}}
      if(Array.isArray(lsup)){for(const s of lsup){db.run('INSERT OR IGNORE INTO suppliers (name,contact,email,phone) VALUES (?,?,?,?)',[s.name,s.contact||'',s.email||'',s.phone||'']);imp.suppliers++;}}
      if(Array.isArray(lpo)){for(const o of lpo){db.run('INSERT INTO purchase_orders (supplier_id,supplier_name,items,total,status,created_by,created_at) VALUES (?,?,?,?,?,?,?)',[o.supplierId||null,o.supplierName||'',JSON.stringify(o.items||[]),o.total||0,o.status||'pending',o.createdBy||'imported',o.createdAt||new Date().toISOString()]);imp.purchaseOrders++;}}
      if(Array.isArray(lr)){for(const r of lr){db.run('INSERT INTO restocks (product_id,brand,car_type,year,side_part,quantity_added,unit_cost,total_cost,supplier_name,supplier_id,notes,created_by,timestamp,restock_month) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[r.productId||null,r.brand||'',r.carType||'',r.year||'',r.sidePart||'',r.quantityAdded||0,r.unitCost||0,r.totalCost||0,r.supplierName||'',r.supplierId||null,r.notes||'',r.createdBy||'imported',r.timestamp||new Date().toISOString(),r.restockMonth||new Date().toISOString().slice(0,7)]);imp.restocks++;}}
      if(Array.isArray(la)){for(const a of la){db.run('INSERT INTO audit_log (type,title,details,created_by,timestamp) VALUES (?,?,?,?,?)',[a.type||'general',a.title||'',a.details||'',a.createdBy||'imported',a.timestamp||new Date().toISOString()]);imp.auditLog++;}}
      if(Array.isArray(lu)){for(const u of lu){db.run('INSERT OR IGNORE INTO users (username,password,role) VALUES (?,?,?)',[u.username,bcrypt.hashSync(u.password,10),u.role||'salesperson']);imp.users++;}}
    });
    logAudit('system','Data imported from localStorage',`Imported: ${JSON.stringify(imp)}`,req.user.username);
    res.json({success:true,imported:imp});
  });

  // ---- OFFLINE-MODE: Sync upload endpoint ----
  // Accepts pending offline sales and inventory changes from the client.
  app.post('/api/sync/upload', authenticate, (req, res) => {
    const { sales: pendingSales, inventory: pendingInventory } = req.body;
    const result = {
      uploaded: 0,
      syncedSales: [],
      conflicts: []
    };

    if (Array.isArray(pendingSales) && pendingSales.length > 0) {
      dbTransaction(() => {
        for (const sale of pendingSales) {
          // OFFLINE-MODE: Check if this offline sale was already synced
          const existing = sale.offlineId
            ? dbGet('SELECT id FROM sales WHERE offline_id = ?', [sale.offlineId])
            : dbGet('SELECT id FROM sales WHERE transaction_id = ?', [sale.transactionId]);

          if (existing) {
            // Already synced — skip
            result.syncedSales.push({
              localId: existing.id,
              serverId: existing.id,
              serverTransactionId: sale.transactionId
            });
            continue;
          }

          // OFFLINE-MODE: Check for inventory conflicts (negative stock after deduction)
          let hasConflict = false;
          let conflictReason = '';
          if (Array.isArray(sale.items)) {
            for (const item of sale.items) {
              const inv = dbGet('SELECT id, quantity FROM inventory WHERE id = ?', [item.id]);
              if (inv) {
                const newQty = inv.quantity - (item.quantity || 1);
                if (newQty < 0) {
                  hasConflict = true;
                  conflictReason = `Inventory went negative for item #${item.id} (${item.name || 'unknown'}). Needs manager review.`;
                  break;
                }
              }
            }
          }

          if (hasConflict) {
            // OFFLINE-MODE: Flag for manager review instead of applying
            result.conflicts.push({
              localId: sale.transactionId,
              transactionId: sale.transactionId,
              reason: conflictReason
            });
            // Still create the sale record but mark it
            const tid = sale.transactionId || `TXN-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
            dbRun(
              'INSERT INTO sales (transaction_id, offline_id, items, subtotal, tax, total, payment_method, customer_name, created_by, timestamp, sync_status, payment_confirmed, needs_confirmation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
              [tid, sale.offlineId || null, JSON.stringify(sale.items || []), sale.subtotal || 0, sale.tax || 0, sale.total || 0, sale.paymentMethod || 'cash', sale.customerName || '', sale.createdBy || req.user.username, sale.timestamp || new Date().toISOString(), 'failed', sale.paymentConfirmed !== false ? 1 : 0, sale.needsConfirmation ? 1 : 0]
            );
          } else {
            // OFFLINE-MODE: Deduct inventory and create sale
            if (Array.isArray(sale.items)) {
              for (const item of sale.items) {
                db.run("UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?", [item.quantity || 1, item.id]);
              }
            }
            const tid = sale.transactionId || `TXN-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
            dbRun(
              'INSERT INTO sales (transaction_id, offline_id, items, subtotal, tax, total, payment_method, customer_name, created_by, timestamp, sync_status, payment_confirmed, needs_confirmation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
              [tid, sale.offlineId || null, JSON.stringify(sale.items || []), sale.subtotal || 0, sale.tax || 0, sale.total || 0, sale.paymentMethod || 'cash', sale.customerName || '', sale.createdBy || req.user.username, sale.timestamp || new Date().toISOString(), 'synced', sale.paymentConfirmed !== false ? 1 : 0, sale.needsConfirmation ? 1 : 0]
            );
          }

          const newId = lastInsertId();
          result.syncedSales.push({
            localId: sale.offlineId || sale.transactionId,
            serverId: newId,
            serverTransactionId: sale.transactionId
          });
          result.uploaded++;
        }
      });
    }

    if (Array.isArray(pendingInventory) && pendingInventory.length > 0) {
      dbTransaction(() => {
        for (const item of pendingInventory) {
          const carTypeStr = item.carType || item.sku || '';
          const existing = dbGet('SELECT id FROM inventory WHERE car_type = ? OR sku = ?', [carTypeStr, carTypeStr]);
          if (existing) {
            dbRun('UPDATE inventory SET quantity = ?, price = ?, cost = ?, brand = ?, car_type = ?, year = ?, side_part = ?, updated_at = datetime(\'now\') WHERE id = ?', [item.quantity, item.price, item.cost, item.brand || item.name || '', carTypeStr, item.year || '', item.sidePart || '', existing.id]);
          }
        }
      });
    }

    logAudit('system', 'Sync upload processed', `Uploaded ${result.uploaded} sales, ${result.conflicts.length} conflicts`, req.user.username);
    res.json(result);
  });

  // ---- OFFLINE-MODE: Sync download endpoint ----
  // Returns all data modified since given timestamp.
  app.get('/api/sync/download', authenticate, (req, res) => {
    const since = req.query.since || '1970-01-01T00:00:00Z';

    const data = {
      inventory: dbAll('SELECT * FROM inventory').map(formatItem),
      sales: dbAll('SELECT * FROM sales WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 5000', [since]).map(formatSale),
      customers: dbAll('SELECT * FROM customers WHERE created_at >= ? ORDER BY name', [since]),
      suppliers: dbAll('SELECT * FROM suppliers WHERE created_at >= ? ORDER BY name', [since]),
      purchaseOrders: dbAll('SELECT * FROM purchase_orders WHERE created_at >= ? ORDER BY created_at DESC', [since]).map(formatPO),
      restocks: dbAll('SELECT * FROM restocks WHERE timestamp >= ? ORDER BY timestamp DESC', [since]).map(formatRestock),
      serverTime: new Date().toISOString()
    };

    res.json(data);
  });

  // Health
  app.get('/api/health', (req,res) => res.json({status:'ok',timestamp:new Date().toISOString()}));
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
function formatItem(r) {
  if (!r) return null;
  let v = []; try { v = JSON.parse(r.variants||'[]'); } catch(e) {}
  return {
    id:r.id,
    brand: r.brand || r.name || '',
    carType: r.car_type || r.sku || '',
    year: r.year || r.category || '',
    sidePart: r.side_part || '',
    price:r.price, cost:r.cost, quantity:r.quantity,
    lowThreshold:r.low_threshold, variants:v, image:r.image||''
  };
}
function formatSale(r) {
  if (!r) return null;
  let items=[]; try { items=JSON.parse(r.items||'[]'); } catch(e) {}
  return {
    id:r.id, transactionId:r.transaction_id, items, subtotal:r.subtotal, tax:r.tax, total:r.total,
    paymentMethod:r.payment_method, customerName:r.customer_name, createdBy:r.created_by, timestamp:r.timestamp,
    // OFFLINE-MODE: Include sync tracking fields
    syncStatus:r.sync_status || 'synced',
    offlineId:r.offline_id || null,
    paymentConfirmed:!!r.payment_confirmed,
    needsConfirmation:!!r.needs_confirmation
  };
}
function formatPO(r) {
  if(!r)return null;
  let items=[]; try{items=JSON.parse(r.items||'[]');}catch(e){}
  return { id:r.id, supplierId:r.supplier_id, supplierName:r.supplier_name, items, total:r.total, status:r.status, createdBy:r.created_by, createdAt:r.created_at };
}
function formatRestock(r) {
  if(!r)return null;
  return {
    id:r.id, productId:r.product_id,
    brand:r.brand, carType:r.car_type, year:r.year, sidePart:r.side_part,
    quantityAdded:r.quantity_added, unitCost:r.unit_cost, totalCost:r.total_cost,
    supplierName:r.supplier_name, supplierId:r.supplier_id,
    notes:r.notes, createdBy:r.created_by,
    timestamp:r.timestamp, restockMonth:r.restock_month
  };
}
function logAudit(type,title,details,createdBy) {
  dbRun('INSERT INTO audit_log (type,title,details,created_by) VALUES (?,?,?,?)', [type||'general',title||'',details||'',createdBy||'system']);
}

// ===========================================================================
// Start the server
// ===========================================================================
start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
# SYNC-STORE — Backend Server

Full-stack backend for the SYNC-STORE Point of Sale system.

## Architecture

- **Database**: SQLite (via `sql.js` — pure JavaScript, no native compilation needed)
- **API**: RESTful endpoints with JWT authentication
- **Frontend**: Served as static files from the `../pos` directory

## Getting Started

```bash
cd pos-server
npm install
npm start
```

The server will start on `http://localhost:3000` and automatically:
- Creates SQLite database tables on first run
- Seeds default users (`salesperson` / `sales123` and `manager` / `manager123`)
- Seeds 6 default inventory items
- Serves the frontend at `http://localhost:3000`

## Default Accounts

| Username     | Password    | Role        |
|-------------|-------------|-------------|
| salesperson | sales123    | Salesperson |
| manager     | manager123  | Manager     |

## Store Submission

For instructions on publishing this app to **Google Play Store** and **Microsoft Store**,
see the main guide at [`STORE-SUBMISSION-GUIDE.md`](../STORE-SUBMISSION-GUIDE.md).

> **Note:** The backend must be deployed to a public HTTPS URL before submitting to stores.

## API Endpoints

All endpoints except `/api/health` and `/api/auth/login` require a JWT Bearer token.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT token |
| POST | `/api/auth/verify` | Any | Verify token is valid |
| GET | `/api/health` | Public | Health check |
| GET | `/api/inventory` | Any | List all inventory |
| POST | `/api/inventory` | Manager | Add item |
| PUT | `/api/inventory/:id` | Manager | Update item |
| PATCH | `/api/inventory/:id/stock` | Any | Adjust stock (+/-) |
| DELETE | `/api/inventory/:id` | Manager | Delete item |
| GET | `/api/sales` | Any | List sales |
| POST | `/api/sales` | Any | Create sale (deducts stock) |
| GET | `/api/sales/report` | Any | Sales by period |
| GET/POST | `/api/customers` | Any | List / Add customers |
| PUT/DELETE | `/api/customers/:id` | Manager | Update / Delete customer |
| GET/POST | `/api/suppliers` | Any | List / Add suppliers |
| PUT/DELETE | `/api/suppliers/:id` | Manager | Update / Delete supplier |
| GET/POST | `/api/purchase-orders` | Manager | List / Add POs |
| PUT | `/api/purchase-orders/:id` | Manager | Update PO status |
| GET | `/api/audit` | Any | List audit log |
| GET | `/api/export` | Manager | Export all data as JSON |
| POST | `/api/sync/import` | Manager | Import localStorage → server |

## Configuration

Copy `.env.example` to `.env`:

```
PORT=3000
JWT_SECRET=your-secret-key-here
```

## Offline & PWA Support

The frontend is a fully offline-capable Progressive Web App (PWA):

- **Service Worker** (`pos/sw.js`) caches all static assets and API responses.
- **Offline Mode** — If the server is unreachable, the app loads from the service worker cache and uses `localStorage` for data.
- **Auto-Sync** — When connectivity is restored, the frontend automatically syncs local data with the server every 60 seconds.
- **Auto-Update** — The service worker checks for new versions every 30 minutes. When an update is detected, the user is prompted to refresh.
- **Installable** — The app can be installed on desktop/mobile via the browser's install prompt (PWA).

### How It Works

1. All data is saved to `localStorage` first (primary storage).
2. When the API is reachable, data is synced to the server in real-time.
3. On page load, if the API is reachable, fresh data is pulled from the server into `localStorage`.
4. When offline, the service worker serves cached static assets and API data.
5. When coming back online, background sync pushes local changes to the server and pulls the latest data.

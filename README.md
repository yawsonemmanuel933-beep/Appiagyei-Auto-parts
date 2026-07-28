# SYNC-STORE

A fully offline-capable Progressive Web App (PWA) for point-of-sale, inventory, and management.

## Features

- **Works Offline** — All static assets (HTML, CSS, JS) are cached by the service worker. Data is stored locally in `localStorage` and syncs to the server when online.
- **Auto-Sync** — When the internet comes back, the app automatically syncs local data with the server in the background (every 60 seconds).
- **Auto-Update** — The app checks for new versions every 30 minutes. When an update is found, a banner appears asking you to refresh.
- **PWA Installable** — Can be installed as a standalone app on desktop and mobile (look for "Install" in your browser menu).
- **Sales Dashboard** — Product catalog, shopping cart, checkout with receipt printing.
- **Manager Dashboard** — Full inventory management, suppliers, purchase orders, customers, audit logs, and sales reports.
- **Role-Based Access** — Salesperson and Manager roles with different views.
- **Data Persistence** — All data is saved in the browser's `localStorage` and synced to the SQLite backend when online.

## How to Run (Recommended — Full Backend)

For the best experience with data sync and multi-device support:

```bash
cd pos-server
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

### Default Accounts

| Username     | Password    | Role        |
|-------------|-------------|-------------|
| salesperson | sales123    | Salesperson |
| manager     | manager123  | Manager     |

## Desktop App (Windows Installer)

The POS system can be installed as a **standalone Windows desktop application** using Electron. This gives you a dedicated app with its own window, icon, and automatic server startup.

### Quick Start (Development)

```bash
cd pos-desktop
npm install
npm start
```

### Build Installer (.exe)

To create a Windows installer that you can distribute and install:

```bash
cd pos-desktop
npm run build:win
```

The installer will be created in `pos-desktop/dist/` as `SYNC-STORE-Setup-2.0.0.exe`.

You can also double-click **`pos-desktop/build-app.bat`** to build the installer with one click.

### How the Desktop App Works

1. The Electron app starts the Node.js backend server automatically in the background
2. It waits for the server to be ready, then opens the POS in its own window
3. When you close the app, the server shuts down automatically
4. Data is stored in SQLite (`pos-server/pos.db`) and synced with localStorage

### System Requirements

- **OS**: Windows 10 or later (64-bit)
- **RAM**: 512 MB minimum, 2 GB recommended
- **Storage**: ~150 MB for the installed app

## How to Run (Offline-Only Mode)

If you don't need the backend server, you can open the HTML files directly. The app will work with data stored in your browser:

1. Open `index.html` directly in your browser.
2. For the best experience, use a local web server:
   - **VS Code**: Install "Live Server", right-click `index.html` → "Open with Live Server"
   - **Python**: `python -m http.server 5500` then visit `http://localhost:5500`

> ⚠️ **Note:** Without the backend, authentication falls back to built-in accounts, and data sync between devices won't work. All data is stored locally in the browser.

## Offline Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌───────────────────────────────────────────┐  │
│  │     Service Worker (sw.js)                │  │
│  │  ┌────────────┐  ┌───────────────────┐   │  │
│  │  │ Static     │  │ API Cache         │   │  │
│  │  │ Cache      │  │ (Network-first)   │   │  │
│  │  │ (Cache-first) │                   │   │  │
│  │  └────────────┘  └───────────────────┘   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  localStorage (Primary data store)        │  │
│  │  - inventory, sales, customers, etc.      │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Auto-Sync Engine                         │  │
│  │  - Checks connectivity every 60s          │  │
│  │  - Syncs local → server when online       │  │
│  │  - Syncs server → local on reconnect      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
           ↕ (HTTP / REST API)
┌─────────────────────────────────────────────────┐
│           Node.js Backend (pos-server)           │
│  - Express.js REST API                          │
│  - SQLite database (sql.js)                     │
│  - JWT authentication                           │
└─────────────────────────────────────────────────┘
```

## Auto-Update Flow

1. Every 30 minutes, the service worker checks for a new version.
2. If a new version is found, it's downloaded in the background.
3. A banner appears: **"A new version is available!"** with **Refresh** and **Later** buttons.
4. Clicking **Refresh** activates the new service worker and reloads the page.

## Files

| File | Purpose |
|------|---------|
| `sw.js` | Service Worker — offline caching, auto-update, background sync |
| `manifest.json` | PWA manifest — enables installable app |
| `script.js` | Main application logic + sync engine |
| `api.js` | API layer — communication with backend |
| `style.css` | Styles incl. update banner and offline indicators |
| `index.html` | Welcome page |
| `login.html` | Login page |
| `salesperson.html` | Salesperson dashboard |
| `manager.html` | Manager dashboard |

## Hosting on the web

Deploy the `pos/` folder to any static host (GitHub Pages, Netlify, Vercel, etc.).  
For the backend, deploy `pos-server/` to a Node.js host (Railway, Render, Heroku, etc.).

## Reset

- To reset the app data, clear the browser's localStorage and caches for this site.
- Or run: `localStorage.clear(); caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));` in the console.

## Store Submission

This app is ready to be submitted to **Google Play Store** and **Microsoft Store**.

📖 See the full guide at [`STORE-SUBMISSION-GUIDE.md`](../STORE-SUBMISSION-GUIDE.md) for step-by-step instructions.

### Quick Links

| Store | Package Type | Build Tool |
|-------|-------------|------------|
| **Google Play Store** | Android AAB (TWA) | [`twa-setup/generate-android-app.bat`](../twa-setup/generate-android-app.bat) |
| **Microsoft Store** | Windows AppX (MSIX) | `cd pos-desktop && npm run build:win:store` |
| **Standalone Installer** | Windows .exe (NSIS) | `cd pos-desktop && npm run build:win` |

### Prerequisites

1. Deploy the app to a **public HTTPS URL** (see [Hosting on the web](#hosting-on-the-web))
2. Create developer accounts:
   - [Google Play Console](https://play.google.com/console/) ($25 one-time)
   - [Microsoft Partner Center](https://partner.microsoft.com/) ($19 one-time)
3. Prepare screenshots and a privacy policy (privacy policy provided at [`privacy.html`](privacy.html))

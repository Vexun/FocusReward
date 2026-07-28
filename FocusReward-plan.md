# FocusReward — System Plan

## 1 Purpose

FocusReward is a desktop application. It helps a user complete tasks. The user earns points for each completed task. The user can spend points to unlock blocked websites. A browser extension blocks the websites.

The system has three parts:

1. A desktop application.
2. A browser extension.
3. A local API server.

## 2 Technology Stack

| Component | Technology |
|-----------|------------|
| Desktop shell | Tauri v2 |
| API server | Axum (Rust) |
| Database | SQLite (rusqlite, bundled) |
| Frontend | Next.js (static export) |
| Browser extension | webextension-polyfill |

The desktop application runs on Linux and Windows.

The browser extension runs on Firefox and Chrome.

## 3 System Architecture

### 3.1 Component Diagram

```
Desktop Application (Tauri)
├── WebView (system window)
│   └── Next.js static frontend
├── API Server (Axum)
│   ├── SQLite database
│   └── Port scanner
└── Port: 127.0.0.1:{port}

Browser Extension
├── Port scanner
├── webRequest listener
└── Block page (focus.html)
```

### 3.2 Port Discovery

The system uses dynamic port discovery. No port value is stored in the source code.

The API server scans the port range 41000 to 41004. It binds to the first free port in this range.

The browser extension scans the same port range. It sends an HTTP GET request to `/api/health` on each port. The first successful response is the correct port. The extension stores this port in `storage.local`.

The extension re-checks the port every 60 seconds. If the health check fails, the extension scans again.

### 3.3 Communication

The frontend communicates with the API server through HTTP requests. The browser extension communicates with the API server through HTTP requests. Both use the dynamically discovered port.

All API requests go to `http://127.0.0.1:{port}/api/...`

## 4 Database Schema

### 4.1 Table: todos

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| title | TEXT | NOT NULL |
| difficulty | TEXT | NOT NULL, values: 'easy', 'medium', 'hard' |
| points | INTEGER | NOT NULL |
| completed | INTEGER | NOT NULL, DEFAULT 0 |
| completed_at | TEXT | nullable |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

### 4.2 Table: reward_sites

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| url | TEXT | NOT NULL, UNIQUE |
| name | TEXT | NOT NULL |
| is_preconfigured | INTEGER | NOT NULL, DEFAULT 0 |
| timed_cost | INTEGER | NOT NULL |
| timed_duration_minutes | INTEGER | NOT NULL, DEFAULT 30, CHECK (<= 1440) |
| icon | TEXT | nullable |

### 4.3 Table: unlock_sessions

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| site_id | TEXT | NOT NULL, REFERENCES reward_sites(id) |
| points_spent | INTEGER | NOT NULL |
| started_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| expires_at | TEXT | NOT NULL |
| active | INTEGER | NOT NULL, DEFAULT 1 |

### 4.4 Table: point_transactions

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| amount | INTEGER | NOT NULL |
| type | TEXT | NOT NULL, values: 'earned', 'spent' |
| todo_id | TEXT | nullable, REFERENCES todos(id) |
| unlock_session_id | TEXT | nullable, REFERENCES unlock_sessions(id) |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

## 5 Points System

### 5.1 Fixed Formula

Each task has a difficulty level. The difficulty level determines the point value.

| Difficulty | Points |
|------------|--------|
| Easy | 5 |
| Medium | 10 |
| Hard | 20 |

The user selects a difficulty when creating a task. The API calculates the points automatically.

### 5.2 Transaction Rules

- Completing a task creates an 'earned' transaction.
- Unlocking a site creates a 'spent' transaction.
- The balance is the sum of all earned amounts minus the sum of all spent amounts.
- A transaction is permanent. It cannot be reversed.

## 6 API Routes

### 6.1 Task Routes

| Method | Route | Action |
|--------|-------|--------|
| GET | /api/todos | List all tasks. Filter by completed status. |
| POST | /api/todos | Create a task. Request body: title, difficulty. |
| PATCH | /api/todos/{id}/complete | Mark a task as complete. Award points. |
| DELETE | /api/todos/{id} | Delete a task. |

### 6.2 Site Routes

| Method | Route | Action |
|--------|-------|--------|
| GET | /api/sites | List all reward sites. |
| POST | /api/sites | Add a custom site. Request body: url, name, timed_cost, timed_duration_minutes. |
| DELETE | /api/sites/{id} | Remove a custom site. Pre-configured sites cannot be removed. |

### 6.3 Unlock Routes

| Method | Route | Action |
|--------|-------|--------|
| POST | /api/unlock/timed | Start a timed unlock. Request body: site_id. Deduct points. Create unlock_session. |

If an active session for this site already exists, extend the session. The new expires_at value is:
```
max(current_expires_at, now) + timed_duration_minutes
```

### 6.4 Point Routes

| Method | Route | Action |
|--------|-------|--------|
| GET | /api/points/balance | Return current point balance. |
| GET | /api/points/history | Return recent point transactions. |

### 6.5 Extension Route

| Method | Route | Action |
|--------|-------|--------|
| GET | /api/extension/active-unlocks | Return list of URLs with active unlock sessions. Include expires_at. |

### 6.6 Health Route

| Method | Route | Action |
|--------|-------|--------|
| GET | /api/health | Return { "app": "focusreward" }. Used for port discovery. |

## 7 Pre-Configured Sites

| Site | URL | Cost (points) | Duration (minutes) |
|------|-----|---------------|--------------------|
| YouTube | youtube.com | 15 | 30 |
| Reddit | reddit.com | 10 | 30 |
| Twitter | twitter.com | 10 | 30 |
| Instagram | instagram.com | 10 | 30 |
| Twitch | twitch.tv | 15 | 30 |

The system seeds these sites into the database on first run.

## 8 Frontend Pages

### 8.1 Page: Task List (route: /)

This page shows all tasks. The user can:

- Create a new task with a title and difficulty selector.
- Mark a task as complete.
- Delete a task.

The page shows the current point balance.

### 8.2 Page: Rewards (route: /rewards)

This page shows all reward sites. Each site card shows:

- Site name and URL.
- Point cost per unlock.
- Duration per unlock.
- An "Unlock" button.

If an unlock session is active for a site, the card shows remaining time. The user can unlock the same site again to extend the time.

### 8.3 Page: History (route: /history)

This page shows:

- A list of point transactions (earned and spent).
- A list of active unlock sessions with remaining time.

### 8.4 Page: Settings (route: /settings)

This page lets the user add a custom reward site. Fields:

- Site name.
- Site URL.
- Point cost.
- Duration in minutes (maximum 1440).

## 9 Browser Extension

### 9.1 Technology

The extension uses Mozilla's webextension-polyfill. The same source code runs on Firefox and Chrome.

### 9.2 Port Discovery

The extension scans ports 41000 to 41004 on startup. It sends GET /api/health to each port. The first valid response gives the correct port. The extension stores the port in storage.local. It re-checks every 60 seconds.

### 9.3 Site Blocking

The extension registers a webRequest listener for onBeforeRequest.

For each navigation request:

1. Extract the domain from the URL.
2. Send GET /api/extension/active-unlocks.
3. If the domain is in the active list, allow the request.
4. If the domain is not in the active list, redirect to focus.html.

The extension uses the redirectUrl response from webRequest.

### 9.4 Block Page (focus.html)

The block page shows:

- The blocked site name.
- Current point balance.
- Point cost to unlock this site.
- An "Unlock" button.
- A link to open the dashboard.

The block page fetches data from the API server. It sends unlock requests through the background script.

### 9.5 Timed Unlock Flow

1. User clicks "Unlock" on the block page.
2. Block page sends a message to the background script.
3. Background script sends POST /api/unlock/timed to the API server.
4. API server creates or extends the unlock_session.
5. Background script returns the result to the block page.
6. Block page reloads or shows a success message.

On the next navigation event, the site is in the active list and the request is allowed.

## 10 Desktop Application

### 10.1 Startup Sequence

1. Tauri starts.
2. Rust main function runs.
3. Port scanner finds a free port in range 41000 to 41004.
4. API server starts on 127.0.0.1:{port}.
5. Database is opened. Migrations run. Seed data is inserted if the database is new.
6. Tauri opens the WebView window. The WebView loads http://127.0.0.1:{port}/.
7. System tray icon is shown (optional).

### 10.2 Shutdown Sequence

1. User closes the window or quits the app.
2. API server shuts down gracefully.
3. Database connection closes.
4. Process exits.

### 10.3 WebView

The WebView uses the operating system's native web renderer:

- Linux: WebKitGTK 4.1.
- Windows: WebView2.

The WebView loads the static frontend from the API server.

## 11 Build and Packaging

### 11.1 Linux

Build target: AppImage.

The AppImage contains all application dependencies. The user only needs:

- A C++ compiler (build-essential / base-devel).
- WebKitGTK 4.1 development libraries.
- librsvg2 development libraries.
- OpenSSL development libraries.

The user makes the AppImage executable and runs it. No installation is required.

Distro-specific install commands:

| Distro | Command |
|--------|---------|
| Debian/Ubuntu | apt install libwebkit2gtk-4.1-dev librsvg2-dev libssl-dev build-essential |
| Fedora | dnf install webkit2gtk4.1-devel librsvg2-devel openssl-devel gcc-c++ |
| Arch | pacman -S webkit2gtk-4.1 librsvg openssl base-devel |

### 11.2 Windows

Build target: NSIS installer.

The installer is signed with a code signing certificate. The signature reduces SmartScreen warnings.

The user runs the installer. The installer copies the application files and creates a shortcut.

### 11.3 Extension

Build target: unsigned .zip archive.

The archive contains the extension source files. The user loads the extension in developer mode:

- Firefox: about:debugging -> This Firefox -> Load Temporary Add-on.
- Chrome: chrome://extensions -> Load unpacked.

The extension can be submitted to the Firefox Add-ons store and Chrome Web Store for signed distribution.

## 12 Continuous Integration

### 12.1 GitHub Actions Workflow

Trigger: push to main branch, or release creation.

Matrix:

| OS | Runner | Output |
|----|--------|--------|
| Linux | ubuntu-latest | AppImage |
| Windows | windows-latest | Signed NSIS installer |

Steps:

1. Install dependencies.
2. Build Next.js frontend (static export).
3. Build extension (.zip).
4. Run cargo tauri build.
5. Sign Windows installer (signtool, cert from secrets).
6. Upload artifacts.

### 12.2 Secrets

The repository stores these secrets:

| Secret | Purpose |
|--------|---------|
| WINDOWS_CERT_BASE64 | Code signing certificate (Base64 encoded) |
| WINDOWS_CERT_PASSWORD | Certificate password |

## 13 Project Directory Structure

```
focusreward/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── config.rs
│   │   ├── models.rs
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   └── migrations.rs
│   │   └── api/
│   │       ├── mod.rs
│   │       ├── todos.rs
│   │       ├── sites.rs
│   │       ├── unlocks.rs
│   │       ├── points.rs
│   │       ├── extension.rs
│   │       └── health.rs
│   ├── migrations/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── frontend/
│   ├── pages/
│   │   ├── index.tsx
│   │   ├── rewards.tsx
│   │   ├── history.tsx
│   │   └── settings.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── next.config.js
│   └── package.json
├── extension/
│   ├── manifest.json
│   ├── config.js
│   ├── background.js
│   ├── focus.html
│   ├── focus.js
│   ├── icons/
│   └── webextension-polyfill.js
└── README.md
```

## 14 Implementation Phases

### Phase 1: Rust Backend

- Create Cargo.toml with dependencies (tauri, axum, rusqlite, serde, tokio, tower-http).
- Implement port scanner in config.rs.
- Implement database layer with migrations and seed data.
- Implement all API route handlers.

### Phase 2: Frontend

- Create Next.js project with static export configuration.
- Implement API client library (api.ts).
- Implement all four pages.
- Build static output.

### Phase 3: Tauri Integration

- Configure tauri.conf.json for AppImage and NSIS targets.
- Wire Tauri to start Axum server and open WebView to the correct port.

### Phase 4: Extension

- Create manifest.json for Firefox (manifest v2) and Chrome (manifest v3 via polyfill).
- Implement port scanner.
- Implement webRequest blocking logic.
- Implement focus.html with mini dashboard.

### Phase 5: CI/CD

- Create GitHub Actions workflow.
- Test builds on Linux and Windows.
- Configure Windows code signing.

### Phase 6: Documentation

- Write README.md with build and install instructions for both platforms.

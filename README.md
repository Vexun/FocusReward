# FocusReward

Earn points by completing tasks. Spend points to unblock websites.

## What It Does

The system has three parts:

- A desktop application.
- A browser extension.
- A local API server.

The desktop application shows your tasks and your reward sites. The browser extension blocks websites that distract you. The API server stores your data and connects the two parts.

## How It Works

1. Create a task. Choose a difficulty: easy, medium, or hard.
2. Complete the task. You earn points.
3. Spend points to unlock a reward site for a time limit.
4. The extension allows the site until the time runs out.
5. When the time runs out, the extension blocks the site again.

### Point values

| Difficulty | Points |
|------------|--------|
| Easy | 5 |
| Medium | 10 |
| Hard | 20 |

### Pre-configured sites

| Site | Cost (points) | Duration (minutes) |
|------|---------------|--------------------|
| YouTube | 15 | 30 |
| Reddit | 10 | 30 |
| Twitter | 10 | 30 |
| Instagram | 10 | 30 |
| Twitch | 15 | 30 |

You can add custom sites in the Settings page. Each custom site needs a URL, name, points cost, and unlock duration.

## Requirements

### Linux

Make sure these packages are installed:

| Distro | Command |
|--------|---------|
| Debian / Ubuntu | `apt install libwebkit2gtk-4.1-dev librsvg2-dev libssl-dev build-essential` |
| Fedora | `dnf install webkit2gtk4.1-devel librsvg2-devel openssl-devel gcc-c++` |
| Arch | `pacman -S webkit2gtk-4.1 librsvg openssl base-devel` |

You also need Rust and Node.js.

### Windows

Make sure you have:

- WebView2 runtime (included in Windows 11 and recent Windows 10 updates).
- Microsoft Visual Studio C++ build tools.
- Rust and Node.js.

## Build Instructions

### Step 1: Build the frontend

```
cd frontend
npm install
npm run build
```

The static files are written to `frontend/out/`.

### Step 2: Build the desktop application

```
cd src-tauri
cargo tauri build
```

The output is in `src-tauri/target/release/bundle/`.

On Linux, the output is an AppImage file. On Windows, the output is an NSIS installer.

## Run for Development

```
cd src-tauri
cargo run
```

The application starts. The API server finds a free port between 41000 and 41004. The window opens to the correct address.

## Extension Setup

1. Open `about:debugging` in Firefox or `chrome://extensions` in Chrome.
2. Enable Developer mode.
3. Click "Load Temporary Add-on" (Firefox) or "Load unpacked" (Chrome).
4. Select the `extension/` directory.

The extension starts. It scans ports 41000 to 41004 on `127.0.0.1` and stores the correct port.

### Pairing

Before the extension can block or unlock sites, it must be paired with the desktop app:

1. Open the desktop app and go to the **Settings** page.
2. Click **Generate Pin** — a 6-digit code appears.
3. Click the extension icon in your browser toolbar.
4. If the extension is not paired, it shows a PIN input. Enter the 6-digit code and click **Pair**.
5. On success, the extension is paired. It now fetches your reward sites and active unlocks.

The PIN expires after 60 seconds. If it expires, generate a new one.

Pairing persists across app restarts. The access token is stored in a file alongside the database and loaded automatically on startup.

### Resetting the access token

If you believe your token has been exposed, or want to unpair all previously connected extensions:

1. Open the desktop app and go to the **Settings** page.
2. Click **Reset Access Token** at the bottom of the page.
3. Confirm the action. The old token is immediately invalidated.
4. Pair each extension again using the PIN flow.

All previously paired extensions will fail to authenticate on their next request and must be re-paired. This signs out all paired extensions at once — there is no per-device revocation.

### Block page

When you visit a blocked reward site, the extension redirects you to a block page showing:

- The site name
- Your current points balance
- The unlock cost
- An **Unlock** button (disabled if you don't have enough points)

Clicking **Unlock** spends the points and allows the site for the configured duration. The page closes automatically after 2 seconds and the site becomes accessible.

### Extension popup

Click the extension icon to open the popup. It shows your current points balance. If the extension is not paired, it shows the pairing interface instead.

## Configuration

Set these environment variables to change default paths:

| Variable | Purpose |
|----------|---------|
| `FOCUSREWARD_DATA_DIR` | Directory for the SQLite database and token file. Default is the current directory. |
| `FOCUSREWARD_FRONTEND_DIR` | Directory for the frontend static files. Default is `../frontend/out`. |

## Project Structure

```
FocusReward/
  src-tauri/        Rust source code for the desktop application and API server.
  frontend/         Next.js source code for the user interface.
  extension/        Browser extension source code.
```

## License

Not licensed for public use.
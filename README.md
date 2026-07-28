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

You can add custom sites in the Settings page.

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

The extension starts. It scans ports 41000 to 41004 on `127.0.0.1`. It stores the correct port.

## Configuration

Set these environment variables to change default paths:

| Variable | Purpose |
|----------|---------|
| `FOCUSREWARD_DATA_DIR` | Directory for the SQLite database file. Default is the current directory. |
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

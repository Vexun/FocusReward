# FocusReward Browser Extension

The browser extension blocks distracting websites. You control the extension with the FocusReward desktop application.

## How It Works

1. The extension scans ports 41000 to 41004 on your computer. It sends a request to `/api/health` on each port. The first valid response gives the correct port. The extension stores this port.

2. When you visit a website, the extension checks if the site has an active unlock session. It does this by calling the API server.

3. If the site is unlocked, the extension allows the request.

4. If the site is blocked, the extension redirects you to a block page. The block page shows your point balance and an "Unlock" button.

5. The extension re-checks the port every 60 seconds.

## Install

### Firefox

1. Open `about:debugging`.
2. Click "This Firefox".
3. Click "Load Temporary Add-on".
4. Select the `manifest.json` file.

### Chrome

1. Open `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked".
4. Select the extension directory.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Manifest V2). |
| `config.js` | Port scanner for the API server. |
| `background.js` | Web request listener and blocker. |
| `focus.html` | Block page template. |
| `focus.js` | Block page logic. |
| `webextension-polyfill.js` | Compatibility layer for Chrome and Firefox. |
| `icons/` | Extension icons. |

## Note on Manifest V2

This extension uses Manifest V2. Chrome is deprecating Manifest V2. For long-term Chrome support, migrate to Manifest V3 with `declarativeNetRequest`. Firefox continues to support Manifest V2.

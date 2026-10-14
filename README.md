# Shortlinks Skipper

A cross-browser Manifest V3 extension that automatically skips shortlink / safelink pages and jumps straight to the final destination.

It handles the boring parts of the unlock flow for you: it clears the "Too Early" lock, waits out shortener timers, clicks the Get Link / Continue button, and follows the redirect to the real file — without leaving you on ad interstitials.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4f46e5)
![Browsers](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Firefox-supported-16a34a)

## Features

- Automatically skips WP Safelink pages and common shortener unlock flows
- Handles **"Too Early"** gates by polling for the unlock to become available, with a reload fallback
- Waits out and clicks the **Get Link / Continue / Proceed** button
- Redirects immediately to the final destination as soon as a link is available
- Full-screen **"Skipping…"** overlay while work is in progress
- Runs only on relevant pages (shorteners / safelink / too-early gates) — it stays out of the way everywhere else
- Cross-browser: **Chrome, Edge, and Firefox** (MV3)
- Per-site control from the popup: enable/disable toggle, whitelist, and blacklist

## Supported Sites / Patterns

- **Shortener hosts:** `shortxlinks`, `adlinkfly`, `gplinks`, `shrinkme`, `shrinkearn`, `mdiskshortner`, `try2link`, `tnlink`, `rocklinks`, `dropgalaxy`
- **WP Safelink:** `#wpsafe-generate`, `#wpsafe-link`, `safelink_redirect`, `wpsafegenerate()`
- **Too-early / not-ready gates:** e.g. "Whoops, you're too early", "URL isn't ready yet"
- Generic Get Link / Continue / Proceed button on the above hosts

## Installation

### Chrome / Edge (Load unpacked)

1. Download or clone this repo.
2. Open the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Pin the extension if you like.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json`.

Requires Firefox **121+** (Manifest V3).

### Prebuilt package

`shortlinks_skipper_firefox.zip` is included in the repo. It contains the same files and works on Chrome, Edge, and Firefox.

## Usage

Click the toolbar icon to open the popup:

- **Toggle** — enable or disable the extension globally.
- **Current site card** — shows the active host and whether skipping is active, paused, or not whitelisted.
  - **Always skip here** — removes the current domain from the blacklist.
  - **Never skip here** — adds the current domain to the blacklist.
- **Whitelist** — if not empty, the extension runs *only* on these domains (and their subdomains).
- **Blacklist** — the extension never runs on these domains (takes precedence).
- **Save** — persists your lists. Changes apply to open tabs immediately.

One domain per line. Subdomains are matched automatically (e.g. `example.com` also matches `sub.example.com`).

## How It Works

1. A content script runs on every page and quickly decides whether the page is a target (shortener host with a path, a WP Safelink page, or a "too early" gate). If not, it does nothing.
2. On a target page it shows the "Skipping…" overlay and starts a single, watchdog-guarded loop.
3. On shortener pages it **only** interacts with the Get Link / Continue / Proceed control — it never follows arbitrary `window.open` links, which avoids being redirected to ads. The best candidate is chosen by priority (Get Link first, then Continue/Proceed, then generic).
4. On "Too Early" pages it marks the session and polls until the unlock is ready, reloading as a last resort.
5. On WP Safelink pages it triggers generation and follows the safelink redirect.
6. The loop stops as soon as the page navigates away, so the final destination is never touched.

## Files

```
manifest.json   Manifest V3 definition (Chrome/Edge + Firefox)
content.js      Page detection, skip logic, overlay
background.js   Cross-browser service worker / background script
popup.html      Popup UI
popup.js        Popup logic (settings + current tab)
icons/          icon16.png, icon48.png, icon128.png
```

## Development

- No build step. Edit files and reload the extension:
  - Chrome/Edge: click the reload icon on the extension card.
  - Firefox: click **Reload** under the temporary add-on.
- Syntax check helper:

  ```bash
  node --check content.js && node --check popup.js && node --check background.js
  node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"
  ```

- Rebuild the distributable zip:

  ```bash
  zip -r shortlinks_skipper_firefox.zip manifest.json content.js background.js popup.html popup.js icons README.md
  ```

## Notes & Limitations

- Some sites combine shorteners with captcha/anti-bot challenges; those always require a human step and cannot be skipped.
- If a shortener changes its markup, the selectors may need updating. The skip loop is written to be tolerant of dynamic (JS-rendered) steps.
- Use responsibly and in line with the terms of the sites you visit.

## License

MIT

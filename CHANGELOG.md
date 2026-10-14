# Changelog

All notable changes to this project are documented here.

## [1.1.0] - 2026-10-14

### Fixed
- Shortener pages no longer follow arbitrary `window.open` anchors, which could redirect to ads instead of the destination.
- Removed the duplicate synthetic `click` in `clickElement` that fired handlers twice.
- Added a pending-navigation guard (`pagehide`/`beforeunload`) so clicks stop once a page is leaving.
- Narrowed `findFinal` to WP Safelink containers/redirect anchors to avoid false matches.

### Added
- Captcha / anti-bot detection: the skip loop pauses and asks the user to complete verification.
- Single-flight `running` guard and a debounced `MutationObserver` (no attribute watching).
- Overlay status line, ESC / "show page" dismiss, and clear give-up messages.
- Popup: "Always skip here" now writes to the whitelist, "Never skip here" to the blacklist.
- Popup: reset-to-defaults, export/import of settings, and a `storage.sync` size guard with error messages.
- Shared pure helpers in `utils.js` with `node --test` unit tests.
- `LICENSE` (MIT), `CHANGELOG.md`, and a `package.json` test script.

### Changed
- Reduced manifest permissions: removed broad `host_permissions` and the unused `scripting` permission.
- Relaxed `isEarlyPage` detection to avoid false positives on real shortener pages.

## [1.0.0] - 2026-10-14

### Added
- Initial MV3 extension: WP Safelink and shortener host support, "Too Early" handling, "Skipping…" overlay, popup with enable toggle, whitelist, and blacklist.
- Cross-browser support for Chrome, Edge, and Firefox.

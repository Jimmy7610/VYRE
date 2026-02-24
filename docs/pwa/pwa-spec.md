# VYRE PWA Specification

## Intent
VYRE is a web-first application built to behave seamlessly like a native application while maintaining strictly enforced security and performance boundaries.

## Installability Requirements
To ensure cross-platform installability (iOS Add-to-Homescreen, Android Chrome APK generation, Desktop Edge/Chrome installation):
- Application must be served purely over HTTPS.
- Must include a valid `manifest.json`.
- Must register a functioning Service Worker with a `fetch` event handler.
- Core UI must be fully responsive (mobile-first, explicitly handling notched devices via `safe-area-inset`).

## Web App Manifest Fields
The `manifest.json` must enforce a dark-mode only, app-like experience.

- `short_name`: "VYRE"
- `name`: "VYRE"
- `start_url`: "/?source=pwa"
- `display`: `standalone` (Removes browser chrome completely)
- `background_color`: `#000000` (Strictly black to prevent white flashing on launch)
- `theme_color`: `#000000` (Controls the OS status bar)
- `orientation`: `portrait-primary` (For initial launch stabilization on mobile)
- `icons`: Comprehensive array of maskable icons (192px to 512px).

## Service Worker Strategy (VERY Conservative)
Given the security-first nature of VYRE, the Service Worker must prioritize freshness and data compartmentalization over aggressive offline capabilities. 

### Strategy by Route/Type
1. **Application Shell (HTML/CSS/JS bundles):** `Stale-While-Revalidate`. Ensures instant app boot while silently upgrading the shell in the background.
2. **Static Assets (Fonts, Logos):** `Cache-First` with long expiration terms.
3. **API Requests (JSON/Data):** `Network-Only`. **Absolutely no caching of user data** at the Service Worker level to prevent cross-session leakage and state staleness.

## Caching Rules
- **ALLOWED:** Application logic (`.js`), stylesheets (`.css`), structural images (`.png`, `.svg` used in the UI shell), fonts.
- **FORBIDDEN:** 
  - User-generated media (avatars, post images) must not be permanently cached by the SW (allow standard browser heuristic caching instead).
  - JSON payloads containing PII, feeds, settings, or private messages.
  - JWTs, CSRF tokens, or any authentication material must never touch the Cache Storage API.

## Update Strategy
- The Service Worker will actively listen for the `install` event but will **not** automatically `skipWaiting()`.
- When a new Service Worker is waiting, the application UI will detect a state change and display a non-intrusive toast: "A new version of VYRE is available. [Refresh]".
- Clicking Refresh will send a `postMessage` command instructing the new SW to safely claim the clients, followed by an immediate `window.location.reload()`.

## Explicit Security Warnings
- **No HTML Caching for Private Routes:** Never cache the raw HTML of `index.html` if it contains inline hydration states for the authenticated user.
- **Cache Poisoning Prevention:** The Service Worker must explicitly ignore query parameters for shell caching (`ignoreSearch: true`) to mitigate cache-busting poisoning vectors.
- **Logout Clearing:** Upon triggering the `/logout` flow, the client must explicitly call `caches.keys().then(...)` to aggressively purge the Service Worker Cache Storage, ensuring no remnants of the shell persist if the device is handed to another user.

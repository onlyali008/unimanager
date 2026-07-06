# Packaging — desktop (Tauri) and mobile (Capacitor)

## Architecture

Semestra is a Next.js **server** (API routes + filesystem vault + local
Ollama), so packaging works differently per platform:

- **Desktop (Tauri)** — the real thing. The installer bundles the whole
  Next.js app as a standalone Node server; the Tauri shell starts it on
  `127.0.0.1:3210` and opens a native window on it. Vault, Ollama, and
  Garmin sync all work because they run on the same machine.
- **Mobile (Capacitor)** — a thin client. Your phone can't host the vault,
  so the app is a native wrapper that connects to the Semestra server
  running on your computer (same Wi-Fi, or Tailscale once Phase 6 is set
  up). It asks for the server address once and reconnects automatically.

## Desktop

Prerequisites (this machine already has all three): Rust (`rustup`),
MSVC C++ Build Tools, Node.js on PATH — the packaged app spawns `node`
from PATH to run the bundled server.

```powershell
npm run tauri dev      # dev: wraps `next dev` in the native window
npm run tauri build    # release: NSIS installer under src-tauri/target/release/bundle/nsis/
```

`tauri build` runs `npm run build:desktop` first, which produces
`.next/standalone` (server + static assets + **a copy of your
`.env.local`**). Heads-up: that means the installer contains your API
keys and vault path — fine for personal use, but don't share the
installer file.

The installed app still expects **Ollama running locally** for AI
features (chat degrades gracefully without it) and uses the same vault
path from `.env.local`.

## Mobile (Android)

The project under `android/` is a complete Capacitor app whose web shell
(`mobile-shell/`) is a connect screen: enter
`http://<your-pc>:3000` (LAN IP or Tailscale name), it verifies the
server is reachable, remembers it, and loads the app. Changing servers
doesn't require a rebuild — clear it by long-pressing back to the
connect screen and entering a new address.

**Building the APK needs tools this machine doesn't have yet:**

1. Install [Android Studio](https://developer.android.com/studio) (brings
   the SDK + JDK).
2. `npx cap open android` → Android Studio opens the project → Build >
   Build APK, or run on a connected phone with USB debugging.
3. After changing `mobile-shell/` or `capacitor.config.ts`, run
   `npx cap sync android` before rebuilding.

Notes:
- The server must be reachable from the phone: `npm run dev` (or the
  desktop app, which listens on 127.0.0.1 only — for phone access run
  `next dev -H 0.0.0.0` or wait for the Phase 6 Tailscale setup, which
  is the proper answer for both home and away).
- Traffic is plain HTTP on your private network (`cleartext: true`);
  Tailscale encrypts it end-to-end when you go through it.
- iOS requires a Mac with Xcode (`npm i @capacitor/ios && npx cap add ios`
  there); the icon set for it is already generated under
  `src-tauri/icons/ios/`.

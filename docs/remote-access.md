# Remote access — Tailscale + login

Reach Semestra from your phone or laptop anywhere, without exposing
anything to the public internet.

## 1. Turn on login (do this first)

Once the app listens beyond `127.0.0.1`, anyone on the same network can
reach your vault — so configure auth before exposing it:

```powershell
node scripts/set-password.mjs "choose-a-long-password"
```

Paste the printed `AUTH_PASSWORD_HASH` and `AUTH_SECRET` into
`.env.local`, add `AUTH_EMAIL=you@example.com`, restart the server.
Every page and API now requires signing in (30-day session).

**Email verification (second step):** add SMTP settings and each login
also requires a 6-digit code sent to your email:

```
SMTP_HOST="smtp.gmail.com"      # e.g. Gmail with an app password
SMTP_PORT="587"
SMTP_USER="you@gmail.com"
SMTP_PASS="<app password>"
SMTP_FROM="Semestra <you@gmail.com>"
```

Without SMTP config, login is password-only and the app still works.
(Outlook/Hotmail personal accounts have mostly disabled SMTP app
passwords; a Gmail app password — Google Account → Security → 2-Step
Verification → App passwords — is the easiest free option.)

## 2. Tailscale on both devices

1. Install [Tailscale](https://tailscale.com/download) on the PC and on
   your phone; sign both into the same (free) tailnet.
2. On the PC, the recommended setup is `tailscale serve`, which proxies
   your tailnet to the locally-running app **with HTTPS** and keeps the
   app itself bound to localhost:

   ```powershell
   npm run dev            # or: npm run build; npm start
   tailscale serve --bg 3000
   tailscale serve status # shows your URL, e.g. https://your-pc.tailXXXX.ts.net
   ```

3. On the phone (Tailscale app connected): open that URL in the browser,
   or enter it in the Semestra Android app's connect screen. Sign in —
   done. Works from any network; traffic is end-to-end encrypted.

Alternative without `tailscale serve`: run `npx next dev -H 0.0.0.0` and
use `http://<tailscale-ip>:3000`. This also answers on your LAN, which
is exactly why step 1 exists.

## 3. What still runs where

Everything heavy stays on the PC — the phone is just a screen:

| Piece | Location | Remote impact |
| --- | --- | --- |
| Vault (markdown) | PC disk | none — server reads it locally |
| Ollama (tagging/insights/retrieval) | PC `localhost:11434` | none — called server-side |
| USDA + Claude APIs | outbound from PC | none |
| Garmin sync | outbound from PC | none |
| Scheduled AI jobs (`docs/ai-jobs.md`) | PC Task Scheduler → localhost | none |

Localhost audit (Phase 6 requirement): all browser-side fetches use
relative URLs, so they work under any origin — nothing client-side
hardcodes localhost. The two deliberate exceptions: the **Tauri desktop
app** binds `127.0.0.1:3210` by design (it is not your remote server —
run the dev/prod server for that), and the session cookie doesn't set
`Secure` so it works over both LAN HTTP and Tailscale HTTPS.

## 4. Ground rules

- Don't port-forward Semestra on your router. Tailscale only.
- The `.env.local` (and the desktop installer that embeds it) contains
  your API keys and now your auth secret — keep both off shared drives.
- If you ever suspect the password leaked: rerun `set-password.mjs`
  (new hash **and** new AUTH_SECRET invalidates every existing session).

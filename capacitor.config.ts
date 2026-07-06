import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The mobile app is a thin client: the vault, Ollama, and the Next.js
 * server all live on your computer, so the phone connects to it over
 * your LAN or Tailscale. The bundled shell (mobile-shell/) asks for the
 * server address once, remembers it, and reconnects automatically.
 */
const config: CapacitorConfig = {
  appId: "com.semestra.mobile",
  appName: "Semestra",
  webDir: "mobile-shell",
  server: {
    // The Semestra server runs plain http on the LAN/Tailscale.
    androidScheme: "http",
    cleartext: true,
  },
};

export default config;

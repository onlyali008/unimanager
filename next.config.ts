import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor the workspace root so stray lockfiles elsewhere (e.g. git
  // worktrees) don't confuse Turbopack's root inference.
  turbopack: {
    root: path.join(__dirname),
  },
  // The desktop (Tauri) build bundles the app as a self-contained Node
  // server. Regular `next dev` / `next start` are unaffected.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
};

export default nextConfig;

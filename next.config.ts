import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor the workspace root so stray lockfiles elsewhere (e.g. git
  // worktrees) don't confuse Turbopack's root inference.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

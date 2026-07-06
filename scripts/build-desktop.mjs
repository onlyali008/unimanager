/**
 * Builds the self-contained server bundle the Tauri desktop app ships:
 *   1. `next build` with output: "standalone"
 *   2. copy static assets + public/ into the standalone tree
 *   3. copy .env.local so the packaged server sees the same config
 *
 * Result: `.next/standalone` runs with just `node server.js`.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

console.log("Building Next.js standalone bundle...");
execSync("npx next build", {
  stdio: "inherit",
  env: { ...process.env, BUILD_STANDALONE: "1" },
});

if (!existsSync(standalone)) {
  console.error("No .next/standalone output — did the build fail?");
  process.exit(1);
}

console.log("Copying static assets...");
cpSync(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true },
);
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), {
    recursive: true,
  });
}

const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  copyFileSync(envFile, path.join(standalone, ".env.local"));
  console.log("Copied .env.local into the bundle (vault path + API keys).");
} else {
  console.warn("No .env.local found — the desktop app will use defaults.");
}

console.log("Standalone bundle ready at .next/standalone");

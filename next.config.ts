import type { NextConfig } from "next";

// Static export: `next build` emits a fully static `out/` folder that can be
// hosted anywhere (Netlify, Vercel, GitHub Pages, S3, a USB stick). The app is
// entirely client-rendered and local-first, so no server is needed.
//
// For a sub-path host like GitHub Pages (https://user.github.io/<repo>/), set
// NEXT_PUBLIC_BASE_PATH=/<repo> at build time. Left unset for root hosting and
// local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
};

export default nextConfig;

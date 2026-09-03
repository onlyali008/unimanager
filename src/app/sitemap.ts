import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/courses", "/calendar", "/progress", "/settings"].map(
    (path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
    }),
  );
}

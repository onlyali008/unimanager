import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    "",
    "/courses",
    "/calendar",
    "/timer",
    "/progress",
    "/assistant",
    "/settings",
  ].map(
    (path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
    }),
  );
}

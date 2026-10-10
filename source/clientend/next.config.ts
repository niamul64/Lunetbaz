import type { NextConfig } from "next";

/** Hosts allowed to serve product/shop images through next/image (CDN / object storage). */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "cdn.lunetbuz.com").split(",").map((h) => h.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * Server cache lifetimes for `"use cache"` reads (seconds).
   *   stale      – how long the browser router reuses a page without asking the server
   *   revalidate – after this, the next request is served stale and refreshed in the background
   *   expire     – after this with no traffic, the next request waits for fresh data
   * Time-based refresh is only the safety net: the backend invalidates tags on
   * events (product.updated, campaign.started, …) via POST /api/revalidate.
   */
  cacheLife: {
    /** Home page & listings: change often (campaigns, stock, new products). */
    storefront: { stale: 60, revalidate: 120, expire: 3_600 },
    /** Product detail: invalidated on edit, so a longer safety net is fine. */
    product: { stale: 60, revalidate: 300, expire: 86_400 },
    /** Campaign pages: start/end times flip prices, keep the window short. */
    campaign: { stale: 30, revalidate: 60, expire: 900 },
    /** Categories, shop profiles: rarely change. */
    reference: { stale: 300, revalidate: 3_600, expire: 86_400 },
  },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https", hostname })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

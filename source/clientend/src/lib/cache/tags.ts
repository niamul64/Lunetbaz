/**
 * Server cache tag taxonomy (Next.js `cacheTag` / `revalidateTag`).
 *
 * Every cached read is tagged with a *specific* tag (one entity) and the
 * *collection* tags it belongs to, so the backend can invalidate precisely:
 *
 *   product.updated   → product:<slug>, shop:<shopSlug>
 *   price/stock change→ product:<slug>                     (listings re-read on their own short TTL)
 *   campaign.started  → campaign:<slug>, products, home     (campaign prices appear everywhere)
 *   category changed  → categories
 *   banner changed    → home
 *
 * Keep this file the single source of truth; the backend's cache-invalidation
 * worker should send exactly these strings to POST /api/revalidate.
 */
export const cacheTags = {
  home: "home",
  categories: "categories",
  products: "products",
  campaigns: "campaigns",
  product: (slug: string) => `product:${slug}`,
  shop: (slug: string) => `shop:${slug}`,
  campaign: (slug: string) => `campaign:${slug}`,
} as const;

/** Tags the revalidation endpoint accepts (exact names or `<prefix>:<slug>`). */
const STATIC_TAGS = new Set<string>([cacheTags.home, cacheTags.categories, cacheTags.products, cacheTags.campaigns]);
const DYNAMIC_PREFIXES = ["product:", "shop:", "campaign:"];

export function isValidCacheTag(tag: string) {
  if (tag.length > 256) return false;
  if (STATIC_TAGS.has(tag)) return true;
  return DYNAMIC_PREFIXES.some((p) => tag.startsWith(p) && /^[a-z0-9-]+$/.test(tag.slice(p.length)));
}

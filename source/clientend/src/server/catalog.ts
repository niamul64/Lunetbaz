/**
 * Cached server-side reads for public storefront pages (SEO-critical).
 *
 * They call the same service layer as the browser, so they hit the NestJS API
 * once NEXT_PUBLIC_API_MODE=http. Lifetimes come from the named profiles in
 * next.config.ts; tags come from src/lib/cache/tags.ts and are invalidated
 * on demand by the backend through POST /api/revalidate.
 *
 * Only public, user-independent data may be cached here. Anything that
 * depends on the signed-in user is fetched in the browser instead.
 */
import { cacheLife, cacheTag } from "next/cache";
import { isApiError } from "@/lib/api/errors";
import { cacheTags } from "@/lib/cache/tags";
import { storeService } from "@/services/store.service";

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

export async function getHome() {
  "use cache";
  cacheLife("storefront");
  cacheTag(cacheTags.home, cacheTags.products, cacheTags.campaigns, cacheTags.categories);
  return storeService.home();
}

export async function getCategories() {
  "use cache";
  cacheLife("reference");
  cacheTag(cacheTags.categories);
  return storeService.categories();
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("product");
  cacheTag(cacheTags.product(slug));
  const product = await orNull(storeService.product(slug));
  // Shop edits (name, rating, suspension) and campaign price changes must refresh this page too.
  if (product) cacheTag(cacheTags.shop(product.shop.slug), ...product.offers.map((o) => cacheTags.campaign(o.campaignSlug)));
  return product;
}

export async function getShop(slug: string) {
  "use cache";
  cacheLife("reference");
  cacheTag(cacheTags.shop(slug));
  return orNull(storeService.shop(slug));
}

export async function getCampaign(slug: string) {
  "use cache";
  cacheLife("campaign");
  cacheTag(cacheTags.campaign(slug), cacheTags.campaigns);
  return orNull(storeService.campaign(slug));
}

/** Popular product slugs to prerender at build time. */
export async function getPopularProductSlugs(limit = 12) {
  "use cache";
  cacheLife("reference");
  cacheTag(cacheTags.products);
  const res = await storeService.searchProducts({ sort: "popular", pageSize: limit });
  return res.data.map((p) => p.slug);
}

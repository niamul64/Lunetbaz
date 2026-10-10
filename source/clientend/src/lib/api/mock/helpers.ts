/**
 * Shared business logic for mock handlers. This is a stand-in for the backend:
 * it mirrors the rules described in proposal.md so the UI can be exercised
 * against realistic behaviour (pricing, campaign offers, locking, RBAC…).
 */
import type {
  CampaignOffer,
  Order,
  OrderPackage,
  OrderStatus,
  Paginated,
  Product,
  ProductCard,
  SessionUser,
  Shop,
  ShopSummary,
  Variant,
} from "@/types";
import { ApiError } from "../errors";
import type { MockDb, MockUser } from "./db";
import type { MockContext } from "./router";

export const now = () => new Date();
export const nowIso = () => new Date().toISOString();

let seq = 0;
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

/* ---------------------------------------------------------------- pagination */

export function paginate<T>(list: T[], query: Record<string, string>, defaultPageSize = 20): Paginated<T> {
  const pageSize = Math.min(Math.max(Number(query.pageSize) || defaultPageSize, 1), 100);
  const total = list.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(Number(query.page) || 1, 1), totalPages);
  return { data: list.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, totalPages } };
}

export function matchesQuery(q: string | undefined, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

/* ---------------------------------------------------------------- lookups */

export function findOr404<T>(item: T | undefined, what = "Resource"): T {
  if (!item) throw ApiError.notFound(`${what} not found.`);
  return item;
}

export function userName(db: MockDb, id: string | null | undefined) {
  if (!id) return null;
  return db.users.find((u) => u.id === id)?.name ?? null;
}

/* ---------------------------------------------------------------- session */

export function toSessionUser(db: MockDb, user: MockUser): SessionUser {
  const role = db.roles.find((r) => r.key === user.role);
  if (!role) throw ApiError.forbidden("Your role is not configured.");
  const shop = user.shopId ? db.shops.find((s) => s.id === user.shopId) : null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = user;
  return {
    ...rest,
    roleLabel: role.label,
    portal: role.portal,
    permissions: role.permissions,
    shop: shop ? { id: shop.id, name: shop.name, slug: shop.slug, logo: shop.logo, status: shop.status } : null,
  };
}

export function encodeToken(userId: string, ttlHours = 12) {
  const exp = Date.now() + ttlHours * 3600_000;
  return { token: `mock.${btoa(JSON.stringify({ sub: userId, exp }))}`, expiresAt: new Date(exp).toISOString() };
}

export function decodeToken(token: string | null | undefined): { sub: string; exp: number } | null {
  if (!token?.startsWith("mock.")) return null;
  try {
    const claims = JSON.parse(atob(token.slice(5)));
    return claims.exp > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

export function requireShopUser(ctx: MockContext, permission: string) {
  const user = ctx.require(permission);
  if (!user.shopId) throw ApiError.forbidden("This account is not linked to a shop.");
  const shop = findOr404(ctx.db.shops.find((s) => s.id === user.shopId), "Shop");
  return { user, shop };
}

/* ---------------------------------------------------------------- audit */

export function audit(ctx: MockContext, action: string, entityType: string, entityId: string, summary: string) {
  ctx.db.auditLogs.unshift({
    id: newId("al"),
    actorId: ctx.user?.id ?? "system",
    action,
    entityType,
    entityId,
    summary,
    ip: "127.0.0.1",
    at: nowIso(),
  });
}

/* ---------------------------------------------------------------- catalog */

export function isLive(product: Product, db: MockDb) {
  if (product.status !== "active") return false;
  return db.shops.find((s) => s.id === product.shopId)?.status === "active";
}

/** Campaign prices that apply right now (campaign live + item approved). */
export function liveOffers(db: MockDb, productId?: string): CampaignOffer[] {
  const t = now().getTime();
  const offers: CampaignOffer[] = [];
  for (const c of db.campaigns) {
    if (c.status !== "live") continue;
    if (new Date(c.startAt).getTime() > t || new Date(c.endAt).getTime() < t) continue;
    for (const app of db.applications) {
      if (app.campaignId !== c.id) continue;
      for (const item of app.items) {
        if (item.status !== "approved" || (productId && item.productId !== productId)) continue;
        if (item.campaignStock <= 0) continue;
        offers.push({
          campaignId: c.id,
          campaignName: c.name,
          campaignSlug: c.slug,
          type: c.type,
          variantId: item.variantId,
          campaignPrice: item.campaignPrice,
          campaignStock: item.campaignStock,
          endsAt: c.endAt,
        });
      }
    }
  }
  return offers;
}

/** Regular price the customer pays without any campaign. */
export function basePrice(v: Variant) {
  return v.salePrice ?? v.price;
}

export function priceFor(v: Variant, offers: CampaignOffer[]) {
  const offer = offers.find((o) => o.variantId === v.id);
  return { finalPrice: offer ? Math.min(offer.campaignPrice, basePrice(v)) : basePrice(v), offer: offer ?? null };
}

export function toProductCard(db: MockDb, p: Product, offers = liveOffers(db, p.id)): ProductCard {
  const shop = db.shops.find((s) => s.id === p.shopId)!;
  const priced = p.variants
    .map((v) => ({ v, ...priceFor(v, offers) }))
    .sort((a, b) => Number(b.v.stock > 0) - Number(a.v.stock > 0) || a.finalPrice - b.finalPrice);
  const best = priced[0]!;
  const finalPrice = best.finalPrice;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images[0] ?? "ph://package/0",
    brand: p.brand,
    price: best.v.price,
    finalPrice,
    discountPct: best.v.price > finalPrice ? Math.round(((best.v.price - finalPrice) / best.v.price) * 100) : 0,
    rating: p.rating,
    reviewCount: p.reviewCount,
    soldCount: p.soldCount,
    verified: p.verification.status === "verified",
    freeShipping: p.freeShipping,
    inStock: p.variants.some((v) => v.stock > 0),
    shop: { id: shop.id, name: shop.name, slug: shop.slug, location: shop.location.district },
    campaign: best.offer
      ? {
          campaignName: best.offer.campaignName,
          campaignSlug: best.offer.campaignSlug,
          type: best.offer.type,
          endsAt: best.offer.endsAt,
          campaignStock: best.offer.campaignStock,
        }
      : null,
  };
}

export function toShopSummary(db: MockDb, shop: Shop): ShopSummary {
  const products = db.products.filter((p) => p.shopId === shop.id && p.status === "active");
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    logo: shop.logo,
    rating: shop.rating,
    positiveRatingPct: shop.positiveRatingPct,
    shipOnTimePct: shop.shipOnTimePct,
    responseRatePct: shop.responseRatePct,
    followers: shop.followers,
    tier: shop.tier,
    location: shop.location,
    joinedAt: shop.joinedAt,
    status: shop.status,
    productCount: products.length,
    verifiedProductCount: products.filter((p) => p.verification.status === "verified").length,
  };
}

/** Category id plus all descendants – used for category filtering. */
export function categoryScope(db: MockDb, categoryIdOrSlug: string) {
  const root = db.categories.find((c) => c.id === categoryIdOrSlug || c.slug === categoryIdOrSlug);
  if (!root) return null;
  const ids = new Set([root.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of db.categories) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return { root, ids };
}

export function categoryPath(db: MockDb, categoryId: string) {
  const path = [];
  let current = db.categories.find((c) => c.id === categoryId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? db.categories.find((c) => c.id === current!.parentId) : undefined;
  }
  return path;
}

/* ---------------------------------------------------------------- verification */

/** Fields that are frozen while a product is verified (or under verification). */
export const LOCKABLE_FIELDS = ["images", "video", "name", "description", "highlights", "specs", "categoryId", "brand"] as const;

export function isContentLocked(p: Product) {
  return p.verification.status === "verified" || p.verification.status === "suspended" || p.verification.status === "pending";
}

/* ---------------------------------------------------------------- orders */

export function deriveOrderStatus(packages: OrderPackage[]): OrderStatus {
  const statuses = new Set(packages.map((p) => p.status));
  if (statuses.size === 1) return packages[0]!.status;
  const active = packages.filter((p) => p.status !== "cancelled");
  if (active.length && active.every((p) => p.status === "delivered")) return "delivered";
  if (statuses.has("delivered")) return "partially_delivered";
  return "processing";
}

export function refreshOrder(order: Order) {
  order.status = deriveOrderStatus(order.packages);
}

export function shopRef(db: MockDb, shopId: string) {
  const s = db.shops.find((x) => x.id === shopId);
  return { id: shopId, name: s?.name ?? "Unknown shop", slug: s?.slug ?? "" };
}

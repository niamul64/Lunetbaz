import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { isValidCacheTag } from "@/lib/cache/tags";

/**
 * On-demand cache invalidation, called by the backend's cache-invalidation
 * worker (BullMQ) when domain events happen (product.updated, campaign.started…).
 *
 *   POST /api/revalidate
 *   x-revalidate-secret: <REVALIDATE_SECRET>
 *   { "tags": ["product:samsung-galaxy-a56-5g", "shop:techhaat"], "mode": "stale" }
 *
 * mode "stale"  (default) – stale-while-revalidate: visitors get the cached page
 *                           while a fresh one is generated (no traffic spike on the API).
 * mode "expire"           – drop immediately; use for corrections that must not be
 *                           shown again (wrong price, banned product, revoked badge).
 */
const MAX_TAGS = 50;

function authorized(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: { code: "UNAUTHORIZED", message: "Invalid revalidation secret." } }, { status: 401 });

  let body: { tags?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Body must be JSON." } }, { status: 400 });
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
  const invalid = tags.filter((t) => !isValidCacheTag(t));
  if (!tags.length || tags.length > MAX_TAGS || invalid.length)
    return Response.json({ error: { code: "VALIDATION_FAILED", message: "Provide 1–50 known cache tags.", details: { invalid } } }, { status: 422 });

  const profile = body.mode === "expire" ? { expire: 0 } : "max";
  for (const tag of new Set(tags)) revalidateTag(tag, profile);

  return Response.json({ revalidated: tags, mode: body.mode === "expire" ? "expire" : "stale" }, { headers: { "Cache-Control": "no-store" } });
}

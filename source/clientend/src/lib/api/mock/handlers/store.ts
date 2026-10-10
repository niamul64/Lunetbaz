import type {
  CartLineInput,
  CartQuote,
  CheckoutResult,
  Order,
  OrderPackage,
  ProductDetail,
  ProductSearchResult,
  QuoteGroup,
  ReviewSummary,
  ShippingZoneKey,
} from "@/types";
import { ApiError } from "../../errors";
import type { MockDb } from "../db";
import { route } from "../router";
import {
  categoryPath,
  categoryScope,
  findOr404,
  isLive,
  liveOffers,
  matchesQuery,
  newId,
  now,
  nowIso,
  paginate,
  priceFor,
  toProductCard,
  toShopSummary,
} from "../helpers";

/* ---------------------------------------------------------------- home */

route("GET", "/store/home", ({ db }) => {
  const t = now().getTime();
  const offers = liveOffers(db);
  const live = db.products.filter((p) => isLive(p, db));
  const cards = live.map((p) => toProductCard(db, p, offers.filter((o) => p.variants.some((v) => v.id === o.variantId))));
  const flash = db.campaigns.find((c) => c.type === "flash" && c.status === "live");

  return {
    banners: db.banners
      .filter((b) => b.active && (!b.startAt || new Date(b.startAt).getTime() <= t) && (!b.endAt || new Date(b.endAt).getTime() >= t))
      .sort((a, b) => a.sort - b.sort),
    categories: db.categories.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort),
    flashSale: flash
      ? { campaign: flash, items: cards.filter((c) => c.campaign?.campaignSlug === flash.slug).slice(0, 12) }
      : null,
    campaigns: db.campaigns.filter((c) => ["live", "scheduled", "registration_open", "registration_closed"].includes(c.status) && c.type !== "flash"),
    verifiedPicks: cards.filter((c) => c.verified).slice(0, 10),
    justForYou: [...cards].sort((a, b) => b.soldCount - a.soldCount),
  };
});

route("GET", "/store/categories", ({ db }) => [...db.categories].sort((a, b) => a.sort - b.sort));

/* ---------------------------------------------------------------- search */

route("GET", "/store/products", ({ db, query }) => {
  const offers = liveOffers(db);
  let list = db.products.filter((p) => isLive(p, db));

  if (query.category) {
    const scope = categoryScope(db, query.category);
    list = scope ? list.filter((p) => scope.ids.has(p.categoryId)) : [];
  }
  if (query.shop) list = list.filter((p) => p.shopId === query.shop || db.shops.find((s) => s.id === p.shopId)?.slug === query.shop);
  if (query.q) list = list.filter((p) => matchesQuery(query.q, p.name, p.brand, p.tags.join(" "), p.description));

  let cards = list.map((p) => toProductCard(db, p, offers.filter((o) => p.variants.some((v) => v.id === o.variantId))));
  if (query.campaign) cards = cards.filter((c) => c.campaign?.campaignSlug === query.campaign);

  // Facets are computed before price/brand/rating filters so users can widen again.
  const brandCounts = new Map<string, number>();
  cards.forEach((c) => brandCounts.set(c.brand, (brandCounts.get(c.brand) ?? 0) + 1));
  const prices = cards.map((c) => c.finalPrice);
  const facets = {
    brands: [...brandCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    priceRange: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
  };

  if (query.brand) {
    const brands = query.brand.split(",");
    cards = cards.filter((c) => brands.includes(c.brand));
  }
  if (query.minPrice) cards = cards.filter((c) => c.finalPrice >= Number(query.minPrice));
  if (query.maxPrice) cards = cards.filter((c) => c.finalPrice <= Number(query.maxPrice));
  if (query.rating) cards = cards.filter((c) => c.rating >= Number(query.rating));
  if (query.verified === "1") cards = cards.filter((c) => c.verified);
  if (query.freeShipping === "1") cards = cards.filter((c) => c.freeShipping);

  const sorters: Record<string, (a: (typeof cards)[number], b: (typeof cards)[number]) => number> = {
    popular: (a, b) => b.soldCount - a.soldCount,
    newest: () => 0,
    price_asc: (a, b) => a.finalPrice - b.finalPrice,
    price_desc: (a, b) => b.finalPrice - a.finalPrice,
    rating: (a, b) => b.rating - a.rating,
  };
  const sorter = sorters[query.sort ?? ""];
  if (sorter) cards.sort(sorter);
  else cards.sort((a, b) => Number(b.inStock) - Number(a.inStock) || Number(b.verified) - Number(a.verified) || b.soldCount - a.soldCount);

  return { ...paginate(cards, query, 24), facets } satisfies ProductSearchResult;
});

/* ---------------------------------------------------------------- product */

route("GET", "/store/products/:slug", ({ db, params }) => {
  const product = db.products.find((p) => p.slug === params.slug || p.id === params.slug);
  if (!product || !isLive(product, db)) throw ApiError.notFound("This product is not available.");
  const shop = db.shops.find((s) => s.id === product.shopId)!;
  const offers = liveOffers(db, product.id);
  const related = db.products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId && isLive(p, db))
    .slice(0, 10)
    .map((p) => toProductCard(db, p));
  return {
    ...product,
    shop: toShopSummary(db, shop),
    categoryPath: categoryPath(db, product.categoryId),
    offers,
    related,
  } satisfies ProductDetail;
});

route("GET", "/store/products/:id/reviews", ({ db, params, query }) => {
  const all = db.reviews.filter((r) => r.productId === params.id && r.status === "published");
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary["distribution"];
  all.forEach((r) => (distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1));
  const product = db.products.find((p) => p.id === params.id);
  const summary: ReviewSummary = {
    average: product?.rating ?? 0,
    total: Math.max(product?.reviewCount ?? 0, all.length),
    distribution,
  };
  let list = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (query.withMedia === "1") list = list.filter((r) => r.images.length);
  return { ...paginate(list, query, 10), summary };
});

route("GET", "/store/products/:id/questions", ({ db, params }) =>
  db.questions.filter((q) => q.productId === params.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
);

route("POST", "/store/products/:id/questions", (ctx) => {
  const user = ctx.requireUser();
  const question = { id: newId("q"), productId: ctx.params.id!, userName: user.name.split(" ")[0]!, question: String(ctx.body?.question ?? "").trim(), answer: null, answeredBy: null, createdAt: nowIso() };
  if (question.question.length < 5) throw ApiError.validation("Question is too short.", { question: "Please write at least 5 characters." });
  ctx.db.questions.unshift(question);
  return question;
});

/* ---------------------------------------------------------------- shops & campaigns */

route("GET", "/store/shops/:slug", ({ db, params }) => {
  const shop = db.shops.find((s) => s.slug === params.slug);
  if (!shop || shop.status !== "active") throw ApiError.notFound("Shop not found.");
  return { ...toShopSummary(db, shop), description: shop.description, banner: shop.banner };
});

route("GET", "/store/campaigns", ({ db }) =>
  db.campaigns.filter((c) => ["live", "scheduled", "registration_open", "registration_closed"].includes(c.status)),
);

route("GET", "/store/campaigns/:slug", ({ db, params }) => {
  const campaign = db.campaigns.find((c) => c.slug === params.slug && c.status !== "draft");
  return findOr404(campaign, "Campaign");
});

/* ---------------------------------------------------------------- locations & vouchers */

route("GET", "/store/locations", ({ db }) => ({ divisions: db.divisions, shippingZones: db.shippingZones }));

route("GET", "/store/vouchers", ({ db }) => {
  const t = now().getTime();
  return db.vouchers.filter((v) => v.active && new Date(v.startAt).getTime() <= t && new Date(v.endAt).getTime() >= t);
});

/* ---------------------------------------------------------------- cart & checkout */

function zoneFor(db: MockDb, district: string | undefined): ShippingZoneKey {
  for (const d of db.divisions) for (const x of d.districts) if (x.name === district) return x.zone;
  return "inside_dhaka";
}

function buildQuote(db: MockDb, items: CartLineInput[], opts: { district?: string; voucherCode?: string | null }): CartQuote {
  const zoneKey = zoneFor(db, opts.district);
  const zone = db.shippingZones.find((z) => z.zone === zoneKey)!;
  const groups = new Map<string, QuoteGroup>();

  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) continue;
    const shop = db.shops.find((s) => s.id === product.shopId)!;
    const live = isLive(product, db);
    const { finalPrice, offer } = priceFor(variant, liveOffers(db, product.id));
    const maxQty = Math.min(variant.stock, offer ? offer.campaignStock : Infinity, 10);
    const qty = Math.max(1, Math.floor(item.qty));
    let issue: string | null = null;
    if (!live) issue = "No longer available";
    else if (maxQty <= 0) issue = "Out of stock";
    else if (qty > maxQty) issue = `Only ${maxQty} available`;

    const group = groups.get(shop.id) ?? { shop: { id: shop.id, name: shop.name, slug: shop.slug }, lines: [], subtotal: 0, shippingFee: 0 };
    group.lines.push({
      productId: product.id,
      variantId: variant.id,
      qty,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? "ph://package/0",
      attributes: variant.attributes,
      unitPrice: finalPrice,
      originalPrice: variant.price,
      lineTotal: issue ? 0 : finalPrice * qty,
      available: !issue,
      maxQty: Math.max(maxQty, 0),
      verified: product.verification.status === "verified",
      campaignName: offer?.campaignName ?? null,
      issue,
    });
    groups.set(shop.id, group);
  }

  for (const g of groups.values()) {
    g.subtotal = g.lines.reduce((s, l) => s + l.lineTotal, 0);
    const payable = g.lines.filter((l) => l.available);
    if (!payable.length) continue;
    const allFree = payable.every((l) => db.products.find((p) => p.id === l.productId)?.freeShipping);
    const weight = payable.reduce((s, l) => s + (db.products.find((p) => p.id === l.productId)?.weightKg ?? 0.5) * l.qty, 0);
    g.shippingFee = allFree ? 0 : zone.baseFee + Math.max(0, Math.ceil(weight - 1)) * zone.perExtraKg;
  }

  const list = [...groups.values()];
  const subtotal = list.reduce((s, g) => s + g.subtotal, 0);
  const shippingFee = list.reduce((s, g) => s + g.shippingFee, 0);

  let voucher: CartQuote["voucher"] = null;
  let voucherError: string | null = null;
  if (opts.voucherCode) {
    const t = now().getTime();
    const v = db.vouchers.find((x) => x.code.toLowerCase() === opts.voucherCode!.trim().toLowerCase());
    const eligibleSubtotal = v?.shopId ? (groups.get(v.shopId)?.subtotal ?? 0) : subtotal;
    if (!v || !v.active || new Date(v.startAt).getTime() > t || new Date(v.endAt).getTime() < t) voucherError = "This voucher is invalid or expired.";
    else if (v.usageLimit !== null && v.used >= v.usageLimit) voucherError = "This voucher has been fully redeemed.";
    else if (eligibleSubtotal < v.minSpend) voucherError = `Spend at least ৳${v.minSpend.toLocaleString("en-IN")}${v.shopId ? " in this shop" : ""} to use this voucher.`;
    else {
      const raw = v.type === "fixed" ? v.value : Math.floor((eligibleSubtotal * v.value) / 100);
      const discount = Math.min(raw, v.maxDiscount ?? Infinity, eligibleSubtotal);
      voucher = { code: v.code, title: v.title, discount };
    }
  }
  const discount = voucher?.discount ?? 0;

  return {
    groups: list,
    subtotal,
    shippingFee,
    discount,
    total: Math.max(subtotal + shippingFee - discount, 0),
    voucher,
    voucherError,
    etaDays: list.length ? zone.etaDays : null,
    itemCount: list.reduce((s, g) => s + g.lines.filter((l) => l.available).reduce((n, l) => n + l.qty, 0), 0),
  };
}

route("POST", "/store/cart/quote", (ctx) => {
  const items: CartLineInput[] = Array.isArray(ctx.body?.items) ? ctx.body.items : [];
  let district: string | undefined;
  if (ctx.body?.addressId && ctx.user) district = ctx.db.addresses.find((a) => a.id === ctx.body.addressId && a.userId === ctx.user!.id)?.district;
  return buildQuote(ctx.db, items, { district, voucherCode: ctx.body?.voucherCode });
});

route("POST", "/store/checkout", (ctx) => {
  const user = ctx.requireUser();
  if (user.portal !== "store") throw ApiError.forbidden("Staff and seller accounts can't place orders. Please use a customer account.");
  const { db, body } = ctx;
  const address = db.addresses.find((a) => a.id === body?.addressId && a.userId === user.id);
  if (!address) throw ApiError.validation("Please choose a delivery address.", { addressId: "Required" });
  const risk = db.riskProfiles.find((r) => r.userId === user.id);
  if (body.paymentMethod === "cod" && risk?.flag === "blocked") throw new ApiError(422, "COD_NOT_AVAILABLE", "Cash on Delivery is not available for this account. Please pay online.");

  const quote = buildQuote(db, body.items ?? [], { district: address.district, voucherCode: body.voucherCode });
  const problems = quote.groups.flatMap((g) => g.lines.filter((l) => l.issue).map((l) => `${l.name}: ${l.issue}`));
  if (!quote.itemCount) throw ApiError.badRequest("Your cart is empty.");
  if (problems.length) throw new ApiError(409, "CART_CHANGED", "Some items in your cart changed. Please review your cart.", { problems });
  if (body.voucherCode && quote.voucherError) throw new ApiError(422, "VOUCHER_INVALID", quote.voucherError);

  const ts = nowIso();
  const orderId = newId("o");
  const online = body.paymentMethod !== "cod";
  const packages: OrderPackage[] = quote.groups.map((g, i) => ({
    id: `pk_${orderId}_${i + 1}`,
    shopId: g.shop.id,
    status: online ? "confirmed" : "pending",
    courier: null,
    trackingNo: null,
    shippingFee: g.shippingFee,
    items: g.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, name: l.name, image: l.image, attributes: l.attributes, unitPrice: l.unitPrice, qty: l.qty })),
    timeline: [
      { status: "pending", at: ts, note: online ? "Order placed" : "Order placed (Cash on Delivery)" },
      ...(online ? [{ status: "confirmed" as const, at: ts, note: `Payment received via ${String(body.paymentMethod).toUpperCase()}` }] : []),
    ],
  }));

  // Reserve stock (the backend does this atomically; see proposal §7.6).
  for (const g of quote.groups)
    for (const l of g.lines) {
      const product = db.products.find((p) => p.id === l.productId)!;
      const variant = product.variants.find((v) => v.id === l.variantId)!;
      variant.stock -= l.qty;
      product.soldCount += l.qty;
      if (l.campaignName)
        for (const app of db.applications)
          for (const item of app.items) if (item.variantId === l.variantId && item.status === "approved") item.campaignStock = Math.max(0, item.campaignStock - l.qty);
    }
  if (quote.voucher) {
    const v = db.vouchers.find((x) => x.code === quote.voucher!.code);
    if (v) v.used += 1;
  }

  const d = new Date();
  const orderNo = `LB-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(db.orders.length + 1001)}`;
  const order: Order = {
    id: orderId,
    orderNo,
    customerId: user.id,
    createdAt: ts,
    status: online ? "confirmed" : "pending",
    payment: { method: body.paymentMethod, status: online ? "paid" : "pending", transactionId: online ? `MOCK-${Date.now().toString(36).toUpperCase()}` : null },
    shippingAddress: { name: address.name, phone: address.phone, division: address.division, district: address.district, area: address.area, line: address.line },
    totals: { subtotal: quote.subtotal, shippingFee: quote.shippingFee, discount: quote.discount, total: quote.total },
    voucherCode: quote.voucher?.code ?? null,
    packages,
  };
  db.orders.unshift(order);

  // In production, online payments return the gateway URL (SSLCommerz / bKash) and
  // the order is confirmed by the payment webhook. The mock marks it paid immediately.
  return { orderId, orderNo, total: order.totals.total, paymentMethod: body.paymentMethod, paymentRedirectUrl: null } satisfies CheckoutResult;
});


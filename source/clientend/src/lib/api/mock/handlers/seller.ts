import type {
  ApplyCampaignItemInput,
  Campaign,
  CampaignApplication,
  ChangeRequest,
  PackageStatus,
  Product,
  SellerDashboard,
  SellerPackageView,
  VerificationRequest,
} from "@/types";
import { P } from "@/lib/auth/permissions";
import { ApiError } from "../../errors";
import type { MockDb } from "../db";
import { route } from "../router";
import {
  LOCKABLE_FIELDS,
  audit,
  basePrice,
  categoryScope,
  findOr404,
  isContentLocked,
  matchesQuery,
  newId,
  now,
  nowIso,
  paginate,
  refreshOrder,
  requireShopUser,
  toSessionUser,
  userName,
} from "../helpers";

/* ---------------------------------------------------------------- helpers */

function packagesOf(db: MockDb, shopId: string): SellerPackageView[] {
  return db.orders.flatMap((o) =>
    o.packages
      .filter((p) => p.shopId === shopId)
      .map((p) => ({
        ...p,
        orderId: o.id,
        orderNo: o.orderNo,
        createdAt: o.createdAt,
        payment: o.payment,
        shippingAddress: o.shippingAddress,
        customerName: o.shippingAddress.name,
      })),
  );
}

function ownProduct(db: MockDb, shopId: string, id: string) {
  const product = db.products.find((p) => p.id === id && p.shopId === shopId);
  return findOr404(product, "Product");
}

/* ---------------------------------------------------------------- dashboard */

route("GET", "/seller/dashboard", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerDashboard);
  const pkgs = packagesOf(ctx.db, shop.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const products = ctx.db.products.filter((p) => p.shopId === shop.id);
  const canSeeMoney = ctx.user!.permissions.includes("*") || ctx.user!.permissions.includes(P.sellerFinanceView) || ctx.user!.permissions.includes(P.sellerOrdersView);
  const delivered = pkgs.filter((p) => p.status === "delivered");
  const revenue = delivered.reduce((s, p) => s + p.items.reduce((n, i) => n + i.unitPrice * i.qty, 0), 0);
  const toShip = pkgs.filter((p) => ["pending", "confirmed", "packed"].includes(p.status)).length;

  const alerts: SellerDashboard["alerts"] = [];
  if (shop.status === "pending") alerts.push({ level: "warning", message: "Your shop is awaiting approval. Products will go live once Lunetbuz approves your KYC." });
  if (shop.strikes > 0) alerts.push({ level: "danger", message: `Your shop has ${shop.strikes} strike(s). Repeated violations can lead to suspension.` });
  const rejected = products.filter((p) => p.status === "rejected").length;
  if (rejected) alerts.push({ level: "warning", message: `${rejected} product(s) were rejected by QC. Fix and resubmit them.`, href: "/seller/products?status=rejected" });
  const suspended = products.filter((p) => p.verification.status === "suspended");
  suspended.forEach((p) => alerts.push({ level: "danger", message: `Verified badge suspended on "${p.name}" pending investigation.`, href: "/seller/verification" }));
  const openCampaigns = ctx.db.campaigns.filter((c) => c.status === "registration_open").length;
  if (openCampaigns) alerts.push({ level: "info", message: `${openCampaigns} campaign(s) are open for registration.`, href: "/seller/campaigns" });

  return {
    kpis: [
      { key: "to_ship", label: "Orders to ship", value: toShip, format: "number", hint: "Pending, confirmed or packed" },
      ...(canSeeMoney ? [{ key: "revenue", label: "Delivered revenue", value: revenue, format: "currency" as const, delta: 12.4 }] : []),
      { key: "products", label: "Live products", value: products.filter((p) => p.status === "active").length, format: "number" },
      { key: "verified", label: "Verified products", value: products.filter((p) => p.verification.status === "verified").length, format: "number" },
      { key: "rating", label: "Shop rating", value: shop.rating, format: "number", hint: `${shop.positiveRatingPct}% positive` },
      { key: "ship_on_time", label: "Ship on time", value: shop.shipOnTimePct, format: "percent" },
    ],
    series: ctx.db.salesSeries[shop.id] ?? [],
    recentPackages: pkgs.slice(0, 5),
    alerts,
    lowStock: products.flatMap((p) => p.variants.filter((v) => v.stock <= 5).map((v) => ({ productId: p.id, name: p.name, variant: Object.values(v.attributes).join(" / "), stock: v.stock }))).slice(0, 6),
  } satisfies SellerDashboard;
});

/* ---------------------------------------------------------------- shop */

route("GET", "/seller/shop", (ctx) => requireShopUser(ctx, P.sellerDashboard).shop);

route("PATCH", "/seller/shop", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerSettingsManage);
  const { name, description, payout, location } = ctx.body ?? {};
  if (name) shop.name = String(name);
  if (description !== undefined) shop.description = String(description);
  if (location) shop.location = { ...shop.location, ...location };
  if (payout) shop.payout = { ...shop.payout, ...payout };
  audit(ctx, "shop.updated", "shop", shop.id, `Updated shop profile of ${shop.name}`);
  return shop;
});

/* ---------------------------------------------------------------- products */

route("GET", "/seller/products", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerProductsView);
  let list = ctx.db.products.filter((p) => p.shopId === shop.id);
  if (ctx.query.status) list = list.filter((p) => p.status === ctx.query.status);
  if (ctx.query.verification) list = list.filter((p) => p.verification.status === ctx.query.verification);
  if (ctx.query.q) list = list.filter((p) => matchesQuery(ctx.query.q, p.name, p.brand, p.variants.map((v) => v.sku).join(" ")));
  return paginate(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), ctx.query, 20);
});

route("GET", "/seller/products/:id", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerProductsView);
  return ownProduct(ctx.db, shop.id, ctx.params.id!);
});

function validateProduct(body: Partial<Product>) {
  const errors: Record<string, string> = {};
  if (!body.name || body.name.trim().length < 10) errors.name = "Product name must be at least 10 characters.";
  if (!body.categoryId) errors.categoryId = "Choose a category.";
  if (!body.images?.length) errors.images = "Add at least one image.";
  if (!body.variants?.length) errors.variants = "Add at least one variant.";
  body.variants?.forEach((v, i) => {
    if (!(v.price > 0)) errors[`variants.${i}.price`] = "Price must be greater than 0.";
    if (v.salePrice !== null && v.salePrice !== undefined && v.salePrice >= v.price) errors[`variants.${i}.salePrice`] = "Sale price must be lower than the price.";
  });
  if (Object.keys(errors).length) throw ApiError.validation("Please fix the highlighted fields.", errors);
}

route("POST", "/seller/products", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerProductsManage);
  const body = ctx.body as Partial<Product> & { submit?: boolean };
  validateProduct(body);
  const ts = nowIso();
  const id = newId("p");
  const product: Product = {
    id,
    slug: `${String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${id.slice(-4)}`,
    name: body.name!,
    shopId: shop.id,
    categoryId: body.categoryId!,
    brand: body.brand || "No brand",
    images: body.images!,
    video: body.video ?? null,
    description: body.description ?? "",
    highlights: body.highlights ?? [],
    specs: body.specs ?? [],
    variants: body.variants!.map((v, i) => ({ ...v, id: `${id}_v${i + 1}`, sku: v.sku || `${shop.slug.toUpperCase()}-${id.slice(-4)}-${i + 1}` })),
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    status: body.submit ? "pending_review" : "draft",
    verification: { status: "none", verifiedAt: null, expiresAt: null },
    freeShipping: Boolean(body.freeShipping),
    warranty: body.warranty ?? null,
    tags: body.tags ?? [],
    weightKg: Number(body.weightKg) || 0.5,
    createdAt: ts,
    updatedAt: ts,
  };
  ctx.db.products.unshift(product);
  audit(ctx, "product.created", "product", id, `Created product "${product.name}"`);
  return product;
});

/**
 * Content update. Enforces the Verified Badge content lock (proposal §4.6):
 * locked fields can only change through a change request.
 */
route("PATCH", "/seller/products/:id", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerProductsManage);
  const product = ownProduct(ctx.db, shop.id, ctx.params.id!);
  const body = ctx.body as Partial<Product> & { submit?: boolean };

  if (isContentLocked(product)) {
    const touched = LOCKABLE_FIELDS.filter((f) => f in body && JSON.stringify(body[f]) !== JSON.stringify(product[f]));
    if (touched.length)
      throw ApiError.conflict("CONTENT_LOCKED", "This product is Lunetbuz Verified. Photos, videos and description are locked. Submit a change request instead.", { fields: touched });
  }
  const next = { ...product, ...body };
  validateProduct(next);

  const editable = ["name", "brand", "categoryId", "images", "video", "description", "highlights", "specs", "freeShipping", "warranty", "tags", "weightKg"] as const;
  for (const key of editable) if (key in body) Object.assign(product, { [key]: body[key] });
  if (body.variants) {
    product.variants = body.variants.map((v, i) => ({ ...v, id: v.id || `${product.id}_v${Date.now().toString(36)}${i}` }));
  }
  // Content edits on non-verified products go back through QC.
  if (body.submit || (product.status === "active" && !isContentLocked(product) && editable.some((k) => k in body && !["freeShipping", "weightKg", "tags"].includes(k))))
    product.status = "pending_review";
  if (product.status === "rejected" && body.submit) product.rejectionReason = null;
  product.updatedAt = nowIso();
  audit(ctx, "product.updated", "product", product.id, `Updated product "${product.name}"`);
  return product;
});

/** Price & stock – always allowed, including on verified products. */
route("PATCH", "/seller/products/:id/variants/:variantId/inventory", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerInventoryManage);
  const product = ownProduct(ctx.db, shop.id, ctx.params.id!);
  const variant = findOr404(product.variants.find((v) => v.id === ctx.params.variantId), "Variant");
  const { price, salePrice, stock } = ctx.body ?? {};
  const nextPrice = price !== undefined ? Number(price) : variant.price;
  const nextSale = salePrice === undefined ? variant.salePrice : salePrice === null || salePrice === "" ? null : Number(salePrice);
  const errors: Record<string, string> = {};
  if (!(nextPrice > 0)) errors.price = "Price must be greater than 0.";
  if (nextSale !== null && nextSale >= nextPrice) errors.salePrice = "Sale price must be lower than the price.";
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) errors.stock = "Stock must be a whole number ≥ 0.";
  if (Object.keys(errors).length) throw ApiError.validation("Please fix the highlighted fields.", errors);
  variant.price = nextPrice;
  variant.salePrice = nextSale;
  if (stock !== undefined) variant.stock = Number(stock);
  product.updatedAt = nowIso();
  return product;
});

route("DELETE", "/seller/products/:id", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerProductsManage);
  const product = ownProduct(ctx.db, shop.id, ctx.params.id!);
  if (product.status !== "draft") throw ApiError.conflict("NOT_DELETABLE", "Only drafts can be deleted. Deactivate the product instead.");
  ctx.db.products = ctx.db.products.filter((p) => p.id !== product.id);
  return { ok: true };
});

route("POST", "/seller/products/:id/status", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerProductsManage);
  const product = ownProduct(ctx.db, shop.id, ctx.params.id!);
  const target = ctx.body?.status;
  if (target === "inactive" && product.status === "active") product.status = "inactive";
  else if (target === "active" && product.status === "inactive") product.status = "active";
  else throw ApiError.conflict("INVALID_TRANSITION", `Can't change a ${product.status} product to ${target}.`);
  product.updatedAt = nowIso();
  return product;
});

/* ---------------------------------------------------------------- orders */

route("GET", "/seller/packages", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerOrdersView);
  let list = packagesOf(ctx.db, shop.id);
  if (ctx.query.status) list = list.filter((p) => p.status === ctx.query.status);
  if (ctx.query.q) list = list.filter((p) => matchesQuery(ctx.query.q, p.orderNo, p.customerName, p.trackingNo));
  return paginate(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), ctx.query, 20);
});

route("GET", "/seller/packages/:id", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerOrdersView);
  return findOr404(packagesOf(ctx.db, shop.id).find((p) => p.id === ctx.params.id), "Package");
});

const SELLER_TRANSITIONS: Partial<Record<PackageStatus, PackageStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["ready_to_ship", "cancelled"],
};

route("POST", "/seller/packages/:id/status", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerOrdersManage);
  const order = ctx.db.orders.find((o) => o.packages.some((p) => p.id === ctx.params.id && p.shopId === shop.id));
  const pkg = order?.packages.find((p) => p.id === ctx.params.id);
  if (!order || !pkg) throw ApiError.notFound("Package not found.");
  const target = ctx.body?.status as PackageStatus;
  if (!SELLER_TRANSITIONS[pkg.status]?.includes(target)) throw ApiError.conflict("INVALID_TRANSITION", `A ${pkg.status} package can't be moved to ${target}.`);
  if (target === "ready_to_ship") {
    const courier: string = ctx.body?.courier || "Pathao";
    pkg.courier = courier;
    pkg.trackingNo = `${courier.slice(0, 3).toUpperCase()}-${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  }
  if (target === "cancelled")
    for (const item of pkg.items) {
      const v = ctx.db.products.find((x) => x.id === item.productId)?.variants.find((x) => x.id === item.variantId);
      if (v) v.stock += item.qty;
    }
  pkg.status = target;
  pkg.timeline.push({ status: target, at: nowIso(), note: ctx.body?.note || (target === "ready_to_ship" ? `Awaiting ${pkg.courier} pickup` : null) });
  refreshOrder(order);
  return packagesOf(ctx.db, shop.id).find((p) => p.id === pkg.id);
});

/* ---------------------------------------------------------------- campaigns */

function referencePrice(db: MockDb, productId: string, variantId: string) {
  const v = db.products.find((p) => p.id === productId)?.variants.find((x) => x.id === variantId);
  // Backend uses the lowest price of the last 30 days; the mock uses today's regular price.
  return v ? basePrice(v) : 0;
}

route("GET", "/seller/campaigns", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerCampaignsView);
  return ctx.db.campaigns
    .filter((c) => c.status !== "draft")
    .map((c) => {
      const apps = ctx.db.applications.filter((a) => a.campaignId === c.id && a.shopId === shop.id);
      return {
        ...c,
        myApplication: apps.length
          ? { status: apps[apps.length - 1]!.status, items: apps.flatMap((a) => a.items).length, approvedItems: apps.flatMap((a) => a.items).filter((i) => i.status === "approved").length }
          : null,
      };
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
});

route("GET", "/seller/campaigns/:id", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerCampaignsView);
  const campaign = findOr404(ctx.db.campaigns.find((c) => c.id === ctx.params.id && c.status !== "draft"), "Campaign");
  const applications = ctx.db.applications
    .filter((a) => a.campaignId === campaign.id && a.shopId === shop.id)
    .map((a) => ({
      ...a,
      items: a.items.map((i) => {
        const p = ctx.db.products.find((x) => x.id === i.productId);
        const v = p?.variants.find((x) => x.id === i.variantId);
        return { ...i, productName: p?.name ?? "Deleted product", variantLabel: v ? Object.values(v.attributes).join(" / ") : "", image: p?.images[0] ?? "ph://package/0", referencePrice: referencePrice(ctx.db, i.productId, i.variantId) };
      }),
    }));
  const eligible = eligibilityFor(ctx.db, campaign, shop.id);
  return { campaign, applications, eligible };
});

function eligibilityFor(db: MockDb, c: Campaign, shopId: string) {
  const shop = db.shops.find((s) => s.id === shopId)!;
  const reasons: string[] = [];
  const t = now().getTime();
  if (c.status !== "registration_open" || new Date(c.registrationEnd).getTime() < t || new Date(c.registrationStart).getTime() > t) reasons.push("Registration is not open.");
  if (shop.status !== "active") reasons.push("Your shop must be active.");
  if (shop.rating < c.rules.minShopRating) reasons.push(`Shop rating must be at least ${c.rules.minShopRating}.`);
  return { canApply: reasons.length === 0, reasons };
}

route("POST", "/seller/campaigns/:id/applications", (ctx) => {
  const { user, shop } = requireShopUser(ctx, P.sellerCampaignsApply);
  const campaign = findOr404(ctx.db.campaigns.find((c) => c.id === ctx.params.id), "Campaign");
  const eligibility = eligibilityFor(ctx.db, campaign, shop.id);
  if (!eligibility.canApply) throw ApiError.conflict("NOT_ELIGIBLE", eligibility.reasons.join(" "));

  const items: ApplyCampaignItemInput[] = ctx.body?.items ?? [];
  if (!items.length) throw ApiError.badRequest("Select at least one product.");
  const already = ctx.db.applications.filter((a) => a.campaignId === campaign.id && a.shopId === shop.id && a.status !== "pending").flatMap((a) => a.items);
  if (new Set([...items.map((i) => i.productId), ...already.map((i) => i.productId)]).size > campaign.rules.maxProductsPerShop)
    throw ApiError.conflict("TOO_MANY_PRODUCTS", `You can submit at most ${campaign.rules.maxProductsPerShop} products for this campaign.`);

  const scope = campaign.rules.categoryIds.length ? new Set(campaign.rules.categoryIds.flatMap((c) => [...(categoryScope(ctx.db, c)?.ids ?? [])])) : null;
  const fieldErrors: Record<string, string> = {};
  for (const item of items) {
    const p = ctx.db.products.find((x) => x.id === item.productId && x.shopId === shop.id);
    const v = p?.variants.find((x) => x.id === item.variantId);
    const key = item.variantId;
    if (!p || !v) fieldErrors[key] = "Product not found in your shop.";
    else if (p.status !== "active") fieldErrors[key] = "Only live products can join campaigns.";
    else if (scope && !scope.has(p.categoryId)) fieldErrors[key] = "This category is not part of the campaign.";
    else if (campaign.rules.verifiedOnly && p.verification.status !== "verified") fieldErrors[key] = "Only Lunetbuz Verified products can join this campaign.";
    else if (item.campaignStock < campaign.rules.minStock) fieldErrors[key] = `Campaign stock must be at least ${campaign.rules.minStock}.`;
    else if (item.campaignStock > v.stock) fieldErrors[key] = `You only have ${v.stock} in stock.`;
    else {
      const ref = basePrice(v);
      const pct = Math.round(((ref - item.campaignPrice) / ref) * 100);
      if (pct < campaign.rules.minDiscountPct) fieldErrors[key] = `Discount must be at least ${campaign.rules.minDiscountPct}% below ৳${ref.toLocaleString("en-IN")} (currently ${Math.max(pct, 0)}%).`;
    }
  }
  if (Object.keys(fieldErrors).length) throw ApiError.validation("Some products don't meet the campaign rules.", fieldErrors);

  const pending = ctx.db.applications.find((a) => a.campaignId === campaign.id && a.shopId === shop.id && a.status === "pending");
  const appItems = items.map((i) => ({ ...i, status: "pending" as const, rejectionReason: null }));
  let application: CampaignApplication;
  if (pending) {
    pending.items = appItems;
    pending.submittedAt = nowIso();
    application = pending;
  } else {
    application = { id: newId("ca"), campaignId: campaign.id, shopId: shop.id, status: "pending", submittedAt: nowIso(), reviewedBy: null, reviewedAt: null, items: appItems };
    ctx.db.applications.push(application);
  }
  audit(ctx, "campaign.application.submitted", "campaign_application", application.id, `${user.name} applied ${items.length} item(s) from ${shop.name} to ${campaign.name}`);
  return application;
});

/* ---------------------------------------------------------------- verification */

route("GET", "/seller/verification", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerVerificationView);
  const productInfo = (id: string) => {
    const p = ctx.db.products.find((x) => x.id === id);
    return { id, name: p?.name ?? "Deleted product", images: p?.images ?? [], slug: p?.slug ?? "", verification: p?.verification };
  };
  return {
    requests: ctx.db.verificationRequests
      .filter((r) => r.shopId === shop.id)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((r) => ({ ...r, product: productInfo(r.productId), inspectorName: userName(ctx.db, r.inspection?.officerId), approverName: userName(ctx.db, r.approval?.officerId) })),
    changeRequests: ctx.db.changeRequests.filter((r) => r.shopId === shop.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map((r) => ({ ...r, product: productInfo(r.productId) })),
    badgeEvents: ctx.db.badgeEvents.filter((e) => ctx.db.products.find((p) => p.id === e.productId)?.shopId === shop.id).sort((a, b) => b.at.localeCompare(a.at)),
    eligibleProducts: ctx.db.products
      .filter((p) => p.shopId === shop.id && p.status === "active" && ["none", "expired", "revoked"].includes(p.verification.status))
      .map((p) => ({ id: p.id, name: p.name, images: p.images })),
  };
});

route("POST", "/seller/products/:id/verification-requests", (ctx) => {
  const { user, shop } = requireShopUser(ctx, P.sellerVerificationApply);
  const product = ownProduct(ctx.db, shop.id, ctx.params.id!);
  if (shop.status !== "active") throw ApiError.conflict("SHOP_NOT_ACTIVE", "Your shop must be active to apply.");
  if (shop.strikes >= 2) throw ApiError.conflict("NOT_IN_GOOD_STANDING", "Shops with 2 or more strikes can't apply for the Verified Badge.");
  if (product.status !== "active") throw ApiError.conflict("PRODUCT_NOT_LIVE", "Only live products can be verified.");
  if (!["none", "expired", "revoked"].includes(product.verification.status)) throw ApiError.conflict("ALREADY_IN_PROGRESS", "This product is already verified or under verification.");
  const documents = (ctx.body?.documents ?? []) as VerificationRequest["documents"];
  if (!documents.length) throw ApiError.validation("Upload at least one supporting document.", { documents: "Required" });

  const request: VerificationRequest = {
    id: newId("vr"),
    productId: product.id,
    shopId: shop.id,
    status: "submitted",
    submittedBy: user.id,
    submittedAt: nowIso(),
    inspectionMethod: ctx.body?.inspectionMethod === "onsite" ? "onsite" : "hub",
    documents,
    inspection: null,
    approval: null,
    rejectionReason: null,
  };
  ctx.db.verificationRequests.unshift(request);
  product.verification = { status: "pending", verifiedAt: null, expiresAt: null };
  audit(ctx, "verification.requested", "product", product.id, `Requested Verified Badge for "${product.name}"`);
  return request;
});

route("POST", "/seller/products/:id/change-requests", (ctx) => {
  const { user, shop } = requireShopUser(ctx, P.sellerProductsManage);
  const product = ownProduct(ctx.db, shop.id, ctx.params.id!);
  if (product.verification.status !== "verified") throw ApiError.conflict("NOT_LOCKED", "Change requests are only needed for verified products. Edit the product directly.");
  if (ctx.db.changeRequests.some((r) => r.productId === product.id && r.status === "pending")) throw ApiError.conflict("ALREADY_PENDING", "There is already a pending change request for this product.");
  const proposed = (ctx.body?.proposed ?? {}) as ChangeRequest["proposed"];
  const fields = LOCKABLE_FIELDS.filter((f) => f in proposed && JSON.stringify(proposed[f]) !== JSON.stringify(product[f]));
  if (!fields.length) throw ApiError.badRequest("No changes to submit.");
  if (!ctx.body?.reason || String(ctx.body.reason).trim().length < 10) throw ApiError.validation("Explain why the change is needed.", { reason: "At least 10 characters." });
  const cr: ChangeRequest = { id: newId("cr"), productId: product.id, shopId: shop.id, status: "pending", submittedBy: user.id, submittedAt: nowIso(), fields, reason: String(ctx.body.reason), proposed };
  ctx.db.changeRequests.unshift(cr);
  audit(ctx, "verification.change_requested", "product", product.id, `Submitted change request for "${product.name}" (${fields.join(", ")})`);
  return cr;
});

/* ---------------------------------------------------------------- finance */

route("GET", "/seller/finance", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerFinanceView);
  const payouts = ctx.db.payouts.filter((p) => p.shopId === shop.id).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  const pkgs = packagesOf(ctx.db, shop.id);
  const pendingSettlement = pkgs
    .filter((p) => p.status === "delivered" && !payouts.some((po) => po.status === "paid" && p.timeline.at(-1)!.at.slice(0, 10) <= po.periodEnd))
    .reduce((s, p) => s + p.items.reduce((n, i) => n + i.unitPrice * i.qty, 0), 0);
  return {
    summary: {
      paidOut: payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.netAmount, 0),
      awaitingPayout: payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + p.netAmount, 0),
      pendingSettlement,
      commissionRatePct: shop.commissionRatePct,
    },
    payouts,
    payoutAccount: shop.payout,
  };
});

/* ---------------------------------------------------------------- team */

route("GET", "/seller/team", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerTeamManage);
  return ctx.db.users.filter((u) => u.shopId === shop.id).map((u) => toSessionUser(ctx.db, u));
});

route("POST", "/seller/team", (ctx) => {
  const { shop } = requireShopUser(ctx, P.sellerTeamManage);
  const { name, email, phone, role } = ctx.body ?? {};
  if (!["shop_manager", "shop_staff"].includes(role)) throw ApiError.validation("Invalid role.", { role: "Choose Shop Manager or Shop Staff." });
  const errors: Record<string, string> = {};
  if (ctx.db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) errors.email = "This email is already registered.";
  if (ctx.db.users.some((u) => u.phone === phone)) errors.phone = "This phone is already registered.";
  if (Object.keys(errors).length) throw ApiError.validation("Please fix the highlighted fields.", errors);
  const user = { id: newId("u"), name, email, phone, role, shopId: shop.id, status: "invited" as const, createdAt: nowIso() };
  ctx.db.users.push(user);
  audit(ctx, "seller.team.invited", "user", user.id, `Invited ${name} as ${role} to ${shop.name}`);
  return toSessionUser(ctx.db, user);
});

route("PATCH", "/seller/team/:userId", (ctx) => {
  const { user: me, shop } = requireShopUser(ctx, P.sellerTeamManage);
  const member = findOr404(ctx.db.users.find((u) => u.id === ctx.params.userId && u.shopId === shop.id), "Team member");
  if (member.id === me.id || member.role === "shop_admin") throw ApiError.forbidden("You can't change the shop admin's access.");
  if (ctx.body?.role) {
    if (!["shop_manager", "shop_staff"].includes(ctx.body.role)) throw ApiError.badRequest("Invalid role.");
    member.role = ctx.body.role;
  }
  if (ctx.body?.status) member.status = ctx.body.status;
  return toSessionUser(ctx.db, member);
});

route("DELETE", "/seller/team/:userId", (ctx) => {
  const { user: me, shop } = requireShopUser(ctx, P.sellerTeamManage);
  const member = findOr404(ctx.db.users.find((u) => u.id === ctx.params.userId && u.shopId === shop.id), "Team member");
  if (member.id === me.id || member.role === "shop_admin") throw ApiError.forbidden("You can't remove the shop admin.");
  ctx.db.users = ctx.db.users.filter((u) => u.id !== member.id);
  return { ok: true };
});

/* ---------------------------------------------------------------- misc */

route("GET", "/seller/categories", (ctx) => {
  ctx.requireAny(P.sellerProductsView, P.sellerCampaignsView);
  return ctx.db.categories;
});

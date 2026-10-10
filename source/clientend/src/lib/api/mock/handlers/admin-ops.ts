import type {
  Campaign,
  CampaignApplicationView,
  CampaignStatus,
  CampaignWithStats,
  ChangeRequestView,
  PackageStatus,
  PayoutView,
  Ticket,
  TicketView,
  VerificationRequestView,
  Voucher,
} from "@/types";
import { P } from "@/lib/auth/permissions";
import { ApiError } from "../../errors";
import type { MockDb } from "../db";
import { route } from "../router";
import { audit, basePrice, findOr404, matchesQuery, newId, nowIso, paginate, refreshOrder, shopRef, userName } from "../helpers";
import { toOrderView } from "./account";

/* ============================================================================
 * Verification (Lunetbuz Verified Badge)
 * ========================================================================== */

function verificationView(db: MockDb, id: string): VerificationRequestView {
  const r = findOr404(db.verificationRequests.find((x) => x.id === id), "Verification request");
  const p = db.products.find((x) => x.id === r.productId)!;
  return {
    ...r,
    product: { id: p.id, name: p.name, slug: p.slug, images: p.images, brand: p.brand, description: p.description, specs: p.specs, verification: p.verification },
    shop: shopRef(db, r.shopId),
    inspectorName: userName(db, r.inspection?.officerId),
    approverName: userName(db, r.approval?.officerId),
  };
}

route("GET", "/admin/verification/requests", (ctx) => {
  ctx.require(P.verificationView);
  let list = ctx.db.verificationRequests;
  if (ctx.query.status === "submitted") list = list.filter((r) => r.status === "submitted" || r.status === "inspection_scheduled");
  else if (ctx.query.status) list = list.filter((r) => r.status === ctx.query.status);
  const views = list.map((r) => verificationView(ctx.db, r.id)).filter((v) => matchesQuery(ctx.query.q, v.product.name, v.shop.name));
  return paginate(views.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), ctx.query);
});

route("GET", "/admin/verification/requests/:id", (ctx) => {
  ctx.require(P.verificationView);
  const view = verificationView(ctx.db, ctx.params.id!);
  return { ...view, badgeEvents: ctx.db.badgeEvents.filter((e) => e.productId === view.productId).map((e) => ({ ...e, byName: userName(ctx.db, e.by) })) };
});

route("POST", "/admin/verification/requests/:id/schedule", (ctx) => {
  ctx.require(P.verificationInspect);
  const r = findOr404(ctx.db.verificationRequests.find((x) => x.id === ctx.params.id), "Verification request");
  if (r.status !== "submitted") throw ApiError.conflict("INVALID_TRANSITION", "Only new requests can be scheduled.");
  r.status = "inspection_scheduled";
  audit(ctx, "verification.scheduled", "verification_request", r.id, `Scheduled ${r.inspectionMethod} inspection for ${r.id}`);
  return verificationView(ctx.db, r.id);
});

route("POST", "/admin/verification/requests/:id/inspection", (ctx) => {
  const me = ctx.require(P.verificationInspect);
  const r = findOr404(ctx.db.verificationRequests.find((x) => x.id === ctx.params.id), "Verification request");
  if (!["submitted", "inspection_scheduled"].includes(r.status)) throw ApiError.conflict("INVALID_TRANSITION", "This request has already been inspected.");
  const checklist = ctx.body?.checklist ?? {};
  const allPass = ["genuine", "matchesPhotos", "matchesDescription", "packagingIntact", "documentsValid"].every((k) => checklist[k] === true);
  const result = ctx.body?.result === "pass" && allPass ? "pass" : "fail";
  if (ctx.body?.result === "pass" && !allPass) throw ApiError.validation("Every checklist item must pass to recommend approval.", { checklist: "Incomplete" });
  if (!ctx.body?.notes || String(ctx.body.notes).length < 10) throw ApiError.validation("Add inspection notes.", { notes: "At least 10 characters." });
  r.inspection = { officerId: me.id, inspectedAt: nowIso(), result, notes: ctx.body.notes, checklist, evidence: ctx.body?.evidence ?? [] };
  const product = ctx.db.products.find((p) => p.id === r.productId)!;
  if (result === "pass") r.status = "awaiting_approval";
  else {
    r.status = "rejected";
    r.rejectionReason = ctx.body.notes;
    product.verification = { status: "none", verifiedAt: null, expiresAt: null };
  }
  audit(ctx, `verification.inspected`, "verification_request", r.id, `Inspection ${result.toUpperCase()} for "${product.name}"`);
  return verificationView(ctx.db, r.id);
});

route("POST", "/admin/verification/requests/:id/decision", (ctx) => {
  const me = ctx.require(P.verificationApprove);
  const r = findOr404(ctx.db.verificationRequests.find((x) => x.id === ctx.params.id), "Verification request");
  if (r.status !== "awaiting_approval") throw ApiError.conflict("INVALID_TRANSITION", "This request is not awaiting approval.");
  if (r.inspection?.officerId === me.id)
    throw ApiError.conflict("FOUR_EYES_REQUIRED", "You inspected this product. A different officer must give the second approval.");
  const product = ctx.db.products.find((p) => p.id === r.productId)!;
  const ts = nowIso();
  if (ctx.body?.decision === "approve") {
    r.status = "approved";
    r.approval = { officerId: me.id, approvedAt: ts, notes: ctx.body?.notes ?? null };
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    product.verification = { status: "verified", verifiedAt: ts, expiresAt: expires.toISOString() };
    ctx.db.badgeEvents.unshift({ id: newId("be"), productId: product.id, action: "granted", by: me.id, at: ts, reason: null });
    audit(ctx, "verification.approved", "product", product.id, `Granted Verified badge to "${product.name}" — content locked`);
  } else {
    if (!ctx.body?.reason) throw ApiError.validation("A reason is required.", { reason: "Required" });
    r.status = "rejected";
    r.rejectionReason = ctx.body.reason;
    product.verification = { status: "none", verifiedAt: null, expiresAt: null };
    audit(ctx, "verification.rejected", "product", product.id, `Rejected verification of "${product.name}"`);
  }
  return verificationView(ctx.db, r.id);
});

/** Suspend (complaint), revoke (confirmed fake) or reinstate a product's badge. */
route("POST", "/admin/verification/products/:productId/badge", (ctx) => {
  const action = ctx.body?.action as "suspend" | "revoke" | "reinstate";
  const me =
    action === "suspend" ? ctx.requireAny(P.verificationInspect, P.ticketsManage) : action === "revoke" ? ctx.require(P.verificationRevoke) : ctx.require(P.verificationApprove);
  const product = findOr404(ctx.db.products.find((p) => p.id === ctx.params.productId), "Product");
  if (!ctx.body?.reason && action !== "reinstate") throw ApiError.validation("A reason is required.", { reason: "Required" });
  const v = product.verification;
  if (action === "suspend" && v.status !== "verified") throw ApiError.conflict("INVALID_TRANSITION", "Only verified products can be suspended.");
  if (action === "revoke" && !["verified", "suspended"].includes(v.status)) throw ApiError.conflict("INVALID_TRANSITION", "Badge is not active.");
  if (action === "reinstate" && v.status !== "suspended") throw ApiError.conflict("INVALID_TRANSITION", "Only suspended badges can be reinstated.");

  if (action === "suspend") v.status = "suspended";
  if (action === "reinstate") v.status = "verified";
  if (action === "revoke") {
    v.status = "revoked";
    const shop = ctx.db.shops.find((s) => s.id === product.shopId);
    if (shop) shop.strikes += 1;
  }
  const past = { suspend: "suspended", revoke: "revoked", reinstate: "reinstated" } as const;
  ctx.db.badgeEvents.unshift({ id: newId("be"), productId: product.id, action: past[action], by: me.id, at: nowIso(), reason: ctx.body?.reason ?? null });
  audit(ctx, `verification.${past[action]}`, "product", product.id, `Badge ${past[action]} on "${product.name}"${ctx.body?.reason ? `: ${ctx.body.reason}` : ""}`);
  return product;
});

route("GET", "/admin/verification/change-requests", (ctx) => {
  ctx.require(P.verificationView);
  let list = ctx.db.changeRequests;
  if (ctx.query.status) list = list.filter((r) => r.status === ctx.query.status);
  return list
    .map((r) => {
      const p = ctx.db.products.find((x) => x.id === r.productId)!;
      return { ...r, product: { id: p.id, name: p.name, images: p.images, description: p.description }, shop: shopRef(ctx.db, r.shopId) } satisfies ChangeRequestView & { product: { description: string } };
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
});

route("POST", "/admin/verification/change-requests/:id/decision", (ctx) => {
  const me = ctx.require(P.verificationApprove);
  const cr = findOr404(ctx.db.changeRequests.find((x) => x.id === ctx.params.id), "Change request");
  if (cr.status !== "pending") throw ApiError.conflict("NOT_PENDING", "Already reviewed.");
  const product = ctx.db.products.find((p) => p.id === cr.productId)!;
  cr.reviewedBy = me.id;
  cr.reviewedAt = nowIso();
  cr.reviewNote = ctx.body?.note ?? "";
  if (ctx.body?.decision === "approve") {
    cr.status = "approved";
    Object.assign(product, cr.proposed);
    product.updatedAt = nowIso();
  } else {
    if (!ctx.body?.note) throw ApiError.validation("A note is required when rejecting.", { note: "Required" });
    cr.status = "rejected";
  }
  audit(ctx, `verification.change_${cr.status}`, "product", product.id, `Change request ${cr.id} ${cr.status} for "${product.name}"`);
  return cr;
});

/* ============================================================================
 * Campaigns & vouchers
 * ========================================================================== */

function withStats(db: MockDb, c: Campaign): CampaignWithStats {
  const apps = db.applications.filter((a) => a.campaignId === c.id);
  return {
    ...c,
    stats: {
      applications: apps.length,
      pendingApplications: apps.filter((a) => a.status === "pending").length,
      approvedItems: apps.flatMap((a) => a.items).filter((i) => i.status === "approved").length,
      shops: new Set(apps.map((a) => a.shopId)).size,
    },
  };
}

function applicationView(db: MockDb, appId: string): CampaignApplicationView {
  const a = findOr404(db.applications.find((x) => x.id === appId), "Application");
  const shop = db.shops.find((s) => s.id === a.shopId)!;
  return {
    ...a,
    shop: { id: shop.id, name: shop.name, slug: shop.slug, rating: shop.rating },
    itemsDetailed: a.items.map((i) => {
      const p = db.products.find((x) => x.id === i.productId);
      const v = p?.variants.find((x) => x.id === i.variantId);
      const ref = v ? basePrice(v) : 0;
      return { ...i, productName: p?.name ?? "Deleted", image: p?.images[0] ?? "ph://package/0", variantLabel: v ? Object.values(v.attributes).join(" / ") : "", referencePrice: ref, discountPct: ref ? Math.round(((ref - i.campaignPrice) / ref) * 100) : 0 };
    }),
  };
}

route("GET", "/admin/campaigns", (ctx) => {
  ctx.require(P.campaignsView);
  let list = ctx.db.campaigns;
  if (ctx.query.status) list = list.filter((c) => c.status === ctx.query.status);
  return list.map((c) => withStats(ctx.db, c)).sort((a, b) => b.startAt.localeCompare(a.startAt));
});

route("GET", "/admin/campaigns/:id", (ctx) => {
  ctx.require(P.campaignsView);
  const c = findOr404(ctx.db.campaigns.find((x) => x.id === ctx.params.id), "Campaign");
  return { campaign: withStats(ctx.db, c), applications: ctx.db.applications.filter((a) => a.campaignId === c.id).map((a) => applicationView(ctx.db, a.id)) };
});

function validateCampaign(body: Partial<Campaign>) {
  const errors: Record<string, string> = {};
  if (!body.name || body.name.length < 3) errors.name = "Name is required.";
  if (!body.registrationStart || !body.registrationEnd || body.registrationEnd <= body.registrationStart) errors.registrationEnd = "Registration must end after it starts.";
  if (!body.startAt || !body.endAt || body.endAt <= body.startAt) errors.endAt = "Campaign must end after it starts.";
  if (body.registrationEnd && body.startAt && body.startAt < body.registrationEnd) errors.startAt = "Campaign must start after registration closes.";
  if (Object.keys(errors).length) throw ApiError.validation("Please fix the highlighted fields.", errors);
}

route("POST", "/admin/campaigns", (ctx) => {
  const me = ctx.require(P.campaignsManage);
  const body = ctx.body as Partial<Campaign>;
  validateCampaign(body);
  const c: Campaign = {
    id: newId("cmp"),
    slug: `${body.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date(body.startAt!).getFullYear()}`,
    name: body.name!,
    type: body.type ?? "festival",
    status: "draft",
    banner: `ph://sparkles/${body.hue ?? 25}`,
    hue: body.hue ?? 25,
    tagline: body.tagline ?? "",
    description: body.description ?? "",
    registrationStart: body.registrationStart!,
    registrationEnd: body.registrationEnd!,
    startAt: body.startAt!,
    endAt: body.endAt!,
    rules: { minDiscountPct: 10, minStock: 5, maxProductsPerShop: 20, categoryIds: [], minShopRating: 4, verifiedOnly: false, ...body.rules },
    extraCommissionPct: body.extraCommissionPct ?? 0,
    voucherFundedBy: body.voucherFundedBy ?? "platform",
    createdBy: me.id,
    createdAt: nowIso(),
  };
  ctx.db.campaigns.unshift(c);
  audit(ctx, "campaign.created", "campaign", c.id, `Created campaign ${c.name}`);
  return withStats(ctx.db, c);
});

const CAMPAIGN_FLOW: Record<CampaignStatus, CampaignStatus | null> = {
  draft: "registration_open",
  registration_open: "registration_closed",
  registration_closed: "scheduled",
  scheduled: "live",
  live: "ended",
  ended: "settled",
  settled: null,
};

route("PATCH", "/admin/campaigns/:id", (ctx) => {
  ctx.require(P.campaignsManage);
  const c = findOr404(ctx.db.campaigns.find((x) => x.id === ctx.params.id), "Campaign");
  const { status, ...rest } = (ctx.body ?? {}) as Partial<Campaign>;
  if (status && status !== c.status) {
    if (CAMPAIGN_FLOW[c.status] !== status) throw ApiError.conflict("INVALID_TRANSITION", `A ${c.status} campaign can only move to ${CAMPAIGN_FLOW[c.status] ?? "nothing"}.`);
    if (status === "scheduled" && ctx.db.applications.some((a) => a.campaignId === c.id && a.status === "pending"))
      throw ApiError.conflict("PENDING_APPLICATIONS", "Review all pending applications before scheduling.");
    c.status = status;
  }
  if (Object.keys(rest).length) {
    if (!["draft", "registration_open"].includes(c.status)) throw ApiError.conflict("LOCKED", "Rules and dates can't change after registration closes.");
    const next = { ...c, ...rest, rules: { ...c.rules, ...rest.rules } };
    validateCampaign(next);
    Object.assign(c, next);
  }
  audit(ctx, "campaign.updated", "campaign", c.id, `Updated campaign ${c.name}${status ? ` → ${status}` : ""}`);
  return withStats(ctx.db, c);
});

route("POST", "/admin/campaign-applications/:id/review", (ctx) => {
  const me = ctx.require(P.campaignsReview);
  const app = findOr404(ctx.db.applications.find((a) => a.id === ctx.params.id), "Application");
  if (app.status !== "pending") throw ApiError.conflict("NOT_PENDING", "This application has already been reviewed.");
  const decisions: { variantId: string; decision: "approve" | "reject"; reason?: string }[] = ctx.body?.items ?? [];
  for (const item of app.items) {
    const d = decisions.find((x) => x.variantId === item.variantId);
    if (!d) throw ApiError.validation("Decide on every item.", { [item.variantId]: "Required" });
    if (d.decision === "reject" && !d.reason) throw ApiError.validation("Give a reason for every rejected item.", { [item.variantId]: "Reason required" });
    item.status = d.decision === "approve" ? "approved" : "rejected";
    item.rejectionReason = d.decision === "reject" ? d.reason! : null;
  }
  const approved = app.items.filter((i) => i.status === "approved").length;
  app.status = approved === app.items.length ? "approved" : approved === 0 ? "rejected" : "partially_approved";
  app.reviewedBy = me.id;
  app.reviewedAt = nowIso();
  audit(ctx, `campaign.application.${app.status}`, "campaign_application", app.id, `Application ${app.id}: ${approved}/${app.items.length} items approved`);
  return applicationView(ctx.db, app.id);
});

route("GET", "/admin/vouchers", (ctx) => {
  ctx.require(P.campaignsView);
  return ctx.db.vouchers.map((v) => ({ ...v, shopName: v.shopId ? shopRef(ctx.db, v.shopId).name : null }));
});

route("POST", "/admin/vouchers", (ctx) => {
  ctx.require(P.campaignsManage);
  const body = ctx.body as Partial<Voucher>;
  if (!body.code || !/^[A-Z0-9]{4,16}$/.test(body.code)) throw ApiError.validation("Invalid code.", { code: "4–16 uppercase letters or digits." });
  if (ctx.db.vouchers.some((v) => v.code === body.code)) throw ApiError.validation("Code already exists.", { code: "Must be unique." });
  const v: Voucher = { id: newId("v"), title: "", type: "fixed", value: 0, minSpend: 0, maxDiscount: null, fundedBy: "platform", shopId: null, usageLimit: null, used: 0, active: true, startAt: nowIso(), endAt: nowIso(), ...body, code: body.code };
  ctx.db.vouchers.unshift(v);
  audit(ctx, "voucher.created", "voucher", v.id, `Created voucher ${v.code}`);
  return v;
});

route("PATCH", "/admin/vouchers/:id", (ctx) => {
  ctx.require(P.campaignsManage);
  const v = findOr404(ctx.db.vouchers.find((x) => x.id === ctx.params.id), "Voucher");
  Object.assign(v, ctx.body, { id: v.id, code: v.code });
  return v;
});

/* ============================================================================
 * Orders
 * ========================================================================== */

route("GET", "/admin/orders", (ctx) => {
  ctx.require(P.ordersView);
  let list = ctx.db.orders;
  if (ctx.query.status) list = list.filter((o) => o.status === ctx.query.status);
  if (ctx.query.payment) list = list.filter((o) => o.payment.method === ctx.query.payment);
  if (ctx.query.q) list = list.filter((o) => matchesQuery(ctx.query.q, o.orderNo, o.shippingAddress.name, o.shippingAddress.phone, o.packages.map((p) => p.trackingNo ?? "").join(" ")));
  return paginate(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => toOrderView(ctx.db, o.id)), ctx.query);
});

route("GET", "/admin/orders/:id", (ctx) => {
  ctx.require(P.ordersView);
  return toOrderView(ctx.db, ctx.params.id!);
});

/** Ops/courier simulation: confirm COD orders by phone, mark shipped/delivered/returned, cancel. */
const OPS_TRANSITIONS: Partial<Record<PackageStatus, PackageStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  packed: ["cancelled"],
  ready_to_ship: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
};

route("POST", "/admin/orders/:id/packages/:packageId/status", (ctx) => {
  ctx.require(P.ordersManage);
  const order = findOr404(ctx.db.orders.find((o) => o.id === ctx.params.id), "Order");
  const pkg = findOr404(order.packages.find((p) => p.id === ctx.params.packageId), "Package");
  const target = ctx.body?.status as PackageStatus;
  if (!OPS_TRANSITIONS[pkg.status]?.includes(target)) throw ApiError.conflict("INVALID_TRANSITION", `A ${pkg.status} package can't be moved to ${target}.`);
  if (target === "cancelled" && !ctx.body?.note) throw ApiError.validation("A reason is required.", { note: "Required" });
  pkg.status = target;
  pkg.timeline.push({ status: target, at: nowIso(), note: ctx.body?.note || null });
  if (target === "cancelled" || target === "returned")
    for (const item of pkg.items) {
      const v = ctx.db.products.find((x) => x.id === item.productId)?.variants.find((x) => x.id === item.variantId);
      if (v) v.stock += item.qty;
    }
  if (target === "delivered" && order.payment.method === "cod" && order.packages.every((p) => ["delivered", "cancelled"].includes(p.status))) order.payment.status = "paid";
  if ((target === "cancelled" || target === "returned") && order.payment.status === "paid" && order.packages.every((p) => ["cancelled", "returned"].includes(p.status))) order.payment.status = "refunded";
  refreshOrder(order);
  audit(ctx, `order.package.${target}`, "order", order.id, `${order.orderNo} / ${pkg.id} → ${target}${ctx.body?.note ? ` (${ctx.body.note})` : ""}`);
  return toOrderView(ctx.db, order.id);
});

/* ============================================================================
 * Support tickets
 * ========================================================================== */

function ticketView(db: MockDb, t: Ticket): TicketView {
  const c = db.users.find((u) => u.id === t.customerId);
  return { ...t, customer: { id: t.customerId, name: c?.name ?? "Unknown", phone: c?.phone ?? "", email: c?.email ?? "" }, assigneeName: userName(db, t.assigneeId) };
}

route("GET", "/admin/tickets", (ctx) => {
  const me = ctx.require(P.ticketsView);
  let list = ctx.db.tickets;
  if (ctx.query.status === "open") list = list.filter((t) => !["resolved", "closed"].includes(t.status));
  else if (ctx.query.status) list = list.filter((t) => t.status === ctx.query.status);
  if (ctx.query.assignee === "me") list = list.filter((t) => t.assigneeId === me.id);
  const views = list.map((t) => ticketView(ctx.db, t)).filter((t) => matchesQuery(ctx.query.q, t.ticketNo, t.subject, t.customer.name, t.customer.phone));
  const rank = { urgent: 0, high: 1, normal: 2, low: 3 };
  return paginate(views.sort((a, b) => rank[a.priority] - rank[b.priority] || b.updatedAt.localeCompare(a.updatedAt)), ctx.query);
});

route("GET", "/admin/tickets/:id", (ctx) => {
  ctx.require(P.ticketsView);
  const t = findOr404(ctx.db.tickets.find((x) => x.id === ctx.params.id), "Ticket");
  return { ...ticketView(ctx.db, t), order: t.orderId ? toOrderView(ctx.db, t.orderId) : null };
});

route("POST", "/admin/tickets", (ctx) => {
  const me = ctx.require(P.ticketsManage);
  const { customerId, orderId, subject, category, priority, channel, message } = ctx.body ?? {};
  const errors: Record<string, string> = {};
  if (!ctx.db.users.some((u) => u.id === customerId)) errors.customerId = "Choose a customer.";
  if (!subject) errors.subject = "Required";
  if (!message) errors.message = "Required";
  if (Object.keys(errors).length) throw ApiError.validation("Please fix the highlighted fields.", errors);
  const ts = nowIso();
  const t: Ticket = {
    id: newId("t"),
    ticketNo: `TKT-${ts.slice(0, 10).replace(/-/g, "")}-${String(ctx.db.tickets.length + 1).padStart(3, "0")}`,
    customerId,
    orderId: orderId || null,
    channel: channel ?? "phone",
    category: category ?? "other",
    priority: priority ?? "normal",
    status: "open",
    subject,
    assigneeId: me.id,
    createdAt: ts,
    updatedAt: ts,
    messages: [{ from: "agent", authorName: me.name, body: message, at: ts }],
  };
  ctx.db.tickets.unshift(t);
  audit(ctx, "ticket.created", "ticket", t.id, `Created ${t.ticketNo}: ${subject}`);
  return ticketView(ctx.db, t);
});

route("POST", "/admin/tickets/:id/messages", (ctx) => {
  const me = ctx.require(P.ticketsManage);
  const t = findOr404(ctx.db.tickets.find((x) => x.id === ctx.params.id), "Ticket");
  const body = String(ctx.body?.body ?? "").trim();
  if (!body) throw ApiError.validation("Message can't be empty.", { body: "Required" });
  const ts = nowIso();
  t.messages.push({ from: "agent", authorName: me.name, body, at: ts });
  t.updatedAt = ts;
  if (t.status === "open") t.status = "pending_customer";
  return ticketView(ctx.db, t);
});

route("PATCH", "/admin/tickets/:id", (ctx) => {
  ctx.require(P.ticketsManage);
  const t = findOr404(ctx.db.tickets.find((x) => x.id === ctx.params.id), "Ticket");
  const { status, priority, assigneeId } = ctx.body ?? {};
  if (status) t.status = status;
  if (priority) t.priority = priority;
  if (assigneeId !== undefined) t.assigneeId = assigneeId;
  t.updatedAt = nowIso();
  if (status) t.messages.push({ from: "system", authorName: "System", body: `Status changed to ${status.replace(/_/g, " ")}`, at: t.updatedAt });
  audit(ctx, "ticket.updated", "ticket", t.id, `Updated ${t.ticketNo}: ${JSON.stringify(ctx.body)}`);
  return ticketView(ctx.db, t);
});

route("GET", "/admin/staff", (ctx) => {
  ctx.requireAny(P.ticketsManage, P.usersView);
  return ctx.db.users.filter((u) => ctx.db.roles.find((r) => r.key === u.role)?.portal === "admin" && u.status === "active").map((u) => ({ id: u.id, name: u.name, role: u.role }));
});

/* ============================================================================
 * Finance
 * ========================================================================== */

route("GET", "/admin/payouts", (ctx) => {
  ctx.require(P.financeView);
  let list = ctx.db.payouts;
  if (ctx.query.status) list = list.filter((p) => p.status === ctx.query.status);
  return list.map((p) => ({ ...p, shop: shopRef(ctx.db, p.shopId) }) satisfies PayoutView).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
});

route("POST", "/admin/payouts/:id/action", (ctx) => {
  const me = ctx.require(P.payoutsApprove);
  const p = findOr404(ctx.db.payouts.find((x) => x.id === ctx.params.id), "Payout");
  const action = ctx.body?.action as "approve" | "pay" | "hold" | "release";
  if (action === "approve" && p.status === "pending_approval") {
    p.status = "approved";
    p.approvedBy = me.id;
  } else if (action === "pay" && p.status === "approved") {
    if (!ctx.body?.reference) throw ApiError.validation("Transaction reference is required.", { reference: "Required" });
    p.status = "paid";
    p.reference = ctx.body.reference;
    p.paidAt = nowIso();
  } else if (action === "hold" && ["pending_approval", "approved"].includes(p.status)) {
    if (!ctx.body?.reason) throw ApiError.validation("A reason is required.", { reason: "Required" });
    p.status = "on_hold";
    p.holdReason = ctx.body.reason;
  } else if (action === "release" && p.status === "on_hold") {
    p.status = "pending_approval";
    delete p.holdReason;
  } else throw ApiError.conflict("INVALID_TRANSITION", `Can't ${action} a payout that is ${p.status.replace(/_/g, " ")}.`);
  audit(ctx, `payout.${action}`, "payout", p.id, `Payout ${p.id} (${shopRef(ctx.db, p.shopId).name}) → ${p.status}`);
  return { ...p, shop: shopRef(ctx.db, p.shopId) };
});

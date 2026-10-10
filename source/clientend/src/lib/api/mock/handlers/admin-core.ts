import type { AdminDashboard, Banner, Category, CustomerView, Kpi, RoleKey } from "@/types";
import { P, hasPermission } from "@/lib/auth/permissions";
import { ApiError } from "../../errors";
import { route, type MockContext } from "../router";
import { audit, findOr404, matchesQuery, newId, nowIso, paginate, toSessionUser, toShopSummary, userName } from "../helpers";
import { toOrderView } from "./account";

/* ---------------------------------------------------------------- dashboard */

route("GET", "/admin/dashboard", (ctx) => {
  const user = ctx.require(P.adminDashboard);
  const can = (p: string) => hasPermission(user.permissions, p);
  const { db } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const series = db.salesSeries.platform ?? [];
  const todayPoint = series.find((s) => s.date === today) ?? series.at(-1);
  const prevPoint = series.at(-2);

  const kpis: Kpi[] = [];
  if (can(P.financeView) || can(P.ordersView))
    kpis.push({ key: "gmv", label: "GMV today", value: todayPoint?.gmv ?? 0, format: "currency", delta: prevPoint ? ((todayPoint!.gmv - prevPoint.gmv) / prevPoint.gmv) * 100 : null });
  if (can(P.ordersView)) {
    kpis.push({ key: "orders", label: "Orders today", value: todayPoint?.orders ?? 0, format: "number" });
    kpis.push({ key: "pending_orders", label: "Unconfirmed COD orders", value: db.orders.filter((o) => o.status === "pending").length, format: "number" });
  }
  if (can(P.shopsView)) kpis.push({ key: "shops", label: "Active shops", value: db.shops.filter((s) => s.status === "active").length, format: "number" });
  if (can(P.verificationView)) kpis.push({ key: "verified", label: "Verified products", value: db.products.filter((p) => p.verification.status === "verified").length, format: "number" });
  if (can(P.campaignsView)) kpis.push({ key: "live_campaigns", label: "Live campaigns", value: db.campaigns.filter((c) => c.status === "live").length, format: "number" });
  if (can(P.ticketsView)) kpis.push({ key: "open_tickets", label: "Open tickets", value: db.tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length, format: "number" });
  if (can(P.financeView)) kpis.push({ key: "payouts_due", label: "Payouts awaiting approval", value: db.payouts.filter((p) => p.status === "pending_approval").reduce((s, p) => s + p.netAmount, 0), format: "currency" });

  const queues: AdminDashboard["queues"] = [
    { key: "products", label: "Products awaiting QC", count: db.products.filter((p) => p.status === "pending_review").length, href: "/admin/products?status=pending_review", permission: P.productsModerate },
    { key: "reviews", label: "Flagged reviews", count: db.reviews.filter((r) => r.status === "flagged").length, href: "/admin/reviews", permission: P.productsModerate },
    { key: "inspections", label: "Verification: to inspect", count: db.verificationRequests.filter((r) => r.status === "submitted" || r.status === "inspection_scheduled").length, href: "/admin/verification?status=submitted", permission: P.verificationInspect },
    { key: "approvals", label: "Verification: awaiting 2nd approval", count: db.verificationRequests.filter((r) => r.status === "awaiting_approval").length, href: "/admin/verification?status=awaiting_approval", permission: P.verificationApprove },
    { key: "change_requests", label: "Locked-content change requests", count: db.changeRequests.filter((r) => r.status === "pending").length, href: "/admin/verification/change-requests", permission: P.verificationApprove },
    { key: "applications", label: "Campaign applications to review", count: db.applications.filter((a) => a.status === "pending").length, href: "/admin/campaigns", permission: P.campaignsReview },
    { key: "shops", label: "Shops awaiting approval", count: db.shops.filter((s) => s.status === "pending").length, href: "/admin/shops?status=pending", permission: P.shopsApprove },
    { key: "tickets", label: "Open support tickets", count: db.tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length, href: "/admin/tickets", permission: P.ticketsView },
    { key: "cod", label: "COD orders to confirm", count: db.orders.filter((o) => o.status === "pending" && o.payment.method === "cod").length, href: "/admin/orders?status=pending", permission: P.ordersManage },
    { key: "payouts", label: "Payouts to approve", count: db.payouts.filter((p) => p.status === "pending_approval").length, href: "/admin/finance", permission: P.payoutsApprove },
  ].filter((q) => can(q.permission));

  return { kpis, series: can(P.ordersView) || can(P.financeView) ? series : null, queues } satisfies AdminDashboard;
});

/* ---------------------------------------------------------------- users & roles */

route("GET", "/admin/users", (ctx) => {
  ctx.require(P.usersView);
  let list = ctx.db.users.map((u) => toSessionUser(ctx.db, u));
  if (ctx.query.portal) list = list.filter((u) => u.portal === ctx.query.portal);
  if (ctx.query.role) list = list.filter((u) => u.role === ctx.query.role);
  if (ctx.query.status) list = list.filter((u) => u.status === ctx.query.status);
  if (ctx.query.q) list = list.filter((u) => matchesQuery(ctx.query.q, u.name, u.email, u.phone));
  return paginate(list, ctx.query, 20);
});

function assertCanAssign(ctx: MockContext, roleKey: RoleKey) {
  const me = ctx.requireUser();
  const myRole = ctx.db.roles.find((r) => r.key === me.role)!;
  const target = ctx.db.roles.find((r) => r.key === roleKey);
  if (!target) throw ApiError.validation("Unknown role.", { role: "Choose a valid role." });
  if (target.portal !== "admin") throw ApiError.validation("Staff accounts must use a staff role.", { role: "Choose a staff role." });
  if (me.role !== "super_admin" && target.level >= myRole.level) throw ApiError.forbidden("You can only assign roles below your own level.");
}

route("POST", "/admin/users", (ctx) => {
  ctx.require(P.usersManage);
  const { name, email, phone, role } = ctx.body ?? {};
  assertCanAssign(ctx, role);
  const errors: Record<string, string> = {};
  if (ctx.db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) errors.email = "Email already in use.";
  if (ctx.db.users.some((u) => u.phone === phone)) errors.phone = "Phone already in use.";
  if (Object.keys(errors).length) throw ApiError.validation("Please fix the highlighted fields.", errors);
  const user = { id: newId("u"), name, email, phone, role, shopId: null, status: "invited" as const, createdAt: nowIso() };
  ctx.db.users.push(user);
  audit(ctx, "user.invited", "user", user.id, `Invited ${name} as ${role}`);
  return toSessionUser(ctx.db, user);
});

route("PATCH", "/admin/users/:id", (ctx) => {
  const me = ctx.require(P.usersManage);
  const user = findOr404(ctx.db.users.find((u) => u.id === ctx.params.id), "User");
  if (user.id === me.id) throw ApiError.forbidden("You can't change your own access.");
  if (user.role === "super_admin" && me.role !== "super_admin") throw ApiError.forbidden("Only a super admin can change another super admin.");
  if (ctx.body?.role && ctx.body.role !== user.role) {
    assertCanAssign(ctx, ctx.body.role);
    user.role = ctx.body.role;
  }
  if (ctx.body?.status) user.status = ctx.body.status;
  audit(ctx, "user.updated", "user", user.id, `Updated ${user.name}: ${JSON.stringify(ctx.body)}`);
  return toSessionUser(ctx.db, user);
});

route("GET", "/admin/roles", (ctx) => {
  ctx.require(P.rolesView);
  return ctx.db.roles.map((r) => ({ ...r, userCount: ctx.db.users.filter((u) => u.role === r.key).length }));
});

route("PATCH", "/admin/roles/:key", (ctx) => {
  ctx.require(P.rolesManage);
  const role = findOr404(ctx.db.roles.find((r) => r.key === ctx.params.key), "Role");
  if (role.key === "super_admin") throw ApiError.forbidden("The Super Admin role can't be modified.");
  if (!Array.isArray(ctx.body?.permissions)) throw ApiError.badRequest("permissions must be an array.");
  role.permissions = ctx.body.permissions;
  audit(ctx, "role.updated", "role", role.key, `Updated permissions of ${role.label} (${role.permissions.length} permissions)`);
  return role;
});

/* ---------------------------------------------------------------- shops */

route("GET", "/admin/shops", (ctx) => {
  ctx.require(P.shopsView);
  let list = ctx.db.shops;
  if (ctx.query.status) list = list.filter((s) => s.status === ctx.query.status);
  if (ctx.query.q) list = list.filter((s) => matchesQuery(ctx.query.q, s.name, s.location.district));
  return paginate(
    list.map((s) => ({ ...s, ...toShopSummary(ctx.db, s), ownerName: userName(ctx.db, s.ownerId) })),
    ctx.query,
    20,
  );
});

route("GET", "/admin/shops/:id", (ctx) => {
  ctx.require(P.shopsView);
  const shop = findOr404(ctx.db.shops.find((s) => s.id === ctx.params.id), "Shop");
  return {
    ...shop,
    summary: toShopSummary(ctx.db, shop),
    owner: shop.ownerId ? toSessionUser(ctx.db, ctx.db.users.find((u) => u.id === shop.ownerId)!) : null,
    team: ctx.db.users.filter((u) => u.shopId === shop.id).map((u) => toSessionUser(ctx.db, u)),
    products: ctx.db.products.filter((p) => p.shopId === shop.id),
  };
});

route("POST", "/admin/shops/:id/status", (ctx) => {
  const target = ctx.body?.status as "active" | "suspended";
  const shop = findOr404(ctx.db.shops.find((s) => s.id === ctx.params.id), "Shop");
  if (shop.status === "pending" && target === "active") {
    ctx.require(P.shopsApprove);
    shop.kyc.status = "approved";
  } else if (target === "suspended" || (shop.status === "suspended" && target === "active")) ctx.require(P.shopsSuspend);
  else throw ApiError.conflict("INVALID_TRANSITION", `Can't move a ${shop.status} shop to ${target}.`);
  shop.status = target;
  audit(ctx, `shop.${target === "active" ? "activated" : "suspended"}`, "shop", shop.id, `${target === "active" ? "Activated" : "Suspended"} ${shop.name}${ctx.body?.reason ? `: ${ctx.body.reason}` : ""}`);
  return shop;
});

/* ---------------------------------------------------------------- products & reviews */

route("GET", "/admin/products", (ctx) => {
  ctx.require(P.productsView);
  let list = ctx.db.products;
  if (ctx.query.status) list = list.filter((p) => p.status === ctx.query.status);
  if (ctx.query.verification) list = list.filter((p) => p.verification.status === ctx.query.verification);
  if (ctx.query.shop) list = list.filter((p) => p.shopId === ctx.query.shop);
  if (ctx.query.q) list = list.filter((p) => matchesQuery(ctx.query.q, p.name, p.brand));
  return paginate(
    [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((p) => ({ ...p, shopName: ctx.db.shops.find((s) => s.id === p.shopId)?.name ?? "" })),
    ctx.query,
    20,
  );
});

route("GET", "/admin/products/:id", (ctx) => {
  ctx.require(P.productsView);
  const p = findOr404(ctx.db.products.find((x) => x.id === ctx.params.id), "Product");
  return { ...p, shopName: ctx.db.shops.find((s) => s.id === p.shopId)?.name ?? "", badgeEvents: ctx.db.badgeEvents.filter((e) => e.productId === p.id) };
});

route("POST", "/admin/products/:id/moderate", (ctx) => {
  ctx.require(P.productsModerate);
  const p = findOr404(ctx.db.products.find((x) => x.id === ctx.params.id), "Product");
  if (p.status !== "pending_review") throw ApiError.conflict("NOT_PENDING", "Only products awaiting review can be moderated.");
  if (ctx.body?.decision === "approve") {
    p.status = "active";
    p.rejectionReason = null;
  } else {
    if (!ctx.body?.reason) throw ApiError.validation("A reason is required.", { reason: "Tell the seller what to fix." });
    p.status = "rejected";
    p.rejectionReason = ctx.body.reason;
  }
  p.updatedAt = nowIso();
  audit(ctx, `product.${p.status === "active" ? "approved" : "rejected"}`, "product", p.id, `${p.status === "active" ? "Approved" : "Rejected"} "${p.name}"`);
  return p;
});

route("GET", "/admin/reviews", (ctx) => {
  ctx.require(P.productsModerate);
  let list = ctx.db.reviews;
  if (ctx.query.status) list = list.filter((r) => r.status === ctx.query.status);
  return paginate(
    list.map((r) => ({ ...r, productName: ctx.db.products.find((p) => p.id === r.productId)?.name ?? "" })).sort((a, b) => Number(b.status === "flagged") - Number(a.status === "flagged")),
    ctx.query,
  );
});

route("POST", "/admin/reviews/:id/moderate", (ctx) => {
  ctx.require(P.productsModerate);
  const r = findOr404(ctx.db.reviews.find((x) => x.id === ctx.params.id), "Review");
  r.status = ctx.body?.decision === "remove" ? "removed" : "published";
  audit(ctx, `review.${r.status}`, "review", r.id, `Review ${r.id} ${r.status}`);
  return r;
});

/* ---------------------------------------------------------------- categories */

route("GET", "/admin/categories", (ctx) => {
  ctx.requireAny(P.categoriesManage, P.productsView, P.campaignsView);
  return ctx.db.categories.map((c) => ({ ...c, productCount: ctx.db.products.filter((p) => p.categoryId === c.id).length }));
});

route("POST", "/admin/categories", (ctx) => {
  ctx.require(P.categoriesManage);
  const body = ctx.body as Partial<Category>;
  if (!body.name) throw ApiError.validation("Name is required.", { name: "Required" });
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (ctx.db.categories.some((c) => c.slug === slug)) throw ApiError.validation("Slug already exists.", { slug: "Must be unique" });
  const category: Category = { id: newId("c"), slug, name: body.name, nameBn: body.nameBn ?? "", icon: body.icon ?? "package", hue: body.hue ?? 220, parentId: body.parentId ?? null, sort: body.sort ?? 99 };
  ctx.db.categories.push(category);
  audit(ctx, "category.created", "category", category.id, `Created category ${category.name}`);
  return category;
});

route("PATCH", "/admin/categories/:id", (ctx) => {
  ctx.require(P.categoriesManage);
  const c = findOr404(ctx.db.categories.find((x) => x.id === ctx.params.id), "Category");
  Object.assign(c, ctx.body, { id: c.id });
  audit(ctx, "category.updated", "category", c.id, `Updated category ${c.name}`);
  return c;
});

/* ---------------------------------------------------------------- customers */

function customerView(ctx: MockContext, id: string): CustomerView {
  const u = findOr404(ctx.db.users.find((x) => x.id === id && x.role === "customer"), "Customer");
  const orders = ctx.db.orders.filter((o) => o.customerId === u.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u;
  return {
    ...rest,
    risk: ctx.db.riskProfiles.find((r) => r.userId === u.id) ?? null,
    orderCount: orders.length,
    totalSpent: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totals.total, 0),
  };
}

route("GET", "/admin/customers", (ctx) => {
  ctx.require(P.customersView);
  const list = ctx.db.users.filter((u) => u.role === "customer" && matchesQuery(ctx.query.q, u.name, u.phone, u.email)).map((u) => customerView(ctx, u.id));
  return paginate(list, ctx.query);
});

route("GET", "/admin/customers/:id", (ctx) => {
  ctx.require(P.customersView);
  const customer = customerView(ctx, ctx.params.id!);
  return {
    customer,
    orders: ctx.db.orders.filter((o) => o.customerId === customer.id).map((o) => toOrderView(ctx.db, o.id)),
    tickets: ctx.db.tickets.filter((t) => t.customerId === customer.id),
    addresses: ctx.db.addresses.filter((a) => a.userId === customer.id),
  };
});

route("POST", "/admin/customers/:id/status", (ctx) => {
  ctx.require(P.usersManage);
  const u = findOr404(ctx.db.users.find((x) => x.id === ctx.params.id && x.role === "customer"), "Customer");
  u.status = ctx.body?.status === "suspended" ? "suspended" : "active";
  audit(ctx, `customer.${u.status}`, "user", u.id, `Customer ${u.name} ${u.status}`);
  return customerView(ctx, u.id);
});

/* ---------------------------------------------------------------- CMS */

route("GET", "/admin/cms/banners", (ctx) => {
  ctx.require(P.cmsManage);
  return [...ctx.db.banners].sort((a, b) => a.sort - b.sort);
});

route("POST", "/admin/cms/banners", (ctx) => {
  ctx.require(P.cmsManage);
  const banner: Banner = { placement: "home_hero", icon: "sparkles", hue: 220, active: false, sort: ctx.db.banners.length + 1, startAt: null, endAt: null, cta: "Shop now", href: "/", subtitle: "", ...ctx.body, id: newId("bn") };
  if (!banner.title) throw ApiError.validation("Title is required.", { title: "Required" });
  ctx.db.banners.push(banner);
  audit(ctx, "cms.banner.created", "banner", banner.id, `Created banner "${banner.title}"`);
  return banner;
});

route("PATCH", "/admin/cms/banners/:id", (ctx) => {
  ctx.require(P.cmsManage);
  const b = findOr404(ctx.db.banners.find((x) => x.id === ctx.params.id), "Banner");
  Object.assign(b, ctx.body, { id: b.id });
  audit(ctx, "cms.banner.updated", "banner", b.id, `Updated banner "${b.title}"`);
  return b;
});

route("DELETE", "/admin/cms/banners/:id", (ctx) => {
  ctx.require(P.cmsManage);
  ctx.db.banners = ctx.db.banners.filter((b) => b.id !== ctx.params.id);
  return { ok: true };
});

/* ---------------------------------------------------------------- audit */

route("GET", "/admin/audit-logs", (ctx) => {
  ctx.require(P.auditView);
  const list = ctx.db.auditLogs
    .filter((l) => matchesQuery(ctx.query.q, l.summary, l.action, l.entityId))
    .map((l) => ({ ...l, actorName: userName(ctx.db, l.actorId) ?? "System" }))
    .sort((a, b) => b.at.localeCompare(a.at));
  return paginate(list, ctx.query, 25);
});

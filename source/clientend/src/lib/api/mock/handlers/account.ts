import type { Address, OrderView } from "@/types";
import { ApiError } from "../../errors";
import type { MockDb } from "../db";
import { route, type MockContext } from "../router";
import { findOr404, isLive, newId, nowIso, paginate, refreshOrder, shopRef, toProductCard } from "../helpers";

function customer(ctx: MockContext) {
  const user = ctx.requireUser();
  if (user.portal !== "store") throw ApiError.forbidden("Only customer accounts have a shopping account.");
  return user;
}

export function toOrderView(db: MockDb, orderId: string): OrderView {
  const order = findOr404(db.orders.find((o) => o.id === orderId), "Order");
  const c = db.users.find((u) => u.id === order.customerId);
  return {
    ...order,
    customer: { id: order.customerId, name: c?.name ?? "Customer", phone: c?.phone ?? "", email: c?.email ?? "" },
    packages: order.packages.map((p) => ({ ...p, shop: shopRef(db, p.shopId) })),
  };
}

/* ---------------------------------------------------------------- orders */

route("GET", "/account/orders", (ctx) => {
  const user = customer(ctx);
  let list = ctx.db.orders.filter((o) => o.customerId === user.id);
  const tab = ctx.query.status;
  if (tab === "to_pay") list = list.filter((o) => o.payment.status === "pending" && o.payment.method !== "cod");
  else if (tab === "to_ship") list = list.filter((o) => ["pending", "confirmed", "packed", "ready_to_ship", "processing"].includes(o.status));
  else if (tab === "to_receive") list = list.filter((o) => o.status === "shipped" || o.status === "partially_delivered");
  else if (tab === "completed") list = list.filter((o) => o.status === "delivered");
  else if (tab === "cancelled") list = list.filter((o) => o.status === "cancelled" || o.status === "returned");
  return paginate(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => toOrderView(ctx.db, o.id)), ctx.query, 10);
});

route("GET", "/account/orders/:id", (ctx) => {
  const user = customer(ctx);
  const view = toOrderView(ctx.db, ctx.params.id!);
  if (view.customerId !== user.id) throw ApiError.notFound("Order not found.");
  return view;
});

route("POST", "/account/orders/:id/cancel", (ctx) => {
  const user = customer(ctx);
  const order = ctx.db.orders.find((o) => o.id === ctx.params.id && o.customerId === user.id);
  if (!order) throw ApiError.notFound("Order not found.");
  if (!order.packages.every((p) => p.status === "pending" || p.status === "confirmed"))
    throw ApiError.conflict("NOT_CANCELLABLE", "This order is already being prepared and can't be cancelled. Please contact support.");
  const ts = nowIso();
  for (const p of order.packages) {
    p.status = "cancelled";
    p.timeline.push({ status: "cancelled", at: ts, note: `Cancelled by customer${ctx.body?.reason ? `: ${ctx.body.reason}` : ""}` });
    for (const item of p.items) {
      const v = ctx.db.products.find((x) => x.id === item.productId)?.variants.find((x) => x.id === item.variantId);
      if (v) v.stock += item.qty;
    }
  }
  if (order.payment.status === "paid") order.payment.status = "refunded";
  refreshOrder(order);
  return toOrderView(ctx.db, order.id);
});

/* ---------------------------------------------------------------- addresses */

route("GET", "/account/addresses", (ctx) => {
  const user = customer(ctx);
  return ctx.db.addresses.filter((a) => a.userId === user.id).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
});

route("POST", "/account/addresses", (ctx) => {
  const user = customer(ctx);
  const mine = ctx.db.addresses.filter((a) => a.userId === user.id);
  const address: Address = { ...ctx.body, id: newId("a"), userId: user.id, isDefault: Boolean(ctx.body?.isDefault) || mine.length === 0 };
  if (address.isDefault) mine.forEach((a) => (a.isDefault = false));
  ctx.db.addresses.push(address);
  return address;
});

route("PATCH", "/account/addresses/:id", (ctx) => {
  const user = customer(ctx);
  const address = findOr404(ctx.db.addresses.find((a) => a.id === ctx.params.id && a.userId === user.id), "Address");
  Object.assign(address, ctx.body, { id: address.id, userId: user.id });
  if (ctx.body?.isDefault) ctx.db.addresses.forEach((a) => a.userId === user.id && a.id !== address.id && (a.isDefault = false));
  return address;
});

route("DELETE", "/account/addresses/:id", (ctx) => {
  const user = customer(ctx);
  const idx = ctx.db.addresses.findIndex((a) => a.id === ctx.params.id && a.userId === user.id);
  if (idx < 0) throw ApiError.notFound("Address not found.");
  const [removed] = ctx.db.addresses.splice(idx, 1);
  if (removed!.isDefault) {
    const next = ctx.db.addresses.find((a) => a.userId === user.id);
    if (next) next.isDefault = true;
  }
  return { ok: true };
});

/* ---------------------------------------------------------------- wishlist */

function wishlistOf(ctx: MockContext, userId: string) {
  let w = ctx.db.wishlists.find((x) => x.userId === userId);
  if (!w) {
    w = { userId, productIds: [] };
    ctx.db.wishlists.push(w);
  }
  return w;
}

route("GET", "/account/wishlist", (ctx) => {
  const user = customer(ctx);
  const w = wishlistOf(ctx, user.id);
  return ctx.db.products.filter((p) => w.productIds.includes(p.id) && isLive(p, ctx.db)).map((p) => toProductCard(ctx.db, p));
});

route("GET", "/account/wishlist/ids", (ctx) => {
  if (!ctx.user || ctx.user.portal !== "store") return [];
  return wishlistOf(ctx, ctx.user.id).productIds;
});

route("PUT", "/account/wishlist/:productId", (ctx) => {
  const user = customer(ctx);
  const w = wishlistOf(ctx, user.id);
  if (!w.productIds.includes(ctx.params.productId!)) w.productIds.unshift(ctx.params.productId!);
  return w.productIds;
});

route("DELETE", "/account/wishlist/:productId", (ctx) => {
  const user = customer(ctx);
  const w = wishlistOf(ctx, user.id);
  w.productIds = w.productIds.filter((id) => id !== ctx.params.productId);
  return w.productIds;
});

/* ---------------------------------------------------------------- profile */

route("PATCH", "/account/profile", (ctx) => {
  const session = ctx.requireUser();
  const user = findOr404(ctx.db.users.find((u) => u.id === session.id), "User");
  if (ctx.body?.name) user.name = String(ctx.body.name).trim();
  if (ctx.body?.email !== undefined) user.email = String(ctx.body.email).trim();
  return { ...session, name: user.name, email: user.email, updatedAt: nowIso() };
});

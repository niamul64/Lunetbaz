import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryPolicy } from "@/lib/cache/query-policy";
import type {
  Address,
  AdminDashboard,
  AuditLog,
  BadgeEvent,
  Banner,
  Campaign,
  CampaignApplicationView,
  CampaignWithStats,
  Category,
  ChangeRequestView,
  CustomerView,
  InspectionChecklist,
  ListParams,
  OrderView,
  PackageStatus,
  Paginated,
  PayoutView,
  Product,
  Review,
  Role,
  SessionUser,
  Shop,
  ShopSummary,
  Ticket,
  TicketView,
  VerificationRequestView,
  Voucher,
} from "@/types";

export type AdminShopRow = Shop & ShopSummary & { ownerName: string | null };
export type AdminProductRow = Product & { shopName: string };
export type RoleWithCount = Role & { userCount: number };

export interface AdminShopDetail extends Shop {
  summary: ShopSummary;
  owner: SessionUser | null;
  team: SessionUser[];
  products: Product[];
}

export interface CustomerDetail {
  customer: CustomerView;
  orders: OrderView[];
  tickets: Ticket[];
  addresses: Address[];
}

export type ChangeRequestRow = ChangeRequestView & { product: { description: string } };

export const adminService = {
  dashboard: () => api.get<AdminDashboard>("/admin/dashboard"),

  users: (params: ListParams & { portal?: string; role?: string }) => api.get<Paginated<SessionUser>>("/admin/users", { query: { ...params } }),
  inviteUser: (input: { name: string; email: string; phone: string; role: string }) => api.post<SessionUser>("/admin/users", input),
  updateUser: (id: string, input: { role?: string; status?: string }) => api.patch<SessionUser>(`/admin/users/${id}`, input),
  roles: () => api.get<RoleWithCount[]>("/admin/roles"),
  updateRole: (key: string, permissions: string[]) => api.patch<Role>(`/admin/roles/${key}`, { permissions }),
  staff: () => api.get<{ id: string; name: string; role: string }[]>("/admin/staff"),

  shops: (params: ListParams) => api.get<Paginated<AdminShopRow>>("/admin/shops", { query: { ...params } }),
  shop: (id: string) => api.get<AdminShopDetail>(`/admin/shops/${id}`),
  setShopStatus: (id: string, status: "active" | "suspended", reason?: string) => api.post<Shop>(`/admin/shops/${id}/status`, { status, reason }),

  products: (params: ListParams & { verification?: string; shop?: string }) => api.get<Paginated<AdminProductRow>>("/admin/products", { query: { ...params } }),
  product: (id: string) => api.get<AdminProductRow & { badgeEvents: BadgeEvent[] }>(`/admin/products/${id}`),
  moderateProduct: (id: string, decision: "approve" | "reject", reason?: string) => api.post<Product>(`/admin/products/${id}/moderate`, { decision, reason }),
  reviews: (params: ListParams) => api.get<Paginated<Review & { productName: string }>>("/admin/reviews", { query: { ...params } }),
  moderateReview: (id: string, decision: "publish" | "remove") => api.post<Review>(`/admin/reviews/${id}/moderate`, { decision }),

  categories: () => api.get<(Category & { productCount: number })[]>("/admin/categories"),
  createCategory: (input: Partial<Category>) => api.post<Category>("/admin/categories", input),
  updateCategory: (id: string, input: Partial<Category>) => api.patch<Category>(`/admin/categories/${id}`, input),

  verificationRequests: (params: ListParams) => api.get<Paginated<VerificationRequestView>>("/admin/verification/requests", { query: { ...params } }),
  verificationRequest: (id: string) =>
    api.get<VerificationRequestView & { badgeEvents: (BadgeEvent & { byName: string | null })[] }>(`/admin/verification/requests/${id}`),
  scheduleInspection: (id: string) => api.post<VerificationRequestView>(`/admin/verification/requests/${id}/schedule`),
  submitInspection: (id: string, input: { checklist: InspectionChecklist; notes: string; result: "pass" | "fail"; evidence?: string[] }) =>
    api.post<VerificationRequestView>(`/admin/verification/requests/${id}/inspection`, input),
  decideVerification: (id: string, input: { decision: "approve" | "reject"; notes?: string; reason?: string }) =>
    api.post<VerificationRequestView>(`/admin/verification/requests/${id}/decision`, input),
  badgeAction: (productId: string, action: "suspend" | "revoke" | "reinstate", reason?: string) =>
    api.post<Product>(`/admin/verification/products/${productId}/badge`, { action, reason }),
  changeRequests: (status?: string) => api.get<ChangeRequestRow[]>("/admin/verification/change-requests", { query: { status } }),
  decideChangeRequest: (id: string, decision: "approve" | "reject", note?: string) => api.post(`/admin/verification/change-requests/${id}/decision`, { decision, note }),

  campaigns: (status?: string) => api.get<CampaignWithStats[]>("/admin/campaigns", { query: { status } }),
  campaign: (id: string) => api.get<{ campaign: CampaignWithStats; applications: CampaignApplicationView[] }>(`/admin/campaigns/${id}`),
  createCampaign: (input: Partial<Campaign>) => api.post<CampaignWithStats>("/admin/campaigns", input),
  updateCampaign: (id: string, input: Partial<Campaign>) => api.patch<CampaignWithStats>(`/admin/campaigns/${id}`, input),
  reviewApplication: (id: string, items: { variantId: string; decision: "approve" | "reject"; reason?: string }[]) =>
    api.post<CampaignApplicationView>(`/admin/campaign-applications/${id}/review`, { items }),
  vouchers: () => api.get<(Voucher & { shopName: string | null })[]>("/admin/vouchers"),
  createVoucher: (input: Partial<Voucher>) => api.post<Voucher>("/admin/vouchers", input),
  updateVoucher: (id: string, input: Partial<Voucher>) => api.patch<Voucher>(`/admin/vouchers/${id}`, input),

  orders: (params: ListParams & { payment?: string }) => api.get<Paginated<OrderView>>("/admin/orders", { query: { ...params } }),
  order: (id: string) => api.get<OrderView>(`/admin/orders/${id}`),
  updatePackage: (orderId: string, packageId: string, status: PackageStatus, note?: string) =>
    api.post<OrderView>(`/admin/orders/${orderId}/packages/${packageId}/status`, { status, note }),

  customers: (params: ListParams) => api.get<Paginated<CustomerView>>("/admin/customers", { query: { ...params } }),
  customer: (id: string) => api.get<CustomerDetail>(`/admin/customers/${id}`),
  setCustomerStatus: (id: string, status: "active" | "suspended") => api.post<CustomerView>(`/admin/customers/${id}/status`, { status }),

  tickets: (params: ListParams & { assignee?: "me" }) => api.get<Paginated<TicketView>>("/admin/tickets", { query: { ...params } }),
  ticket: (id: string) => api.get<TicketView & { order: OrderView | null }>(`/admin/tickets/${id}`),
  createTicket: (input: { customerId: string; orderId?: string; subject: string; category: string; priority: string; channel: string; message: string }) =>
    api.post<TicketView>("/admin/tickets", input),
  replyTicket: (id: string, body: string) => api.post<TicketView>(`/admin/tickets/${id}/messages`, { body }),
  updateTicket: (id: string, input: { status?: string; priority?: string; assigneeId?: string | null }) => api.patch<TicketView>(`/admin/tickets/${id}`, input),

  payouts: (status?: string) => api.get<PayoutView[]>("/admin/payouts", { query: { status } }),
  payoutAction: (id: string, action: "approve" | "pay" | "hold" | "release", extra?: { reference?: string; reason?: string }) =>
    api.post<PayoutView>(`/admin/payouts/${id}/action`, { action, ...extra }),

  banners: () => api.get<Banner[]>("/admin/cms/banners"),
  createBanner: (input: Partial<Banner>) => api.post<Banner>("/admin/cms/banners", input),
  updateBanner: (id: string, input: Partial<Banner>) => api.patch<Banner>(`/admin/cms/banners/${id}`, input),
  deleteBanner: (id: string) => api.delete<{ ok: boolean }>(`/admin/cms/banners/${id}`),

  auditLogs: (params: ListParams) => api.get<Paginated<AuditLog>>("/admin/audit-logs", { query: { ...params } }),
};

const k = (...parts: unknown[]) => ["admin", ...parts];
const { live, private: priv, reference } = queryPolicy;

/**
 * Query keys + cache tier for the admin portal.
 *  live      – work queues several staff act on at once (orders, tickets, verification, dashboard)
 *  reference – roles, staff, categories
 *  private   – everything else
 */
export const adminQueries = {
  all: ["admin"] as const,
  dashboard: () => queryOptions({ queryKey: k("dashboard"), queryFn: adminService.dashboard, ...live }),
  users: (p: ListParams & { portal?: string; role?: string }) => queryOptions({ queryKey: k("users", p), queryFn: () => adminService.users(p), ...priv }),
  roles: () => queryOptions({ queryKey: k("roles"), queryFn: adminService.roles, ...reference }),
  staff: () => queryOptions({ queryKey: k("staff"), queryFn: adminService.staff, ...reference }),
  shops: (p: ListParams) => queryOptions({ queryKey: k("shops", p), queryFn: () => adminService.shops(p), ...priv }),
  shop: (id: string) => queryOptions({ queryKey: k("shop", id), queryFn: () => adminService.shop(id), ...priv }),
  products: (p: ListParams & { verification?: string; shop?: string }) => queryOptions({ queryKey: k("products", p), queryFn: () => adminService.products(p), ...priv }),
  product: (id: string) => queryOptions({ queryKey: k("product", id), queryFn: () => adminService.product(id), ...priv }),
  reviews: (p: ListParams) => queryOptions({ queryKey: k("reviews", p), queryFn: () => adminService.reviews(p), ...priv }),
  categories: () => queryOptions({ queryKey: k("categories"), queryFn: adminService.categories, ...reference }),
  verificationRequests: (p: ListParams) => queryOptions({ queryKey: k("verification", "requests", p), queryFn: () => adminService.verificationRequests(p), ...live }),
  verificationRequest: (id: string) => queryOptions({ queryKey: k("verification", "request", id), queryFn: () => adminService.verificationRequest(id), ...priv, refetchOnWindowFocus: true }),
  changeRequests: (status?: string) => queryOptions({ queryKey: k("verification", "change-requests", status), queryFn: () => adminService.changeRequests(status), ...live }),
  campaigns: (status?: string) => queryOptions({ queryKey: k("campaigns", status), queryFn: () => adminService.campaigns(status), ...priv }),
  campaign: (id: string) => queryOptions({ queryKey: k("campaign", id), queryFn: () => adminService.campaign(id), ...priv }),
  vouchers: () => queryOptions({ queryKey: k("vouchers"), queryFn: adminService.vouchers, ...priv }),
  orders: (p: ListParams & { payment?: string }) => queryOptions({ queryKey: k("orders", p), queryFn: () => adminService.orders(p), ...live }),
  order: (id: string) => queryOptions({ queryKey: k("order", id), queryFn: () => adminService.order(id), ...priv, refetchOnWindowFocus: true }),
  customers: (p: ListParams) => queryOptions({ queryKey: k("customers", p), queryFn: () => adminService.customers(p), ...priv }),
  customer: (id: string) => queryOptions({ queryKey: k("customer", id), queryFn: () => adminService.customer(id), ...priv }),
  tickets: (p: ListParams & { assignee?: "me" }) => queryOptions({ queryKey: k("tickets", p), queryFn: () => adminService.tickets(p), ...live }),
  ticket: (id: string) => queryOptions({ queryKey: k("ticket", id), queryFn: () => adminService.ticket(id), ...live }),
  payouts: (status?: string) => queryOptions({ queryKey: k("payouts", status), queryFn: () => adminService.payouts(status), ...priv }),
  banners: () => queryOptions({ queryKey: k("banners"), queryFn: adminService.banners, ...priv }),
  auditLogs: (p: ListParams) => queryOptions({ queryKey: k("audit", p), queryFn: () => adminService.auditLogs(p), ...priv }),
};

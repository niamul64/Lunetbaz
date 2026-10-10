/**
 * Permission keys used by the UI. The role → permission mapping lives on the
 * backend (see dummy_data/auth.json) and arrives with the session, so roles can
 * change without a frontend deploy. The UI only ever checks permissions, never
 * role names.
 */
export const P = {
  // Admin portal
  adminDashboard: "admin.dashboard.view",
  usersView: "users.view",
  usersManage: "users.manage",
  rolesView: "roles.view",
  rolesManage: "roles.manage",
  shopsView: "shops.view",
  shopsApprove: "shops.approve",
  shopsSuspend: "shops.suspend",
  productsView: "products.view",
  productsModerate: "products.moderate",
  categoriesManage: "categories.manage",
  verificationView: "verification.view",
  verificationInspect: "verification.inspect",
  verificationApprove: "verification.approve",
  verificationRevoke: "verification.revoke",
  campaignsView: "campaigns.view",
  campaignsManage: "campaigns.manage",
  campaignsReview: "campaigns.review",
  ordersView: "orders.view",
  ordersManage: "orders.manage",
  customersView: "customers.view",
  ticketsView: "tickets.view",
  ticketsManage: "tickets.manage",
  financeView: "finance.view",
  payoutsApprove: "payouts.approve",
  cmsManage: "cms.manage",
  auditView: "audit.view",

  // Seller portal
  sellerDashboard: "seller.dashboard.view",
  sellerProductsView: "seller.products.view",
  sellerProductsManage: "seller.products.manage",
  sellerInventoryManage: "seller.inventory.manage",
  sellerOrdersView: "seller.orders.view",
  sellerOrdersManage: "seller.orders.manage",
  sellerCampaignsView: "seller.campaigns.view",
  sellerCampaignsApply: "seller.campaigns.apply",
  sellerVerificationView: "seller.verification.view",
  sellerVerificationApply: "seller.verification.apply",
  sellerFinanceView: "seller.finance.view",
  sellerTeamManage: "seller.team.manage",
  sellerSettingsManage: "seller.settings.manage",
} as const;

export type Permission = (typeof P)[keyof typeof P];

export const ALL_PERMISSIONS = Object.values(P);

/** Permission groups for the roles & permissions matrix in the admin portal. */
export const PERMISSION_GROUPS: { label: string; portal: "admin" | "seller"; permissions: Permission[] }[] = [
  { label: "Dashboard", portal: "admin", permissions: [P.adminDashboard] },
  { label: "Users & roles", portal: "admin", permissions: [P.usersView, P.usersManage, P.rolesView, P.rolesManage] },
  { label: "Shops", portal: "admin", permissions: [P.shopsView, P.shopsApprove, P.shopsSuspend] },
  { label: "Catalog", portal: "admin", permissions: [P.productsView, P.productsModerate, P.categoriesManage] },
  { label: "Verification", portal: "admin", permissions: [P.verificationView, P.verificationInspect, P.verificationApprove, P.verificationRevoke] },
  { label: "Campaigns", portal: "admin", permissions: [P.campaignsView, P.campaignsManage, P.campaignsReview] },
  { label: "Orders & customers", portal: "admin", permissions: [P.ordersView, P.ordersManage, P.customersView] },
  { label: "Support", portal: "admin", permissions: [P.ticketsView, P.ticketsManage] },
  { label: "Finance", portal: "admin", permissions: [P.financeView, P.payoutsApprove] },
  { label: "Content & audit", portal: "admin", permissions: [P.cmsManage, P.auditView] },
  {
    label: "Seller Center",
    portal: "seller",
    permissions: [
      P.sellerDashboard,
      P.sellerProductsView,
      P.sellerProductsManage,
      P.sellerInventoryManage,
      P.sellerOrdersView,
      P.sellerOrdersManage,
      P.sellerCampaignsView,
      P.sellerCampaignsApply,
      P.sellerVerificationView,
      P.sellerVerificationApply,
      P.sellerFinanceView,
      P.sellerTeamManage,
      P.sellerSettingsManage,
    ],
  },
];

export function hasPermission(granted: readonly string[] | undefined, required: string | readonly string[] | undefined, mode: "all" | "any" = "all") {
  if (!required || (Array.isArray(required) && required.length === 0)) return true;
  if (!granted) return false;
  if (granted.includes("*")) return true;
  const list = typeof required === "string" ? [required] : required;
  return mode === "all" ? list.every((p) => granted.includes(p)) : list.some((p) => granted.includes(p));
}

import {
  BadgeCheck,
  Boxes,
  Building2,
  ClipboardCheck,
  FileText,
  FolderTree,
  Headset,
  Image,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShoppingBag,
  Tags,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { P } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the user has ANY of these permissions. */
  permissions: string[];
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, permissions: [P.adminDashboard], exact: true }] },
  {
    label: "Operations",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, permissions: [P.ordersView] },
      { href: "/admin/customers", label: "Customers", icon: UsersRound, permissions: [P.customersView] },
      { href: "/admin/tickets", label: "Support tickets", icon: Headset, permissions: [P.ticketsView] },
    ],
  },
  {
    label: "Catalog & trust",
    items: [
      { href: "/admin/products", label: "Products", icon: Boxes, permissions: [P.productsView] },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareWarning, permissions: [P.productsModerate] },
      { href: "/admin/verification", label: "Verification", icon: BadgeCheck, permissions: [P.verificationView], exact: true },
      { href: "/admin/verification/change-requests", label: "Change requests", icon: ClipboardCheck, permissions: [P.verificationView] },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, permissions: [P.categoriesManage] },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, permissions: [P.campaignsView] },
      { href: "/admin/vouchers", label: "Vouchers", icon: Tags, permissions: [P.campaignsView] },
      { href: "/admin/content", label: "Banners & content", icon: Image, permissions: [P.cmsManage] },
    ],
  },
  {
    label: "Sellers & finance",
    items: [
      { href: "/admin/shops", label: "Shops", icon: Building2, permissions: [P.shopsView] },
      { href: "/admin/finance", label: "Payouts", icon: Wallet, permissions: [P.financeView] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users & staff", icon: Users, permissions: [P.usersView] },
      { href: "/admin/roles", label: "Roles & permissions", icon: KeyRound, permissions: [P.rolesView] },
      { href: "/admin/audit-logs", label: "Audit log", icon: ScrollText, permissions: [P.auditView] },
    ],
  },
];

export const SELLER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/seller", label: "Dashboard", icon: LayoutDashboard, permissions: [P.sellerDashboard], exact: true },
      { href: "/seller/products", label: "Products", icon: Package, permissions: [P.sellerProductsView] },
      { href: "/seller/orders", label: "Orders", icon: Receipt, permissions: [P.sellerOrdersView] },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/seller/campaigns", label: "Campaigns", icon: Megaphone, permissions: [P.sellerCampaignsView] },
      { href: "/seller/verification", label: "Verified Badge", icon: BadgeCheck, permissions: [P.sellerVerificationView] },
    ],
  },
  {
    label: "Shop",
    items: [
      { href: "/seller/finance", label: "Finance", icon: Wallet, permissions: [P.sellerFinanceView] },
      { href: "/seller/team", label: "Team", icon: Users, permissions: [P.sellerTeamManage] },
      { href: "/seller/settings", label: "Shop settings", icon: Settings, permissions: [P.sellerSettingsManage] },
    ],
  },
];

export const HELP_LINK = { href: "/verified", label: "Verified program", icon: FileText };

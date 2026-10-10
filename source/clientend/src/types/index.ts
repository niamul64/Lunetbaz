/**
 * Domain types shared by the UI and the API layer.
 * These mirror the backend DTOs (NestJS) — keep them in sync with the OpenAPI spec
 * once the backend exists (they can later be generated into packages/contracts).
 */

export type ID = string;
export type ISODate = string;

/* ----------------------------------------------------------------------------
 * API envelopes
 * -------------------------------------------------------------------------- */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  sort?: string;
}

/* ----------------------------------------------------------------------------
 * Auth & RBAC
 * -------------------------------------------------------------------------- */

export type Portal = "admin" | "seller" | "store";

export type RoleKey =
  | "super_admin"
  | "admin"
  | "manager"
  | "campaign_manager"
  | "verification_officer"
  | "product_reviewer"
  | "finance_executive"
  | "content_manager"
  | "call_center_executive"
  | "shop_admin"
  | "shop_manager"
  | "shop_staff"
  | "customer";

export interface Role {
  key: RoleKey;
  label: string;
  portal: Portal;
  level: number;
  description: string;
  permissions: string[];
}

export type UserStatus = "active" | "suspended" | "invited";

export interface User {
  id: ID;
  name: string;
  email: string;
  phone: string;
  role: RoleKey;
  shopId: ID | null;
  status: UserStatus;
  createdAt: ISODate;
}

export interface SessionUser extends User {
  roleLabel: string;
  portal: Portal;
  permissions: string[];
  shop?: Pick<Shop, "id" | "name" | "slug" | "logo" | "status"> | null;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: ISODate;
  user: SessionUser;
}

export interface DemoAccount {
  email: string;
  name: string;
  role: RoleKey;
  roleLabel: string;
  portal: Portal;
  description: string;
}

/* ----------------------------------------------------------------------------
 * Catalog
 * -------------------------------------------------------------------------- */

export interface Category {
  id: ID;
  slug: string;
  name: string;
  nameBn: string;
  icon: string;
  hue: number;
  parentId: ID | null;
  sort: number;
}

export type ShopStatus = "pending" | "active" | "suspended";

export interface Shop {
  id: ID;
  slug: string;
  name: string;
  ownerId: ID | null;
  logo: string;
  banner: string;
  description: string;
  status: ShopStatus;
  tier: "mall" | "standard";
  rating: number;
  positiveRatingPct: number;
  shipOnTimePct: number;
  responseRatePct: number;
  followers: number;
  location: { division: string; district: string; area: string };
  kyc: { status: "submitted" | "approved" | "rejected"; nid: string; tradeLicense: string; tin: string | null };
  commissionRatePct: number;
  payout: { method: PayoutMethod; accountName: string; accountNo: string; bank: string | null };
  strikes: number;
  joinedAt: ISODate;
}

export interface ShopSummary extends Pick<Shop, "id" | "slug" | "name" | "logo" | "rating" | "positiveRatingPct" | "shipOnTimePct" | "responseRatePct" | "followers" | "tier" | "location" | "joinedAt" | "status"> {
  verifiedProductCount: number;
  productCount: number;
}

export type VerificationStatus = "none" | "pending" | "verified" | "suspended" | "revoked" | "expired";

export interface ProductVerification {
  status: VerificationStatus;
  verifiedAt: ISODate | null;
  expiresAt: ISODate | null;
}

export type ProductStatus = "draft" | "pending_review" | "active" | "rejected" | "inactive";

export interface Variant {
  id: ID;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  salePrice: number | null;
  stock: number;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: ID;
  slug: string;
  name: string;
  shopId: ID;
  categoryId: ID;
  brand: string;
  images: string[];
  video: string | null;
  description: string;
  highlights: string[];
  specs: Spec[];
  variants: Variant[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  status: ProductStatus;
  rejectionReason?: string | null;
  verification: ProductVerification;
  freeShipping: boolean;
  warranty: string | null;
  tags: string[];
  weightKg: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Live campaign price attached to a variant when a campaign is running. */
export interface CampaignOffer {
  campaignId: ID;
  campaignName: string;
  campaignSlug: string;
  type: CampaignType;
  variantId: ID;
  campaignPrice: number;
  campaignStock: number;
  endsAt: ISODate;
}

/** Lightweight shape for grids and lists. */
export interface ProductCard {
  id: ID;
  slug: string;
  name: string;
  image: string;
  brand: string;
  price: number;
  /** Effective price the customer pays now (sale or campaign price). */
  finalPrice: number;
  discountPct: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  verified: boolean;
  freeShipping: boolean;
  inStock: boolean;
  shop: { id: ID; name: string; slug: string; location: string };
  campaign: Pick<CampaignOffer, "campaignName" | "campaignSlug" | "type" | "endsAt" | "campaignStock"> | null;
}

export interface ProductDetail extends Product {
  shop: ShopSummary;
  categoryPath: Category[];
  offers: CampaignOffer[];
  related: ProductCard[];
}

export interface ProductSearchParams extends ListParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  verified?: boolean;
  freeShipping?: boolean;
  shop?: string;
  campaign?: string;
  sort?: "relevance" | "popular" | "newest" | "price_asc" | "price_desc" | "rating";
}

export interface ProductSearchResult extends Paginated<ProductCard> {
  facets: { brands: { name: string; count: number }[]; priceRange: { min: number; max: number } };
}

export interface Review {
  id: ID;
  productId: ID;
  userId: ID;
  userName: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  variant: string;
  verifiedPurchase: boolean;
  helpful: number;
  createdAt: ISODate;
  status: "published" | "flagged" | "removed";
  sellerReply: string | null;
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface Question {
  id: ID;
  productId: ID;
  userName: string;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  createdAt: ISODate;
}

/* ----------------------------------------------------------------------------
 * Campaigns
 * -------------------------------------------------------------------------- */

export type CampaignType = "mega" | "festival" | "flash" | "category_day" | "brand_day" | "clearance" | "special";
export type CampaignStatus = "draft" | "registration_open" | "registration_closed" | "scheduled" | "live" | "ended" | "settled";

export interface CampaignRules {
  minDiscountPct: number;
  minStock: number;
  maxProductsPerShop: number;
  categoryIds: ID[];
  minShopRating: number;
  verifiedOnly: boolean;
}

export interface Campaign {
  id: ID;
  slug: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  banner: string;
  hue: number;
  tagline: string;
  description: string;
  registrationStart: ISODate;
  registrationEnd: ISODate;
  startAt: ISODate;
  endAt: ISODate;
  rules: CampaignRules;
  extraCommissionPct: number;
  voucherFundedBy: "platform" | "seller" | "shared";
  createdBy: ID;
  createdAt: ISODate;
}

export type ApplicationStatus = "pending" | "approved" | "partially_approved" | "rejected";
export type ApplicationItemStatus = "pending" | "approved" | "rejected";

export interface CampaignApplicationItem {
  productId: ID;
  variantId: ID;
  campaignPrice: number;
  campaignStock: number;
  status: ApplicationItemStatus;
  rejectionReason: string | null;
}

export interface CampaignApplication {
  id: ID;
  campaignId: ID;
  shopId: ID;
  status: ApplicationStatus;
  submittedAt: ISODate;
  reviewedBy: ID | null;
  reviewedAt: ISODate | null;
  items: CampaignApplicationItem[];
}

export interface CampaignApplicationView extends CampaignApplication {
  shop: Pick<Shop, "id" | "name" | "slug" | "rating">;
  itemsDetailed: (CampaignApplicationItem & { productName: string; image: string; variantLabel: string; referencePrice: number; discountPct: number })[];
}

export interface CampaignWithStats extends Campaign {
  stats: { applications: number; pendingApplications: number; approvedItems: number; shops: number };
}

export interface ApplyCampaignItemInput {
  productId: ID;
  variantId: ID;
  campaignPrice: number;
  campaignStock: number;
}

export interface Voucher {
  id: ID;
  code: string;
  title: string;
  type: "fixed" | "percent";
  value: number;
  minSpend: number;
  maxDiscount: number | null;
  fundedBy: "platform" | "seller" | "shared";
  shopId: ID | null;
  startAt: ISODate;
  endAt: ISODate;
  usageLimit: number | null;
  used: number;
  active: boolean;
}

/* ----------------------------------------------------------------------------
 * Verification (Lunetbuz Verified Badge)
 * -------------------------------------------------------------------------- */

export type VerificationRequestStatus = "submitted" | "inspection_scheduled" | "awaiting_approval" | "approved" | "rejected";

export interface InspectionChecklist {
  genuine: boolean;
  matchesPhotos: boolean;
  matchesDescription: boolean;
  packagingIntact: boolean;
  documentsValid: boolean;
}

export interface Inspection {
  officerId: ID;
  inspectedAt: ISODate;
  result: "pass" | "fail";
  notes: string;
  checklist: InspectionChecklist;
  evidence: string[];
}

export interface VerificationRequest {
  id: ID;
  productId: ID;
  shopId: ID;
  status: VerificationRequestStatus;
  submittedBy: ID;
  submittedAt: ISODate;
  inspectionMethod: "hub" | "onsite";
  documents: { type: string; name: string }[];
  inspection: Inspection | null;
  approval: { officerId: ID; approvedAt: ISODate; notes: string | null } | null;
  rejectionReason: string | null;
}

export interface VerificationRequestView extends VerificationRequest {
  product: Pick<Product, "id" | "name" | "slug" | "images" | "brand" | "description" | "specs" | "verification">;
  shop: Pick<Shop, "id" | "name" | "slug">;
  inspectorName: string | null;
  approverName: string | null;
}

export type LockableField = "images" | "video" | "name" | "description" | "highlights" | "specs" | "categoryId" | "brand";

export interface ChangeRequest {
  id: ID;
  productId: ID;
  shopId: ID;
  status: "pending" | "approved" | "rejected";
  submittedBy: ID;
  submittedAt: ISODate;
  fields: LockableField[];
  reason: string;
  proposed: Partial<Pick<Product, LockableField>>;
  reviewedBy?: ID;
  reviewedAt?: ISODate;
  reviewNote?: string;
}

export interface ChangeRequestView extends ChangeRequest {
  product: Pick<Product, "id" | "name" | "images">;
  shop: Pick<Shop, "id" | "name">;
}

export interface BadgeEvent {
  id: ID;
  productId: ID;
  action: "granted" | "suspended" | "revoked" | "reinstated" | "renewed";
  by: ID;
  at: ISODate;
  reason: string | null;
}

/* ----------------------------------------------------------------------------
 * Orders, checkout, logistics
 * -------------------------------------------------------------------------- */

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket" | "card";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PackageStatus = "pending" | "confirmed" | "packed" | "ready_to_ship" | "shipped" | "delivered" | "cancelled" | "returned";
export type OrderStatus = PackageStatus | "processing" | "partially_delivered";

export interface Address {
  id: ID;
  userId: ID;
  label: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  line: string;
  isDefault: boolean;
}

export type ShippingAddress = Pick<Address, "name" | "phone" | "division" | "district" | "area" | "line">;

export interface OrderItem {
  productId: ID;
  variantId: ID;
  name: string;
  image: string;
  attributes: Record<string, string>;
  unitPrice: number;
  qty: number;
}

export interface TimelineEvent {
  status: PackageStatus;
  at: ISODate;
  note: string | null;
}

export interface OrderPackage {
  id: ID;
  shopId: ID;
  status: PackageStatus;
  courier: string | null;
  trackingNo: string | null;
  shippingFee: number;
  items: OrderItem[];
  timeline: TimelineEvent[];
}

export interface Order {
  id: ID;
  orderNo: string;
  customerId: ID;
  createdAt: ISODate;
  status: OrderStatus;
  payment: { method: PaymentMethod; status: PaymentStatus; transactionId: string | null };
  shippingAddress: ShippingAddress;
  totals: { subtotal: number; shippingFee: number; discount: number; total: number };
  voucherCode: string | null;
  packages: OrderPackage[];
}

export interface OrderView extends Order {
  customer: Pick<User, "id" | "name" | "phone" | "email">;
  packages: (OrderPackage & { shop: Pick<Shop, "id" | "name" | "slug"> })[];
}

/** A seller's view of one package of an order. */
export interface SellerPackageView extends OrderPackage {
  orderId: ID;
  orderNo: string;
  createdAt: ISODate;
  payment: Order["payment"];
  shippingAddress: ShippingAddress;
  customerName: string;
}

export interface CartLineInput {
  productId: ID;
  variantId: ID;
  qty: number;
}

export interface QuoteLine extends CartLineInput {
  name: string;
  slug: string;
  image: string;
  attributes: Record<string, string>;
  unitPrice: number;
  originalPrice: number;
  lineTotal: number;
  available: boolean;
  maxQty: number;
  verified: boolean;
  campaignName: string | null;
  issue: string | null;
}

export interface QuoteGroup {
  shop: Pick<Shop, "id" | "name" | "slug">;
  lines: QuoteLine[];
  subtotal: number;
  shippingFee: number;
}

export interface CartQuote {
  groups: QuoteGroup[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  voucher: { code: string; title: string; discount: number } | null;
  voucherError: string | null;
  etaDays: string | null;
  itemCount: number;
}

export interface CheckoutInput {
  items: CartLineInput[];
  addressId: ID;
  paymentMethod: PaymentMethod;
  voucherCode?: string | null;
}

export interface CheckoutResult {
  orderId: ID;
  orderNo: string;
  total: number;
  paymentMethod: PaymentMethod;
  /** For online payments, the gateway redirect URL (SSLCommerz / bKash). */
  paymentRedirectUrl: string | null;
}

export interface LocationDivision {
  name: string;
  districts: { name: string; zone: ShippingZoneKey; areas: string[] }[];
}

export type ShippingZoneKey = "inside_dhaka" | "dhaka_suburb" | "outside_dhaka";

export interface ShippingZone {
  zone: ShippingZoneKey;
  label: string;
  baseFee: number;
  perExtraKg: number;
  etaDays: string;
}

/* ----------------------------------------------------------------------------
 * Support, finance, CMS, audit
 * -------------------------------------------------------------------------- */

export type TicketStatus = "open" | "pending_customer" | "escalated" | "resolved" | "closed";

export interface TicketMessage {
  from: "customer" | "agent" | "system";
  authorName: string;
  body: string;
  at: ISODate;
}

export interface Ticket {
  id: ID;
  ticketNo: string;
  customerId: ID;
  orderId: ID | null;
  channel: "phone" | "chat" | "email";
  category: "order_status" | "delivery" | "authenticity" | "account" | "refund" | "other";
  priority: "low" | "normal" | "high" | "urgent";
  status: TicketStatus;
  subject: string;
  assigneeId: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  messages: TicketMessage[];
}

export interface TicketView extends Ticket {
  customer: Pick<User, "id" | "name" | "phone" | "email">;
  assigneeName: string | null;
}

export type PayoutMethod = "bank" | "bkash" | "nagad" | "rocket";
export type PayoutStatus = "pending_approval" | "approved" | "paid" | "on_hold";

export interface Payout {
  id: ID;
  shopId: ID;
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  commission: number;
  campaignFees: number;
  shippingFees: number;
  refunds: number;
  netAmount: number;
  status: PayoutStatus;
  method: PayoutMethod;
  reference: string | null;
  approvedBy: ID | null;
  paidAt: ISODate | null;
  holdReason?: string;
}

export interface PayoutView extends Payout {
  shop: Pick<Shop, "id" | "name">;
}

export interface SeriesPoint {
  date: string;
  gmv: number;
  orders: number;
}

export interface Banner {
  id: ID;
  placement: "home_hero";
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  hue: number;
  icon: string;
  active: boolean;
  sort: number;
  startAt: ISODate | null;
  endAt: ISODate | null;
}

export interface AuditLog {
  id: ID;
  actorId: ID;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: ID;
  summary: string;
  ip: string;
  at: ISODate;
}

export interface CustomerRisk {
  userId: ID;
  codSuccessRatePct: number;
  totalOrders: number;
  returns: number;
  flag: "trusted" | "normal" | "watch" | "blocked";
}

export interface CustomerView extends User {
  risk: CustomerRisk | null;
  orderCount: number;
  totalSpent: number;
}

/* ----------------------------------------------------------------------------
 * Dashboards
 * -------------------------------------------------------------------------- */

export interface Kpi {
  key: string;
  label: string;
  value: number;
  format: "number" | "currency" | "percent";
  delta?: number | null;
  hint?: string;
}

export interface SellerDashboard {
  kpis: Kpi[];
  series: SeriesPoint[];
  recentPackages: SellerPackageView[];
  alerts: { level: "info" | "warning" | "danger"; message: string; href?: string }[];
  lowStock: { productId: ID; name: string; variant: string; stock: number }[];
}

export interface AdminDashboard {
  kpis: Kpi[];
  series: SeriesPoint[] | null;
  queues: { key: string; label: string; count: number; href: string; permission: string }[];
}

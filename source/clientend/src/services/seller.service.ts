import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryPolicy } from "@/lib/cache/query-policy";
import type {
  ApplyCampaignItemInput,
  BadgeEvent,
  Campaign,
  CampaignApplication,
  CampaignApplicationItem,
  Category,
  ChangeRequest,
  ListParams,
  PackageStatus,
  Paginated,
  Payout,
  Product,
  ProductVerification,
  SellerDashboard,
  SellerPackageView,
  SessionUser,
  Shop,
  VerificationRequest,
} from "@/types";

export type ProductInput = Pick<Product, "name" | "brand" | "categoryId" | "images" | "description" | "highlights" | "specs" | "freeShipping" | "warranty" | "tags" | "weightKg"> & {
  video?: string | null;
  variants: (Omit<Product["variants"][number], "id"> & { id?: string })[];
  submit?: boolean;
};

export interface SellerCampaign extends Campaign {
  myApplication: { status: CampaignApplication["status"]; items: number; approvedItems: number } | null;
}

export interface SellerCampaignDetail {
  campaign: Campaign;
  applications: (Omit<CampaignApplication, "items"> & {
    items: (CampaignApplicationItem & { productName: string; variantLabel: string; image: string; referencePrice: number })[];
  })[];
  eligible: { canApply: boolean; reasons: string[] };
}

type ProductRef = { id: string; name: string; images: string[]; slug: string; verification?: ProductVerification };

export interface SellerVerificationData {
  requests: (VerificationRequest & { product: ProductRef; inspectorName: string | null; approverName: string | null })[];
  changeRequests: (ChangeRequest & { product: ProductRef })[];
  badgeEvents: BadgeEvent[];
  eligibleProducts: { id: string; name: string; images: string[] }[];
}

export interface SellerFinance {
  summary: { paidOut: number; awaitingPayout: number; pendingSettlement: number; commissionRatePct: number };
  payouts: Payout[];
  payoutAccount: Shop["payout"];
}

export interface TeamInviteInput {
  name: string;
  email: string;
  phone: string;
  role: "shop_manager" | "shop_staff";
}

export const sellerService = {
  dashboard: () => api.get<SellerDashboard>("/seller/dashboard"),
  shop: () => api.get<Shop>("/seller/shop"),
  updateShop: (input: Partial<Pick<Shop, "name" | "description" | "location" | "payout">>) => api.patch<Shop>("/seller/shop", input),
  categories: () => api.get<Category[]>("/seller/categories"),

  products: (params: ListParams & { verification?: string }) => api.get<Paginated<Product>>("/seller/products", { query: { ...params } }),
  product: (id: string) => api.get<Product>(`/seller/products/${id}`),
  createProduct: (input: ProductInput) => api.post<Product>("/seller/products", input),
  updateProduct: (id: string, input: Partial<ProductInput>) => api.patch<Product>(`/seller/products/${id}`, input),
  updateInventory: (productId: string, variantId: string, input: { price?: number; salePrice?: number | null; stock?: number }) =>
    api.patch<Product>(`/seller/products/${productId}/variants/${variantId}/inventory`, input),
  setProductStatus: (id: string, status: "active" | "inactive") => api.post<Product>(`/seller/products/${id}/status`, { status }),
  deleteProduct: (id: string) => api.delete<{ ok: boolean }>(`/seller/products/${id}`),

  packages: (params: ListParams) => api.get<Paginated<SellerPackageView>>("/seller/packages", { query: { ...params } }),
  package: (id: string) => api.get<SellerPackageView>(`/seller/packages/${id}`),
  updatePackageStatus: (id: string, input: { status: PackageStatus; courier?: string; note?: string }) => api.post<SellerPackageView>(`/seller/packages/${id}/status`, input),

  campaigns: () => api.get<SellerCampaign[]>("/seller/campaigns"),
  campaign: (id: string) => api.get<SellerCampaignDetail>(`/seller/campaigns/${id}`),
  applyToCampaign: (id: string, items: ApplyCampaignItemInput[]) => api.post<CampaignApplication>(`/seller/campaigns/${id}/applications`, { items }),

  verification: () => api.get<SellerVerificationData>("/seller/verification"),
  requestVerification: (productId: string, input: { inspectionMethod: "hub" | "onsite"; documents: { type: string; name: string }[] }) =>
    api.post<VerificationRequest>(`/seller/products/${productId}/verification-requests`, input),
  requestChange: (productId: string, input: { proposed: ChangeRequest["proposed"]; reason: string }) =>
    api.post<ChangeRequest>(`/seller/products/${productId}/change-requests`, input),

  finance: () => api.get<SellerFinance>("/seller/finance"),

  team: () => api.get<SessionUser[]>("/seller/team"),
  inviteMember: (input: TeamInviteInput) => api.post<SessionUser>("/seller/team", input),
  updateMember: (userId: string, input: { role?: string; status?: string }) => api.patch<SessionUser>(`/seller/team/${userId}`, input),
  removeMember: (userId: string) => api.delete<{ ok: boolean }>(`/seller/team/${userId}`),
};

/**
 * Query keys + cache tier for Seller Center. Orders and the dashboard are
 * "live" (new orders arrive constantly); everything else is the shop's private data.
 */
export const sellerQueries = {
  all: ["seller"] as const,
  dashboard: () => queryOptions({ queryKey: ["seller", "dashboard"], queryFn: sellerService.dashboard, ...queryPolicy.live }),
  shop: () => queryOptions({ queryKey: ["seller", "shop"], queryFn: sellerService.shop, ...queryPolicy.private }),
  categories: () => queryOptions({ queryKey: ["seller", "categories"], queryFn: sellerService.categories, ...queryPolicy.reference }),
  products: (params: ListParams & { verification?: string }) => queryOptions({ queryKey: ["seller", "products", params], queryFn: () => sellerService.products(params), ...queryPolicy.private }),
  product: (id: string) => queryOptions({ queryKey: ["seller", "product", id], queryFn: () => sellerService.product(id), ...queryPolicy.private }),
  packages: (params: ListParams) => queryOptions({ queryKey: ["seller", "packages", params], queryFn: () => sellerService.packages(params), ...queryPolicy.live }),
  package: (id: string) => queryOptions({ queryKey: ["seller", "package", id], queryFn: () => sellerService.package(id), ...queryPolicy.private, refetchOnWindowFocus: true }),
  campaigns: () => queryOptions({ queryKey: ["seller", "campaigns"], queryFn: sellerService.campaigns, ...queryPolicy.catalog }),
  campaign: (id: string) => queryOptions({ queryKey: ["seller", "campaign", id], queryFn: () => sellerService.campaign(id), ...queryPolicy.private }),
  verification: () => queryOptions({ queryKey: ["seller", "verification"], queryFn: sellerService.verification, ...queryPolicy.private }),
  finance: () => queryOptions({ queryKey: ["seller", "finance"], queryFn: sellerService.finance, ...queryPolicy.private }),
  team: () => queryOptions({ queryKey: ["seller", "team"], queryFn: sellerService.team, ...queryPolicy.private }),
};

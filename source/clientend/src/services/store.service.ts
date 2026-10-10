import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryPolicy } from "@/lib/cache/query-policy";
import type {
  Banner,
  Campaign,
  CartLineInput,
  CartQuote,
  Category,
  CheckoutInput,
  CheckoutResult,
  LocationDivision,
  Paginated,
  ProductCard,
  ProductDetail,
  ProductSearchParams,
  ProductSearchResult,
  Question,
  Review,
  ReviewSummary,
  ShippingZone,
  ShopSummary,
  Voucher,
} from "@/types";

export interface HomeData {
  banners: Banner[];
  categories: Category[];
  flashSale: { campaign: Campaign; items: ProductCard[] } | null;
  campaigns: Campaign[];
  verifiedPicks: ProductCard[];
  justForYou: ProductCard[];
}

export interface ShopPublic extends ShopSummary {
  description: string;
  banner: string;
}

export const storeService = {
  home: () => api.get<HomeData>("/store/home"),
  categories: () => api.get<Category[]>("/store/categories"),
  searchProducts: (params: ProductSearchParams) => api.get<ProductSearchResult>("/store/products", { query: { ...params } }),
  product: (slug: string) => api.get<ProductDetail>(`/store/products/${encodeURIComponent(slug)}`),
  reviews: (productId: string, params: { page?: number; withMedia?: boolean } = {}) =>
    api.get<Paginated<Review> & { summary: ReviewSummary }>(`/store/products/${productId}/reviews`, { query: params }),
  questions: (productId: string) => api.get<Question[]>(`/store/products/${productId}/questions`),
  askQuestion: (productId: string, question: string) => api.post<Question>(`/store/products/${productId}/questions`, { question }),
  shop: (slug: string) => api.get<ShopPublic>(`/store/shops/${encodeURIComponent(slug)}`),
  campaigns: () => api.get<Campaign[]>("/store/campaigns"),
  campaign: (slug: string) => api.get<Campaign>(`/store/campaigns/${encodeURIComponent(slug)}`),
  locations: () => api.get<{ divisions: LocationDivision[]; shippingZones: ShippingZone[] }>("/store/locations"),
  vouchers: () => api.get<Voucher[]>("/store/vouchers"),
  quote: (input: { items: CartLineInput[]; addressId?: string | null; voucherCode?: string | null }) => api.post<CartQuote>("/store/cart/quote", input),
  checkout: (input: CheckoutInput, idempotencyKey: string) =>
    api.post<CheckoutResult>("/store/checkout", input, { headers: { "Idempotency-Key": idempotencyKey } }),
};

/** Query keys + cache tier for every storefront read (see src/lib/cache/query-policy.ts). */
export const storeQueries = {
  categories: () => queryOptions({ queryKey: ["store", "categories"], queryFn: storeService.categories, ...queryPolicy.reference }),
  search: (params: ProductSearchParams) => queryOptions({ queryKey: ["store", "search", params], queryFn: () => storeService.searchProducts(params), ...queryPolicy.catalog }),
  reviews: (productId: string, page = 1, withMedia = false) =>
    queryOptions({ queryKey: ["store", "reviews", productId, page, withMedia], queryFn: () => storeService.reviews(productId, { page, withMedia }), ...queryPolicy.catalog }),
  questions: (productId: string) => queryOptions({ queryKey: ["store", "questions", productId], queryFn: () => storeService.questions(productId), ...queryPolicy.catalog }),
  locations: () => queryOptions({ queryKey: ["store", "locations"], queryFn: storeService.locations, ...queryPolicy.static }),
  vouchers: () => queryOptions({ queryKey: ["store", "vouchers"], queryFn: storeService.vouchers, ...queryPolicy.catalog }),
  /** Prices, stock and totals are always re-quoted: never served from cache. */
  quote: (items: CartLineInput[], addressId?: string | null, voucherCode?: string | null) =>
    queryOptions({
      queryKey: ["store", "quote", items, addressId ?? null, voucherCode ?? null],
      queryFn: () => storeService.quote({ items, addressId, voucherCode }),
      enabled: items.length > 0,
      placeholderData: (prev) => prev,
      ...queryPolicy.transactional,
    }),
};

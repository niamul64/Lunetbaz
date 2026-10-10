import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryPolicy } from "@/lib/cache/query-policy";
import type { Address, OrderView, Paginated, ProductCard } from "@/types";

export type AddressInput = Omit<Address, "id" | "userId">;
export type OrderTab = "all" | "to_pay" | "to_ship" | "to_receive" | "completed" | "cancelled";

export const accountService = {
  orders: (status: OrderTab = "all", page = 1) =>
    api.get<Paginated<OrderView>>("/account/orders", { query: { status: status === "all" ? undefined : status, page } }),
  order: (id: string) => api.get<OrderView>(`/account/orders/${id}`),
  cancelOrder: (id: string, reason: string) => api.post<OrderView>(`/account/orders/${id}/cancel`, { reason }),
  addresses: () => api.get<Address[]>("/account/addresses"),
  createAddress: (input: AddressInput) => api.post<Address>("/account/addresses", input),
  updateAddress: (id: string, input: Partial<AddressInput>) => api.patch<Address>(`/account/addresses/${id}`, input),
  deleteAddress: (id: string) => api.delete<{ ok: boolean }>(`/account/addresses/${id}`),
  wishlist: () => api.get<ProductCard[]>("/account/wishlist"),
  wishlistIds: () => api.get<string[]>("/account/wishlist/ids"),
  addToWishlist: (productId: string) => api.put<string[]>(`/account/wishlist/${productId}`),
  removeFromWishlist: (productId: string) => api.delete<string[]>(`/account/wishlist/${productId}`),
  updateProfile: (input: { name?: string; email?: string }) => api.patch("/account/profile", input),
};

/** All account data is private to the user: short-lived, cleared on logout. */
export const accountQueries = {
  orders: (status: OrderTab, page = 1) => queryOptions({ queryKey: ["account", "orders", status, page], queryFn: () => accountService.orders(status, page), ...queryPolicy.private }),
  /** Order tracking changes as couriers move the parcel, so refresh when the user comes back. */
  order: (id: string) => queryOptions({ queryKey: ["account", "order", id], queryFn: () => accountService.order(id), ...queryPolicy.private, refetchOnWindowFocus: true }),
  addresses: () => queryOptions({ queryKey: ["account", "addresses"], queryFn: accountService.addresses, ...queryPolicy.private }),
  wishlist: () => queryOptions({ queryKey: ["account", "wishlist"], queryFn: accountService.wishlist, ...queryPolicy.private }),
  wishlistIds: () => queryOptions({ queryKey: ["account", "wishlist-ids"], queryFn: accountService.wishlistIds, ...queryPolicy.private }),
};

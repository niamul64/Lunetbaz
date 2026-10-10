"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { accountQueries, accountService } from "@/services/account.service";
import { useSession } from "@/stores/session.store";

/** Wishlist membership with optimistic toggling. */
export function useWishlist(productId: string) {
  const { user } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const isCustomer = user?.portal === "store";
  const ids = useQuery({ ...accountQueries.wishlistIds(), enabled: isCustomer });
  const saved = ids.data?.includes(productId) ?? false;

  const mutation = useMutation({
    mutationFn: (next: boolean) => (next ? accountService.addToWishlist(productId) : accountService.removeFromWishlist(productId)),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: accountQueries.wishlistIds().queryKey });
      const prev = qc.getQueryData<string[]>(accountQueries.wishlistIds().queryKey);
      qc.setQueryData<string[]>(accountQueries.wishlistIds().queryKey, (old = []) => (next ? [productId, ...old] : old.filter((id) => id !== productId)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(accountQueries.wishlistIds().queryKey, ctx?.prev),
    onSuccess: (_d, next) => {
      toast.success(next ? "Saved to wishlist" : "Removed from wishlist");
      void qc.invalidateQueries({ queryKey: accountQueries.wishlist().queryKey });
    },
  });

  function toggle() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!isCustomer) {
      toast.info("Wishlists are available for customer accounts.");
      return;
    }
    mutation.mutate(!saved);
  }

  return { saved, toggle, pending: mutation.isPending };
}

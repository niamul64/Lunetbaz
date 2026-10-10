"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLineInput } from "@/types";

/**
 * Guest-friendly cart kept on the device. Prices are never stored here – they
 * are always re-quoted by the API (POST /store/cart/quote). After the backend
 * exists, sync this to the server cart on login.
 */
export interface CartItem extends CartLineInput {
  selected: boolean;
  addedAt: number;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
  add: (item: CartLineInput, opts?: { exclusive?: boolean }) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantIds: string[]) => void;
  toggle: (variantId: string, selected?: boolean) => void;
  toggleAll: (selected: boolean) => void;
  removeSelected: () => void;
}

export const MAX_QTY_PER_LINE = 10;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      add: (item, opts) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          const base = opts?.exclusive ? s.items.map((i) => ({ ...i, selected: false })) : s.items;
          if (existing)
            return {
              items: base.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, qty: opts?.exclusive ? item.qty : Math.min(i.qty + item.qty, MAX_QTY_PER_LINE), selected: true }
                  : i,
              ),
            };
          return { items: [{ ...item, qty: Math.min(item.qty, MAX_QTY_PER_LINE), selected: true, addedAt: Date.now() }, ...base] };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(1, Math.min(qty, MAX_QTY_PER_LINE)) } : i)) })),
      remove: (variantIds) => set((s) => ({ items: s.items.filter((i) => !variantIds.includes(i.variantId)) })),
      toggle: (variantId, selected) =>
        set((s) => ({ items: s.items.map((i) => (i.variantId === variantId ? { ...i, selected: selected ?? !i.selected } : i)) })),
      toggleAll: (selected) => set((s) => ({ items: s.items.map((i) => ({ ...i, selected })) })),
      removeSelected: () => set((s) => ({ items: s.items.filter((i) => !i.selected) })),
    }),
    {
      name: "lunetbuz.cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      skipHydration: true,
      onRehydrateStorage: () => () => useCartStore.setState({ hydrated: true }),
    },
  ),
);

export const selectCartCount = (s: CartState) => s.items.reduce((n, i) => n + i.qty, 0);
export const selectSelectedLines = (s: CartState): CartLineInput[] =>
  s.items.filter((i) => i.selected).map(({ productId, variantId, qty }) => ({ productId, variantId, qty }));

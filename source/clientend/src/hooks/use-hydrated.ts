"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and hydration, `true` afterwards.
 *
 * Use it before rendering UI from data that may already be in the shared
 * TanStack Query cache when this boundary hydrates (e.g. categories fetched by
 * the header, which hydrates first). Otherwise the first client render can
 * differ from the server HTML and cause a hydration mismatch.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

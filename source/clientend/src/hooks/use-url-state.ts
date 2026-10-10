"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters, tabs and pagination live in the URL so list views are shareable and
 * survive reloads / back navigation. Must render inside a <Suspense> boundary.
 */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = {} as Record<K, string | undefined>;
  for (const k of keys) values[k] = searchParams.get(k) ?? undefined;

  const set = useCallback(
    (patch: Partial<Record<K | "page", string | number | null | undefined>>, opts?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      if (opts?.resetPage !== false && !("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  return { values, set, page };
}

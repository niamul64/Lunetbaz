"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, SearchX, SlidersHorizontal, Star } from "lucide-react";
import { Pagination } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/ui/display";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/primitives";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUrlState } from "@/hooks/use-url-state";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { storeQueries } from "@/services/store.service";
import type { ProductSearchParams, ProductSearchResult } from "@/types";
import { ProductGrid, ProductGridSkeleton } from "./product-card";

const FILTER_KEYS = ["q", "category", "brand", "minPrice", "maxPrice", "rating", "verified", "freeShipping", "sort"] as const;

const SORTS: { value: NonNullable<ProductSearchParams["sort"]> | ""; label: string }[] = [
  { value: "", label: "Best match" },
  { value: "popular", label: "Best selling" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

interface ProductListingProps {
  /** Fixed scope that the user can't remove (category page, shop page, campaign page). */
  scope?: Pick<ProductSearchParams, "category" | "shop" | "campaign">;
  title?: string;
}

export function ProductListing({ scope, title }: ProductListingProps) {
  const { values, set, page } = useUrlState(FILTER_KEYS);

  const params: ProductSearchParams = {
    q: values.q,
    category: scope?.category ?? values.category,
    shop: scope?.shop,
    campaign: scope?.campaign,
    brand: values.brand,
    minPrice: values.minPrice ? Number(values.minPrice) : undefined,
    maxPrice: values.maxPrice ? Number(values.maxPrice) : undefined,
    rating: values.rating ? Number(values.rating) : undefined,
    verified: values.verified === "1" || undefined,
    freeShipping: values.freeShipping === "1" || undefined,
    sort: (values.sort as ProductSearchParams["sort"]) || undefined,
    page,
  };
  const query = useQuery({ ...storeQueries.search(params), placeholderData: keepPreviousData });

  // Warm the next page so "Next" feels instant (it's the most common next action).
  const queryClient = useQueryClient();
  const totalPages = query.data?.meta.totalPages ?? 0;
  const nextParams = JSON.stringify({ ...params, page: page + 1 });
  useEffect(() => {
    if (page < totalPages) void queryClient.prefetchQuery(storeQueries.search(JSON.parse(nextParams)));
  }, [queryClient, page, totalPages, nextParams]);
  const activeFilters = ["brand", "minPrice", "maxPrice", "rating", "verified", "freeShipping"].filter((k) => values[k as (typeof FILTER_KEYS)[number]]).length;

  const filters = <Filters data={query.data} values={values} set={set} hideCategory={Boolean(scope?.category || scope?.shop)} />;

  return (
    <div className="grid gap-5 lg:grid-cols-[13rem_1fr]">
      <aside className="hidden lg:block" aria-label="Filters">
        {filters}
      </aside>

      <section aria-label="Products" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {title && <span className="font-medium text-foreground">{title} · </span>}
            {query.data ? `${query.data.meta.total} items` : "Searching…"}
            {values.q && (
              <>
                {" "}
                for <span className="font-medium text-foreground">“{values.q}”</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal /> Filters{activeFilters ? ` (${activeFilters})` : ""}
                </Button>
              </DialogTrigger>
              <SheetContent title="Filters" side="right">
                <div className="p-4">{filters}</div>
              </SheetContent>
            </Dialog>
            <label className="sr-only" htmlFor="sort">
              Sort by
            </label>
            <NativeSelect id="sort" value={values.sort ?? ""} onChange={(e) => set({ sort: e.target.value })} className="h-8 w-44 text-xs">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {query.isError && !query.data ? (
          <ErrorState message={errorMessage(query.error)} action={<Button variant="outline" onClick={() => query.refetch()}>Try again</Button>} />
        ) : !query.data ? (
          <ProductGridSkeleton className="lg:grid-cols-5 xl:grid-cols-6" />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No products found"
            description="Try a different keyword or remove some filters."
            action={
              activeFilters > 0 && (
                <Button variant="outline" onClick={() => set({ brand: null, minPrice: null, maxPrice: null, rating: null, verified: null, freeShipping: null })}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>
            <ProductGrid products={query.data.data} className="lg:grid-cols-5 xl:grid-cols-6" priorityCount={4} />
            {query.data.meta.totalPages > 1 && (
              <div className="mt-6 rounded-xl border border-border bg-card">
                <Pagination meta={query.data.meta} onPageChange={(p) => set({ page: p })} />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type SetFn = ReturnType<typeof useUrlState<(typeof FILTER_KEYS)[number]>>["set"];

function Filters({ data, values, set, hideCategory }: { data?: ProductSearchResult; values: Record<string, string | undefined>; set: SetFn; hideCategory: boolean }) {
  const hydrated = useHydrated();
  const { data: categories } = useQuery(storeQueries.categories());
  const [min, setMin] = useState(values.minPrice ?? "");
  const [max, setMax] = useState(values.maxPrice ?? "");
  const selectedBrands = values.brand?.split(",") ?? [];

  return (
    <div className="space-y-5 text-sm">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-verified/40 bg-verified-soft p-3">
        <Checkbox checked={values.verified === "1"} onCheckedChange={(c) => set({ verified: c ? "1" : null })} />
        <span className="inline-flex items-center gap-1 font-medium text-[oklch(0.4_0.11_160)]">
          <BadgeCheck className="size-4" aria-hidden /> Verified only
        </span>
      </label>

      {!hideCategory && hydrated && categories && (
        <FilterGroup title="Category">
          <ul className="space-y-1.5">
            <li>
              <button className={cn("hover:text-primary", !values.category && "font-medium text-primary")} onClick={() => set({ category: null })}>
                All categories
              </button>
            </li>
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <li key={c.id}>
                  <button className={cn("hover:text-primary", values.category === c.slug && "font-medium text-primary")} onClick={() => set({ category: c.slug })}>
                    {c.name}
                  </button>
                </li>
              ))}
          </ul>
        </FilterGroup>
      )}

      {data && data.facets.brands.length > 0 && (
        <FilterGroup title="Brand">
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {data.facets.brands.map((b) => {
              const checked = selectedBrands.includes(b.name);
              return (
                <li key={b.name}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => {
                        const next = checked ? selectedBrands.filter((x) => x !== b.name) : [...selectedBrands, b.name];
                        set({ brand: next.join(",") });
                      }}
                    />
                    <span className="flex-1 truncate">{b.name}</span>
                    <span className="text-xs text-muted-foreground">{b.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Price (৳)">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ minPrice: min, maxPrice: max });
          }}
        >
          <Input inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className="h-8" aria-label="Minimum price" />
          <span className="text-muted-foreground">–</span>
          <Input inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className="h-8" aria-label="Maximum price" />
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            Go
          </Button>
        </form>
      </FilterGroup>

      <FilterGroup title="Rating">
        <div className="space-y-1">
          {[4, 3].map((r) => (
            <button
              key={r}
              onClick={() => set({ rating: values.rating === String(r) ? null : r })}
              className={cn("flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted", values.rating === String(r) && "bg-primary-soft text-primary")}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("size-3.5", i < r ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} aria-hidden />
              ))}
              <span className="ml-1 text-xs">& up</span>
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Delivery">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={values.freeShipping === "1"} onCheckedChange={(c) => set({ freeShipping: c ? "1" : null })} />
          Free delivery
        </label>
      </FilterGroup>

      <Link href="/verified" className="block text-xs text-muted-foreground underline-offset-2 hover:underline">
        What does Lunetbuz Verified mean?
      </Link>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5 border-t border-border pt-4 first:border-0 first:pt-0">
      <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

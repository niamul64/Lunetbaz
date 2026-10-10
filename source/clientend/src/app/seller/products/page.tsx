"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Lock, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/common/data-table";
import { Can, RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge, VerificationStatusBadge } from "@/components/common/status";
import { InventoryDialog } from "@/components/seller/inventory-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatPrice } from "@/lib/utils";
import { sellerQueries } from "@/services/seller.service";
import type { Product } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Live" },
  { value: "pending_review", label: "Awaiting QC" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Drafts" },
  { value: "inactive", label: "Inactive" },
] as const;

export default function SellerProductsPage() {
  return (
    <RequirePermission permission={P.sellerProductsView}>
      <Products />
    </RequirePermission>
  );
}

function Products() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q", "verification"] as const);
  const [inventoryFor, setInventoryFor] = useState<Product | null>(null);
  const query = useQuery({ ...sellerQueries.products({ status: values.status, q: values.q, verification: values.verification, page }), placeholderData: keepPreviousData });

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex min-w-60 items-center gap-3">
          <Media src={p.images[0] ?? "ph://package/0"} alt="" className="size-11 shrink-0 rounded-md" iconClassName="size-5" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.brand} · {p.variants.length} variant(s)
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (p) => {
        const prices = p.variants.map((v) => v.salePrice ?? v.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
      },
    },
    {
      key: "stock",
      header: "Stock",
      cell: (p) => {
        const total = p.variants.reduce((s, v) => s + v.stock, 0);
        return <span className={total === 0 ? "font-medium text-danger" : total <= 10 ? "font-medium text-warning" : ""}>{total}</span>;
      },
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: "verified",
      header: "Verified",
      hideOnMobile: true,
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5">
          <VerificationStatusBadge status={p.verification.status} />
          {["verified", "suspended", "pending"].includes(p.verification.status) && <Lock className="size-3.5 text-muted-foreground" aria-label="Content locked" />}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Can permission={P.sellerInventoryManage}>
            <Button variant="outline" size="sm" onClick={() => setInventoryFor(p)}>
              Price & stock
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalog. Verified products keep their content locked; price and stock stay editable."
        actions={
          <Can permission={P.sellerProductsManage}>
            <Button asChild>
              <Link href="/seller/products/new">
                <Plus /> Add product
              </Link>
            </Button>
          </Can>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={[...TABS]} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Search name, brand or SKU" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(p) => p.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          onRowClick={(p) => router.push(`/seller/products/${p.id}`)}
          empty={{ title: "No products found", description: "Try another filter, or add your first product." }}
        />
      </Card>
      {inventoryFor && <InventoryDialog key={inventoryFor.id} product={inventoryFor} open onOpenChange={(o) => !o && setInventoryFor(null)} />}
    </>
  );
}

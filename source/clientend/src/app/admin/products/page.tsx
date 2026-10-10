"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge, VerificationStatusBadge } from "@/components/common/status";
import { Card } from "@/components/ui/display";
import { NativeSelect } from "@/components/ui/input";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice } from "@/lib/utils";
import { adminQueries, type AdminProductRow } from "@/services/admin.service";

const TABS = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Awaiting QC" },
  { value: "active", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Drafts" },
];

export default function AdminProductsPage() {
  return (
    <RequirePermission permission={P.productsView}>
      <Products />
    </RequirePermission>
  );
}

function Products() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q", "verification"] as const);
  const query = useQuery({ ...adminQueries.products({ status: values.status, q: values.q, verification: values.verification, page }), placeholderData: keepPreviousData });

  const columns: Column<AdminProductRow>[] = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex min-w-60 items-center gap-3">
          <Media src={p.images[0] ?? "ph://package/0"} alt="" className="size-11 shrink-0 rounded-md" iconClassName="size-5" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.shopName} · {p.brand}
            </p>
          </div>
        </div>
      ),
    },
    { key: "price", header: "From", hideOnMobile: true, cell: (p) => formatPrice(Math.min(...p.variants.map((v) => v.salePrice ?? v.price))) },
    { key: "verified", header: "Verified", hideOnMobile: true, cell: (p) => <VerificationStatusBadge status={p.verification.status} /> },
    { key: "updated", header: "Updated", hideOnMobile: true, cell: (p) => formatDate(p.updatedAt) },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <>
      <PageHeader title="Products" description="Quality-check new and edited listings before they go live." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="w-40">
              <NativeSelect value={values.verification ?? ""} onChange={(e) => set({ verification: e.target.value })} aria-label="Verification">
                <option value="">Any verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Verifying</option>
                <option value="suspended">Suspended</option>
                <option value="none">Not verified</option>
              </NativeSelect>
            </div>
            <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Name or brand" />
          </div>
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
          onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
          empty={{ title: "No products in this view" }}
        />
      </Card>
    </>
  );
}

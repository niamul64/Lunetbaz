"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";
import type { VerificationRequestView } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "submitted", label: "To inspect" },
  { value: "awaiting_approval", label: "Awaiting 2nd approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminVerificationPage() {
  return (
    <RequirePermission permission={P.verificationView}>
      <Queue />
    </RequirePermission>
  );
}

function Queue() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q"] as const);
  const query = useQuery({ ...adminQueries.verificationRequests({ status: values.status, q: values.q, page }), placeholderData: keepPreviousData });

  const columns: Column<VerificationRequestView>[] = [
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <div className="flex min-w-60 items-center gap-3">
          <Media src={r.product.images[0] ?? "ph://package/0"} alt="" className="size-11 shrink-0 rounded-md" iconClassName="size-5" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium">{r.product.name}</p>
            <p className="text-xs text-muted-foreground">{r.shop.name}</p>
          </div>
        </div>
      ),
    },
    { key: "method", header: "Inspection", hideOnMobile: true, cell: (r) => (r.inspectionMethod === "hub" ? "At hub" : "On-site") },
    { key: "submitted", header: "Submitted", hideOnMobile: true, cell: (r) => formatDate(r.submittedAt) },
    { key: "officers", header: "Officers", hideOnMobile: true, cell: (r) => <span className="text-xs">{r.inspectorName ?? "—"} / {r.approverName ?? "—"}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader title="Verification queue" description="Inspect products and give the second approval for the Lunetbuz Verified Badge. An inspector can never approve their own inspection." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Product or shop" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          onRowClick={(r) => router.push(`/admin/verification/${r.id}`)}
          empty={{ title: "Queue is empty" }}
        />
      </Card>
    </>
  );
}

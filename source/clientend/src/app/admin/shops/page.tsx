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
import { adminQueries, type AdminShopRow } from "@/services/admin.service";

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Awaiting approval" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminShopsPage() {
  return (
    <RequirePermission permission={P.shopsView}>
      <Shops />
    </RequirePermission>
  );
}

function Shops() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q"] as const);
  const query = useQuery({ ...adminQueries.shops({ status: values.status, q: values.q, page }), placeholderData: keepPreviousData });

  const columns: Column<AdminShopRow>[] = [
    {
      key: "shop",
      header: "Shop",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Media src={s.logo} alt="" className="size-10 shrink-0 rounded-lg" iconClassName="size-5" />
          <div>
            <p className="font-medium">
              {s.name} {s.tier === "mall" && <span className="text-xs text-primary">Mall</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.ownerName ?? "No owner"} · {s.location.district}
            </p>
          </div>
        </div>
      ),
    },
    { key: "products", header: "Products", hideOnMobile: true, cell: (s) => `${s.productCount} (${s.verifiedProductCount} verified)` },
    { key: "rating", header: "Rating", hideOnMobile: true, cell: (s) => (s.rating ? `${s.rating.toFixed(1)} · ${s.positiveRatingPct}%` : "—") },
    { key: "strikes", header: "Strikes", hideOnMobile: true, cell: (s) => <span className={s.strikes ? "font-medium text-danger" : ""}>{s.strikes}</span> },
    { key: "kyc", header: "KYC", hideOnMobile: true, cell: (s) => <StatusBadge status={s.kyc.status} /> },
    { key: "joined", header: "Joined", hideOnMobile: true, cell: (s) => formatDate(s.joinedAt) },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <>
      <PageHeader title="Shops" description="Approve new sellers after KYC, and suspend shops that break the rules." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Shop name or district" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(s) => s.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          onRowClick={(s) => router.push(`/admin/shops/${s.id}`)}
          empty={{ title: "No shops found" }}
        />
      </Card>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Avatar, Badge, Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";
import type { CustomerView } from "@/types";

const RISK_TONE = { trusted: "success", normal: "neutral", watch: "warning", blocked: "danger" } as const;

export default function AdminCustomersPage() {
  return (
    <RequirePermission permission={P.customersView}>
      <Customers />
    </RequirePermission>
  );
}

function Customers() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["q"] as const);
  const query = useQuery({ ...adminQueries.customers({ q: values.q, page }), placeholderData: keepPreviousData });

  const columns: Column<CustomerView>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} />
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {c.phone} · {c.email || "no email"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "orders", header: "Orders", cell: (c) => c.orderCount },
    { key: "spent", header: "Total spent", hideOnMobile: true, cell: (c) => formatPrice(c.totalSpent) },
    {
      key: "risk",
      header: "COD risk",
      hideOnMobile: true,
      cell: (c) => (c.risk ? <Badge tone={RISK_TONE[c.risk.flag]}>{c.risk.flag} · {c.risk.codSuccessRatePct}% delivered</Badge> : "—"),
    },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "since", header: "Since", hideOnMobile: true, cell: (c) => formatDate(c.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Customers" description="Look up customers by name, phone or email, e.g. when they call the support line." />
      <Card>
        <div className="border-b border-border p-4">
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Name, phone or email" className="sm:w-96" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(c) => c.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
          empty={{ title: "No customers found" }}
        />
      </Card>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { sellerQueries } from "@/services/seller.service";
import type { SellerPackageView } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "To confirm" },
  { value: "confirmed", label: "To pack" },
  { value: "packed", label: "Packed" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export default function SellerOrdersPage() {
  return (
    <RequirePermission permission={P.sellerOrdersView}>
      <Orders />
    </RequirePermission>
  );
}

function Orders() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q"] as const);
  const query = useQuery({ ...sellerQueries.packages({ status: values.status, q: values.q, page }), placeholderData: keepPreviousData });

  const columns: Column<SellerPackageView>[] = [
    {
      key: "order",
      header: "Order",
      cell: (p) => (
        <div>
          <p className="font-medium">{p.orderNo}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      hideOnMobile: true,
      cell: (p) => (
        <span>
          {p.customerName}
          <br />
          <span className="text-xs text-muted-foreground">{p.shippingAddress.district}</span>
        </span>
      ),
    },
    { key: "items", header: "Items", hideOnMobile: true, cell: (p) => `${p.items.reduce((n, i) => n + i.qty, 0)} item(s)` },
    { key: "amount", header: "Amount", cell: (p) => formatPrice(p.items.reduce((s, i) => s + i.unitPrice * i.qty, 0)) },
    {
      key: "payment",
      header: "Payment",
      hideOnMobile: true,
      cell: (p) => (
        <span className="text-xs">
          {statusLabel(p.payment.method)} · <StatusBadge status={p.payment.status} />
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <>
      <PageHeader title="Orders" description="Confirm, pack and hand over packages to the courier. Shipping and delivery updates come from the courier." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Order no., customer or tracking" />
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
          onRowClick={(p) => router.push(`/seller/orders/${p.id}`)}
          empty={{ title: "No orders in this view" }}
        />
      </Card>
    </>
  );
}

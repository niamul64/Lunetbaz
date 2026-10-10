"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { Card } from "@/components/ui/display";
import { NativeSelect } from "@/components/ui/input";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";
import type { OrderView } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Unconfirmed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export default function AdminOrdersPage() {
  return (
    <RequirePermission permission={P.ordersView}>
      <Orders />
    </RequirePermission>
  );
}

function Orders() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q", "payment"] as const);
  const query = useQuery({ ...adminQueries.orders({ status: values.status, q: values.q, payment: values.payment, page }), placeholderData: keepPreviousData });

  const columns: Column<OrderView>[] = [
    {
      key: "order",
      header: "Order",
      cell: (o) => (
        <div>
          <p className="font-medium">{o.orderNo}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (o) => (
        <div>
          <p>{o.customer.name}</p>
          <p className="text-xs text-muted-foreground">{o.shippingAddress.phone}</p>
        </div>
      ),
    },
    { key: "shops", header: "Shops", hideOnMobile: true, cell: (o) => o.packages.map((p) => p.shop.name).join(", ") },
    { key: "total", header: "Total", cell: (o) => formatPrice(o.totals.total) },
    {
      key: "payment",
      header: "Payment",
      hideOnMobile: true,
      cell: (o) => (
        <span className="text-xs">
          {statusLabel(o.payment.method)} · <StatusBadge status={o.payment.status} />
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <>
      <PageHeader title="Orders" description="Search any order by number, customer name, phone or tracking number." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="w-40">
              <NativeSelect value={values.payment ?? ""} onChange={(e) => set({ payment: e.target.value })} aria-label="Payment method">
                <option value="">All payments</option>
                <option value="cod">Cash on Delivery</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="card">Card</option>
              </NativeSelect>
            </div>
            <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Order no., phone, name, tracking" />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(o) => o.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
          empty={{ title: "No orders match" }}
        />
      </Card>
    </>
  );
}

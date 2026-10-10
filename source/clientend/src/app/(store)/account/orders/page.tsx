"use client";

import { RequireSession } from "@/components/common/guards";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Package, Store } from "lucide-react";
import { Pagination } from "@/components/common/data-table";
import { OrderItemRow, PackageProgress } from "@/components/common/order-parts";
import { FilterPills } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { errorMessage } from "@/lib/api/errors";
import { formatDate, formatPrice } from "@/lib/utils";
import { accountQueries, type OrderTab } from "@/services/account.service";

const TABS: { value: OrderTab | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "to_pay", label: "To pay" },
  { value: "to_ship", label: "To ship" },
  { value: "to_receive", label: "To receive" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled & returns" },
];

function OrdersPageContent() {
  const { values, set, page } = useUrlState(["status"] as const);
  const tab = (values.status as OrderTab) || "all";
  const { data, isLoading, error, refetch } = useQuery({ ...accountQueries.orders(tab, page), placeholderData: keepPreviousData });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My orders</h1>
      <FilterPills options={TABS} value={values.status as OrderTab | undefined} onChange={(v) => set({ status: v })} />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>} />
      ) : !data?.data.length ? (
        <EmptyState icon={Package} title="No orders here" description="Orders you place will show up here." action={<Button asChild><Link href="/">Start shopping</Link></Button>} />
      ) : (
        <>
          {data.data.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-sm">
                <div>
                  <Link href={`/account/orders/${order.id}`} className="font-medium hover:text-primary">
                    Order {order.orderNo}
                  </Link>
                  <p className="text-xs text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold">{formatPrice(order.totals.total)}</span>
                </div>
              </div>
              {order.packages.map((pkg) => (
                <div key={pkg.id} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Store className="size-4" aria-hidden /> {pkg.shop.name}
                    </span>
                    <div className="w-full max-w-xs">
                      <PackageProgress status={pkg.status} />
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {pkg.items.map((item) => (
                      <OrderItemRow key={item.variantId} item={item} linkToProduct={false} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end px-4 py-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/account/orders/${order.id}`}>View details</Link>
                </Button>
              </div>
            </Card>
          ))}
          {data.meta.totalPages > 1 && (
            <Card>
              <Pagination meta={data.meta} onPageChange={(p) => set({ page: p })} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireSession portal="store">
      <OrdersPageContent />
    </RequireSession>
  );
}

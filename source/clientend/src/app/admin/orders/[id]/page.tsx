"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, Store, Truck } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { OrderItemRow, PackageProgress, PackageTimeline } from "@/components/common/order-parts";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { OrderPackage, PackageStatus } from "@/types";

/** What an ops agent can do next (courier events are simulated here until webhooks exist). */
const NEXT_ACTIONS: Partial<Record<PackageStatus, { status: PackageStatus; label: string; destructive?: boolean; needsReason?: boolean }[]>> = {
  pending: [
    { status: "confirmed", label: "Confirm (verified by phone)" },
    { status: "cancelled", label: "Cancel", destructive: true, needsReason: true },
  ],
  confirmed: [{ status: "cancelled", label: "Cancel", destructive: true, needsReason: true }],
  packed: [{ status: "cancelled", label: "Cancel", destructive: true, needsReason: true }],
  ready_to_ship: [{ status: "shipped", label: "Mark picked up by courier" }],
  shipped: [
    { status: "delivered", label: "Mark delivered" },
    { status: "returned", label: "Mark returned", destructive: true, needsReason: true },
  ],
  delivered: [{ status: "returned", label: "Accept return", destructive: true, needsReason: true }],
};

export default function AdminOrderDetailPage() {
  return (
    <RequirePermission permission={P.ordersView}>
      <OrderDetail />
    </RequirePermission>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: order, isLoading, error } = useQuery(adminQueries.order(id));
  const update = useMutation({
    mutationFn: ({ pkg, status, note }: { pkg: OrderPackage; status: PackageStatus; note?: string }) => adminService.updatePackage(id, pkg.id, status, note),
    onSuccess: (o) => {
      qc.setQueryData(adminQueries.order(id).queryKey, o);
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success("Order updated");
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !order) return <ErrorState message={errorMessage(error, "Order not found.")} />;

  return (
    <>
      <PageHeader back={{ href: "/admin/orders", label: "Orders" }} title={`Order ${order.orderNo}`} description={`Placed ${formatDateTime(order.createdAt)}`} actions={<StatusBadge status={order.status} />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {order.packages.map((pkg, i) => (
            <Card key={pkg.id}>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    Package {i + 1}
                    <span className="inline-flex items-center gap-1 text-sm font-normal text-muted-foreground">
                      <Store className="size-4" aria-hidden /> {pkg.shop.name}
                    </span>
                  </span>
                }
                action={<StatusBadge status={pkg.status} />}
              />
              <CardBody className="space-y-4">
                <PackageProgress status={pkg.status} />
                <div className="divide-y divide-border">
                  {pkg.items.map((item) => (
                    <OrderItemRow key={item.variantId} item={item} linkToProduct={false} />
                  ))}
                </div>
                {pkg.courier && (
                  <p className="flex items-center gap-2 text-sm">
                    <Truck className="size-4 text-muted-foreground" aria-hidden /> {pkg.courier} · <span className="font-mono text-xs">{pkg.trackingNo}</span>
                  </p>
                )}
                <Can permission={P.ordersManage}>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_ACTIONS[pkg.status]?.map((a) =>
                      a.needsReason || a.destructive ? (
                        <ConfirmDialog
                          key={a.status}
                          trigger={
                            <Button variant="outline" size="sm" className={a.destructive ? "text-danger" : ""}>
                              {a.label}
                            </Button>
                          }
                          title={`${a.label}?`}
                          variant={a.destructive ? "destructive" : "default"}
                          confirmLabel={a.label}
                          reason={a.needsReason ? { label: "Reason (shared with customer & seller)" } : undefined}
                          onConfirm={(note) => update.mutateAsync({ pkg, status: a.status, note })}
                        />
                      ) : (
                        <Button key={a.status} size="sm" onClick={() => update.mutate({ pkg, status: a.status })} loading={update.isPending}>
                          {a.label}
                        </Button>
                      ),
                    )}
                  </div>
                </Can>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Timeline</summary>
                  <div className="mt-3">
                    <PackageTimeline timeline={pkg.timeline} />
                  </div>
                </details>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-3 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <a href={`tel:${order.shippingAddress.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="size-4" aria-hidden /> {order.shippingAddress.phone}
              </a>
              <p className="text-muted-foreground">
                {order.shippingAddress.line}, {order.shippingAddress.area}, {order.shippingAddress.district}, {order.shippingAddress.division}
              </p>
              <Can permission={P.customersView}>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/customers/${order.customer.id}`}>Customer profile</Link>
                </Button>
              </Can>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Payment" />
            <CardBody>
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Method", value: statusLabel(order.payment.method) },
                  { label: "Status", value: <StatusBadge status={order.payment.status} /> },
                  { label: "Transaction", value: order.payment.transactionId ?? "—" },
                  { label: "Subtotal / delivery", value: `${formatPrice(order.totals.subtotal)} / ${formatPrice(order.totals.shippingFee)}` },
                  { label: "Discount", value: order.totals.discount ? `-${formatPrice(order.totals.discount)} (${order.voucherCode})` : "—" },
                  { label: "Total", value: formatPrice(order.totals.total) },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

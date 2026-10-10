"use client";

import { RequireSession } from "@/components/common/guards";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, Truck } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { OrderItemRow, PackageProgress, PackageTimeline } from "@/components/common/order-parts";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { accountQueries, accountService } from "@/services/account.service";

function OrderDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: order, isLoading, error } = useQuery(accountQueries.order(id));
  const cancel = useMutation({
    mutationFn: (reason: string) => accountService.cancelOrder(id, reason),
    onSuccess: (o) => {
      qc.setQueryData(accountQueries.order(id).queryKey, o);
      void qc.invalidateQueries({ queryKey: ["account", "orders"] });
      toast.success("Your order has been cancelled.");
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !order) return <ErrorState message={errorMessage(error, "Order not found.")} />;

  const cancellable = order.packages.every((p) => p.status === "pending" || p.status === "confirmed");

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/account/orders", label: "My orders" }}
        title={`Order ${order.orderNo}`}
        description={`Placed on ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            {cancellable && (
              <ConfirmDialog
                trigger={<Button variant="outline" size="sm">Cancel order</Button>}
                title="Cancel this order?"
                description="Items will be released and any online payment refunded within 3–5 working days."
                confirmLabel="Cancel order"
                variant="destructive"
                reason={{ label: "Why are you cancelling?", placeholder: "e.g. Ordered by mistake", optional: true }}
                onConfirm={(reason) => cancel.mutateAsync(reason)}
              />
            )}
          </>
        }
      />

      {order.packages.map((pkg, i) => (
        <Card key={pkg.id}>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                Package {i + 1} <span className="text-sm font-normal text-muted-foreground">· </span>
                <Link href={`/shop/${pkg.shop.slug}`} className="inline-flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-primary">
                  <Store className="size-4" aria-hidden /> {pkg.shop.name}
                </Link>
              </span>
            }
            action={<StatusBadge status={pkg.status} />}
          />
          <CardBody className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-4">
              <PackageProgress status={pkg.status} />
              <div className="divide-y divide-border">
                {pkg.items.map((item) => (
                  <OrderItemRow key={item.variantId} item={item} linkToProduct={false} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {pkg.courier && (
                <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                  <Truck className="size-4" aria-hidden /> {pkg.courier} · <span className="font-mono text-xs">{pkg.trackingNo}</span>
                </p>
              )}
              <PackageTimeline timeline={pkg.timeline} />
            </div>
          </CardBody>
        </Card>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Delivery address" />
          <CardBody className="text-sm">
            <p className="font-medium">
              {order.shippingAddress.name} · {order.shippingAddress.phone}
            </p>
            <p className="text-muted-foreground">
              {order.shippingAddress.line}, {order.shippingAddress.area}, {order.shippingAddress.district}, {order.shippingAddress.division}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Payment" />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Method", value: statusLabel(order.payment.method) },
                { label: "Status", value: <StatusBadge status={order.payment.status} /> },
                { label: "Subtotal", value: formatPrice(order.totals.subtotal) },
                { label: "Delivery", value: formatPrice(order.totals.shippingFee) },
                ...(order.totals.discount ? [{ label: `Voucher ${order.voucherCode ?? ""}`, value: `-${formatPrice(order.totals.discount)}` }] : []),
                { label: "Total", value: <span className="text-accent">{formatPrice(order.totals.total)}</span> },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireSession portal="store">
      <OrderDetailPageContent />
    </RequireSession>
  );
}

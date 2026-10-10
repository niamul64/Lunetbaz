"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackageCheck, Printer, Truck } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { OrderItemRow, PackageProgress, PackageTimeline } from "@/components/common/order-parts";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RadioCard, RadioGroup } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { sellerQueries, sellerService } from "@/services/seller.service";
import type { PackageStatus } from "@/types";

const COURIERS = ["Pathao", "RedX", "Steadfast", "Paperfly"];

export default function SellerOrderDetailPage() {
  return (
    <RequirePermission permission={P.sellerOrdersView}>
      <OrderDetail />
    </RequirePermission>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: pkg, isLoading, error } = useQuery(sellerQueries.package(id));
  const [courierOpen, setCourierOpen] = useState(false);
  const [courier, setCourier] = useState(COURIERS[0]!);

  const update = useMutation({
    mutationFn: (input: { status: PackageStatus; courier?: string; note?: string }) => sellerService.updatePackageStatus(id, input),
    onSuccess: (p) => {
      qc.setQueryData(sellerQueries.package(id).queryKey, p);
      void qc.invalidateQueries({ queryKey: ["seller", "packages"] });
      void qc.invalidateQueries({ queryKey: ["seller", "dashboard"] });
      toast.success(`Package marked as ${statusLabel(p.status).toLowerCase()}`);
      setCourierOpen(false);
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !pkg) return <ErrorState message={errorMessage(error, "Order not found.")} />;

  const total = pkg.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/seller/orders", label: "Orders" }}
        title={`Order ${pkg.orderNo}`}
        description={`Placed ${formatDateTime(pkg.createdAt)}`}
        actions={
          <>
            <StatusBadge status={pkg.status} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer /> Print invoice
            </Button>
          </>
        }
      />

      <Can permission={P.sellerOrdersManage}>
        <Card className="mb-4">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-md">
              <PackageProgress status={pkg.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              {pkg.status === "pending" && (
                <Button onClick={() => update.mutate({ status: "confirmed" })} loading={update.isPending}>
                  Confirm order
                </Button>
              )}
              {pkg.status === "confirmed" && (
                <Button onClick={() => update.mutate({ status: "packed" })} loading={update.isPending}>
                  <PackageCheck /> Mark as packed
                </Button>
              )}
              {pkg.status === "packed" && (
                <Button onClick={() => setCourierOpen(true)}>
                  <Truck /> Ready to ship
                </Button>
              )}
              {["pending", "confirmed", "packed"].includes(pkg.status) && (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" className="text-danger">
                      Cancel package
                    </Button>
                  }
                  title="Cancel this package?"
                  description="Cancelling hurts your shop rating. The customer is notified and refunded automatically."
                  confirmLabel="Cancel package"
                  variant="destructive"
                  reason={{ label: "Reason", placeholder: "e.g. Out of stock" }}
                  onConfirm={(note) => update.mutateAsync({ status: "cancelled", note })}
                />
              )}
              {pkg.status === "ready_to_ship" && <Alert tone="info">Waiting for {pkg.courier} pickup. Tracking updates arrive from the courier.</Alert>}
            </div>
          </CardBody>
        </Card>
      </Can>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="Items" />
          <CardBody className="divide-y divide-border py-0">
            {pkg.items.map((item) => (
              <OrderItemRow key={item.variantId} item={item} linkToProduct={false} />
            ))}
            <div className="flex justify-between py-3 text-sm font-semibold">
              <span>Package total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Delivery" />
            <CardBody>
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Customer", value: `${pkg.shippingAddress.name} · ${pkg.shippingAddress.phone}` },
                  { label: "Address", value: `${pkg.shippingAddress.line}, ${pkg.shippingAddress.area}, ${pkg.shippingAddress.district}` },
                  { label: "Payment", value: `${statusLabel(pkg.payment.method)} (${pkg.payment.status})` },
                  { label: "Courier", value: pkg.courier ? `${pkg.courier} · ${pkg.trackingNo}` : "Not assigned" },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <PackageTimeline timeline={pkg.timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

      <Dialog open={courierOpen} onOpenChange={setCourierOpen}>
        <DialogContent
          title="Hand over to courier"
          description="A pickup request is created and a tracking number is assigned."
          size="sm"
          footer={
            <Button onClick={() => update.mutate({ status: "ready_to_ship", courier })} loading={update.isPending}>
              Request pickup
            </Button>
          }
        >
          <RadioGroup value={courier} onValueChange={setCourier}>
            {COURIERS.map((c) => (
              <RadioCard key={c} value={c}>
                {c}
              </RadioCard>
            ))}
          </RadioGroup>
        </DialogContent>
      </Dialog>
    </>
  );
}

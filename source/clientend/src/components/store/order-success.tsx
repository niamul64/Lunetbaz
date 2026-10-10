"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { statusLabel } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, DescriptionList, Skeleton } from "@/components/ui/display";
import { formatPrice } from "@/lib/utils";
import { accountQueries } from "@/services/account.service";

export function OrderSuccess() {
  const orderId = useSearchParams().get("order") ?? "";
  const { data: order, isLoading } = useQuery({ ...accountQueries.order(orderId), enabled: Boolean(orderId) });

  return (
    <Card className="p-8 text-center">
      <CircleCheck className="mx-auto size-14 text-success" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">Thank you for your order!</h1>
      <p className="mt-1 text-muted-foreground">We&apos;ve sent the details by SMS. You can track it any time from your account.</p>
      {isLoading ? (
        <Skeleton className="mx-auto mt-6 h-24 w-full" />
      ) : (
        order && (
          <div className="mt-6 rounded-lg bg-muted p-4 text-left">
            <DescriptionList
              items={[
                { label: "Order number", value: order.orderNo },
                { label: "Total", value: formatPrice(order.totals.total) },
                { label: "Payment", value: `${statusLabel(order.payment.method)} · ${statusLabel(order.payment.status)}` },
                { label: "Packages", value: `${order.packages.length} (shipped separately by each shop)` },
              ]}
            />
          </div>
        )
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {order && (
          <Button asChild>
            <Link href={`/account/orders/${order.id}`}>Track order</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </Card>
  );
}

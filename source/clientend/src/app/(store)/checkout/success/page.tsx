import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireSession } from "@/components/common/guards";
import { OrderSuccess } from "@/components/store/order-success";
import { Skeleton } from "@/components/ui/display";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default function CheckoutSuccessPage() {
  return (
    <div className="container-page max-w-2xl py-10">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RequireSession portal="store">
          <OrderSuccess />
        </RequireSession>
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { PortalShell, ShellSkeleton } from "@/components/portal/portal-shell";

export const metadata: Metadata = { title: { default: "Seller Center", template: "%s | Lunetbuz Seller Center" }, robots: { index: false, follow: false } };

export default function SellerLayout({ children }: LayoutProps<"/seller">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <PortalShell portal="seller">
        {children}
      </PortalShell>
    </Suspense>
  );
}

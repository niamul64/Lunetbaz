import { Suspense } from "react";
import type { Metadata } from "next";
import { PortalShell, ShellSkeleton } from "@/components/portal/portal-shell";

export const metadata: Metadata = { title: { default: "Admin portal", template: "%s | Lunetbuz Admin" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <PortalShell portal="admin">
        {children}
      </PortalShell>
    </Suspense>
  );
}

import { Suspense } from "react";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { Skeleton } from "@/components/ui/display";

function HeaderFallback() {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="hidden h-7 bg-primary sm:block" />
      <div className="container-page flex h-14 items-center gap-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="hidden h-10 flex-1 md:block" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
    </div>
  );
}

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <StoreHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </>
  );
}

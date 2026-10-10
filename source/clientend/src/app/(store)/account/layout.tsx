import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/guards";
import { AccountNav } from "@/components/store/account-nav";

/** Each account page guards itself with <RequireSession>, so the segment always renders. */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-page grid gap-6 py-6 md:grid-cols-[14rem_1fr]">
      <Suspense fallback={<PageSkeleton />}>
        <AccountNav />
      </Suspense>
      <div className="min-w-0">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </div>
    </div>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { hasPermission } from "@/lib/auth/permissions";
import { useSession } from "@/stores/session.store";
import type { Portal } from "@/types";

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Waits for the session to be restored before rendering private pages, so no
 * request is made without credentials. Redirects to login when signed out.
 */
export function RequireSession({ portal, children }: { portal: Portal; children: ReactNode }) {
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== "authenticated" || !user) return <PageSkeleton />;
  if (user.portal !== portal)
    return (
      <EmptyState
        icon={ShieldOff}
        title="This area is for customer accounts"
        description={`You're signed in as ${user.roleLabel}. Use a customer account to shop.`}
        action={
          <Button asChild variant="outline">
            <Link href={user.portal === "seller" ? "/seller" : "/admin"}>Go to my portal</Link>
          </Button>
        }
      />
    );
  return <>{children}</>;
}

export function usePermissions() {
  const { user } = useSession();
  return {
    user,
    can: (permission: string | readonly string[], mode: "all" | "any" = "all") => hasPermission(user?.permissions, permission, mode),
  };
}

/** Render children only when the user has the permission(s). */
export function Can({ permission, mode = "all", children, fallback = null }: { permission: string | readonly string[]; mode?: "all" | "any"; children: ReactNode; fallback?: ReactNode }) {
  const { can } = usePermissions();
  return <>{can(permission, mode) ? children : fallback}</>;
}

/**
 * Page-level guard. Renders a skeleton until the session is restored (so no
 * data is fetched without credentials), then either the page or a 403 state.
 */
export function RequirePermission({ permission, mode = "all", children }: { permission: string | readonly string[]; mode?: "all" | "any"; children: ReactNode }) {
  const { status } = useSession();
  const { can, user } = usePermissions();
  if (status !== "authenticated") return <PageSkeleton />;
  if (can(permission, mode)) return <>{children}</>;
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this page"
      description={`Your role (${user?.roleLabel ?? "guest"}) doesn't include this permission. Ask an administrator if you need access.`}
      action={
        <Button asChild variant="outline">
          <Link href={user?.portal === "seller" ? "/seller" : "/admin"}>Back to dashboard</Link>
        </Button>
      }
    />
  );
}

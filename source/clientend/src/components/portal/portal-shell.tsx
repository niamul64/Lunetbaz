"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/common/guards";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Avatar, Skeleton } from "@/components/ui/display";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menu";
import { isMockApi } from "@/config/env";
import { ADMIN_NAV, SELLER_NAV, type NavGroup } from "@/config/navigation";
import { useLogout } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { portalHome, useSession } from "@/stores/session.store";
import type { Portal, SessionUser } from "@/types";

interface PortalShellProps {
  portal: Exclude<Portal, "store">;
  children: ReactNode;
}

/**
 * Layout for the Admin portal and Seller Center. Navigation is built from the
 * user's permissions, so every role sees only what it can use.
 */
export function PortalShell({ portal, children }: PortalShellProps) {
  const nav = portal === "admin" ? ADMIN_NAV : SELLER_NAV;
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && user && user.portal !== portal) router.replace(portalHome(user.portal));
  }, [status, user, portal, pathname, router]);

  if (status !== "authenticated" || !user || user.portal !== portal) return <ShellSkeleton>{children}</ShellSkeleton>;

  const groups = nav
    .map((g) => ({ ...g, items: g.items.filter((i) => hasPermission(user.permissions, i.permissions, "any")) }))
    .filter((g) => g.items.length > 0);

  const sidebar = <SidebarNav groups={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />;

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo href={portalHome(portal)} suffix={portal === "admin" ? "Admin" : "Seller"} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">{sidebar}</div>
        <PortalFooter user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5!" />
              </Button>
            </DialogTrigger>
            <SheetContent title={portal === "admin" ? "Admin portal" : "Seller Center"}>
              <div className="p-3">{sidebar}</div>
            </SheetContent>
          </Dialog>
          <div className="lg:hidden">
            <Logo href={portalHome(portal)} suffix={portal === "admin" ? "Admin" : "Seller"} />
          </div>
          {portal === "seller" && user.shop && (
            <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
              <span className="truncate font-medium">{user.shop.name}</span>
              {user.shop.status !== "active" && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs">{user.shop.status}</span>}
              <Link href={`/shop/${user.shop.slug}`} target="_blank" className="text-muted-foreground hover:text-primary" aria-label="View storefront">
                <ExternalLink className="size-4" />
              </Link>
            </div>
          )}
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate: () => void }) {
  return (
    <nav className="space-y-5" aria-label="Portal">
      {groups.map((g, i) => (
        <div key={g.label ?? i} className="space-y-1">
          {g.label && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>}
          {g.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary-soft font-medium text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function PortalFooter({ user }: { user: SessionUser }) {
  return (
    <div className="border-t border-border p-4 text-xs text-muted-foreground">
      Signed in as <span className="font-medium text-foreground">{user.roleLabel}</span>
      <br />
      {user.permissions.includes("*") ? "Full access" : `${user.permissions.length} permissions`}
    </div>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  const logout = useLogout();

  async function resetDemo() {
    const { resetDb } = await import("@/lib/api/mock");
    resetDb();
    toast.success("Demo data restored");
    setTimeout(() => window.location.reload(), 400);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label="Account menu">
          <Avatar name={user.name} />
          <span className="hidden text-left sm:block">
            <span className="block max-w-40 truncate text-sm font-medium leading-tight">{user.name}</span>
            <span className="block text-xs leading-tight text-muted-foreground">{user.roleLabel}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank">
            <ExternalLink /> Open storefront
          </Link>
        </DropdownMenuItem>
        {isMockApi && (
          <DropdownMenuItem onSelect={resetDemo}>
            <RotateCcw /> Reset demo data
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Chrome placeholder while the session is restored. The page segment is still
 * rendered inside it (its permission guard shows a skeleton until the session
 * is known), which keeps Next.js' instant-navigation validation meaningful.
 */
export function ShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 border-r border-border bg-card p-4 lg:block">
        <Skeleton className="mb-8 h-8 w-36" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-8 w-full" />
        ))}
      </div>
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-card" />
        <div className="p-4 lg:p-6">{children ?? <PageSkeleton />}</div>
      </div>
    </div>
  );
}

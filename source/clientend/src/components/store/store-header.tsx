"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Heart, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingCart, Store, User } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { CategoryIcon } from "@/components/common/media";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/display";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menu";
import { useLogout } from "@/hooks/use-auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { storeQueries } from "@/services/store.service";
import { selectCartCount, useCartStore } from "@/stores/cart.store";
import { portalHome, useSession } from "@/stores/session.store";

export function StoreHeader() {
  const hydrated = useHydrated();
  const { data: categories } = useQuery(storeQueries.categories());
  // Categories may already be cached by a boundary that hydrated first; wait for
  // hydration so the first client render matches the server HTML.
  const topCategories = (hydrated && categories?.filter((c) => !c.parentId)) || [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="hidden bg-primary text-primary-foreground sm:block">
        <div className="container-page flex h-7 items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-3.5" aria-hidden /> Look for the Lunetbuz Verified badge: 100% genuine, exactly as shown.
          </span>
          <nav className="flex items-center gap-4" aria-label="Utility">
            <Link href="/sell" className="hover:underline">
              Sell on Lunetbuz
            </Link>
            <Link href="/verified" className="hover:underline">
              About Verified
            </Link>
            <a href="tel:16000" className="hover:underline">
              Help: 16XXX
            </a>
          </nav>
        </div>
      </div>

      <div className="container-page flex h-14 items-center gap-3 sm:gap-5">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5!" />
            </Button>
          </DialogTrigger>
          <SheetContent title="Categories">
            <nav className="p-2" aria-label="Categories">
              {topCategories.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted">
                  <CategoryIcon icon={c.icon} hue={c.hue} className="size-8" />
                  {c.name}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              <Link href="/sell" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted">
                <Store className="size-4" /> Sell on Lunetbuz
              </Link>
            </nav>
          </SheetContent>
        </Dialog>

        <Logo className="shrink-0" />
        <SearchBar className="hidden flex-1 md:flex" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <AccountMenu />
          <CartButton />
        </div>
      </div>
      <div className="container-page pb-2 md:hidden">
        <SearchBar />
      </div>

      <nav className="hidden border-t border-border lg:block" aria-label="Categories">
        <div className="container-page scrollbar-none flex h-9 items-center gap-5 overflow-x-auto text-[13px]">
          {topCategories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="whitespace-nowrap text-muted-foreground transition-colors hover:text-primary">
              {c.name}
            </Link>
          ))}
          <Link href="/search?verified=1" className="ml-auto inline-flex items-center gap-1 whitespace-nowrap font-medium text-verified">
            <BadgeCheck className="size-4" aria-hidden /> Verified only
          </Link>
        </div>
      </nav>
    </header>
  );
}

function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
    >
      <div className="flex w-full overflow-hidden rounded-lg border border-input bg-muted/60 focus-within:border-ring focus-within:bg-card focus-within:ring-3 focus-within:ring-ring/20">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search in Lunetbuz"
          aria-label="Search products"
          className="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="flex w-11 items-center justify-center bg-primary text-primary-foreground hover:bg-primary-hover" aria-label="Search">
          <Search className="size-4" />
        </button>
      </div>
    </form>
  );
}

function CartButton() {
  const count = useCartStore(selectCartCount);
  const hydrated = useCartStore((s) => s.hydrated);
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/cart" aria-label={`Cart${hydrated && count ? `, ${count} items` : ""}`}>
        <ShoppingCart className="size-5!" />
        {hydrated && count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

function AccountMenu() {
  const { user, status } = useSession();
  const logout = useLogout();

  if (status === "loading") return <div className="size-9" aria-hidden />;
  if (!user)
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/register">Sign up</Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="sm:hidden">
          <Link href="/login" aria-label="Log in">
            <User className="size-5!" />
          </Link>
        </Button>
      </div>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label="Account menu">
          <Avatar name={user.name} />
          <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">{user.name.split(" ")[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="block truncate">{user.roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.portal === "store" ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/account">
                <User /> My account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders">
                <Package /> My orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/wishlist">
                <Heart /> Wishlist
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href={portalHome(user.portal)}>
              <LayoutDashboard /> {user.portal === "admin" ? "Admin portal" : "Seller Center"}
            </Link>
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

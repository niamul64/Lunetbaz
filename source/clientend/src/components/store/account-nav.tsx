"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Package, User } from "lucide-react";
import { Avatar } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session.store";

const LINKS = [
  { href: "/account", label: "My profile", icon: User, exact: true },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/account/addresses", label: "Address book", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
];

export function AccountNav() {
  const pathname = usePathname();
  const { user } = useSession();
  return (
    <aside className="space-y-4">
      {user && (
        <div className="flex items-center gap-3">
          <Avatar name={user.name} className="size-10" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Hello,</p>
            <p className="truncate font-medium">{user.name}</p>
          </div>
        </div>
      )}
      <nav className="scrollbar-none flex gap-1 overflow-x-auto md:flex-col" aria-label="Account">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm", active ? "bg-primary-soft font-medium text-primary" : "hover:bg-muted")}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

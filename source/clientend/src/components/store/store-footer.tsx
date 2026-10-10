import Link from "next/link";
import { BadgeCheck, Banknote, RotateCcw, Truck } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { siteConfig } from "@/config/site";

const columns = [
  { title: "Customer care", links: [{ label: "Help center", href: "#" }, { label: "How to buy", href: "#" }, { label: "Returns & refunds", href: "#" }, { label: "Track your order", href: "/account/orders" }] },
  { title: "Lunetbuz", links: [{ label: "About us", href: "#" }, { label: "Lunetbuz Verified", href: "/verified" }, { label: "Careers", href: "#" }, { label: "Privacy policy", href: "#" }] },
  { title: "Earn with us", links: [{ label: "Sell on Lunetbuz", href: "/sell" }, { label: "Seller Center", href: "/seller" }, { label: "Join campaigns", href: "/sell#campaigns" }] },
];

export function StoreFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-card">
      <div className="container-page grid gap-3 border-b border-border py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: BadgeCheck, title: "100% genuine", text: "Verified products or your money back" },
          { icon: Banknote, title: "Cash on Delivery", text: "Plus bKash, Nagad, Rocket & cards" },
          { icon: Truck, title: "Nationwide delivery", text: "To all 64 districts" },
          { icon: RotateCcw, title: "Easy returns", text: "7-day hassle-free returns" },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="container-page grid gap-6 py-7 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{siteConfig.description}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-2 text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-1.5 text-[13px] text-muted-foreground">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-3 text-center text-xs text-muted-foreground">© 2026 Lunetbuz. All rights reserved.</div>
    </footer>
  );
}

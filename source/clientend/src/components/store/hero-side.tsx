import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Countdown } from "@/components/common/countdown";
import { Media } from "@/components/common/media";
import { formatPrice } from "@/lib/utils";
import type { Campaign, ProductCard } from "@/types";

/**
 * Card beside the hero: the sale that is live right now with its countdown and
 * top deals, or best sellers when no sale is running.
 */
export function LiveSaleCard({ campaign, products }: { campaign: Campaign | null; products: ProductCard[] }) {
  const items = products.slice(0, 3);
  const href = campaign ? `/campaigns/${campaign.slug}` : "/search?sort=popular";
  const headerStyle = campaign
    ? { background: `linear-gradient(110deg, oklch(0.42 0.17 ${campaign.hue}), oklch(0.6 0.18 ${(campaign.hue + 40) % 360}))` }
    : { background: "linear-gradient(110deg, oklch(0.42 0.2 275), oklch(0.58 0.19 300))" };

  return (
    <section aria-label={campaign ? `${campaign.name}, live now` : "Best sellers"} className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <Link href={href} className="flex items-center justify-between gap-2 px-3 py-2 text-white" style={headerStyle}>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
            {campaign ? (
              <>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                </span>
                Live now
              </>
            ) : (
              <>
                <Flame className="size-3" aria-hidden /> Trending
              </>
            )}
          </span>
          <span className="block truncate text-sm font-bold">{campaign ? campaign.name : "Best sellers"}</span>
        </span>
        {campaign && (
          <span className="shrink-0 text-right">
            <span className="block text-[10px] text-white/80">Ends in</span>
            <Countdown to={campaign.endAt} compact className="text-xs font-semibold" />
          </span>
        )}
      </Link>

      <div className="grid flex-1 grid-cols-3 gap-2 p-2.5">
        {items.map((p) => (
          <Link key={p.id} href={`/p/${p.slug}`} className="group min-w-0" title={p.name}>
            <div className="relative">
              <Media src={p.image} alt={p.name} className="aspect-[4/3] w-full rounded-lg lg:aspect-square" />
              {p.discountPct > 0 && <span className="absolute left-1 top-1 rounded bg-danger px-1 text-[9px] font-bold leading-4 text-white">-{p.discountPct}%</span>}
            </div>
            <p className="mt-1 hidden truncate text-[11px] leading-4 text-muted-foreground group-hover:text-foreground sm:block">{p.name}</p>
            <p className="mt-1 text-xs font-bold text-accent sm:mt-0">{formatPrice(p.finalPrice)}</p>
          </Link>
        ))}
      </div>

      <Link href={href} className="flex items-center justify-center gap-1 border-t border-border/60 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft/50">
        {campaign ? "Shop the sale" : "See best sellers"} <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}

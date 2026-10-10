import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, LayoutGrid, Zap } from "lucide-react";
import { Countdown } from "@/components/common/countdown";
import { CategoryIcon } from "@/components/common/media";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { LiveSaleCard } from "@/components/store/hero-side";
import { ProductCard, ProductGrid, ProductGridSkeleton } from "@/components/store/product-card";
import { Rail } from "@/components/store/rail";
import { Panel, SectionHeader } from "@/components/store/section";
import { UpcomingSales } from "@/components/store/upcoming-sales";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/display";
import { getHome } from "@/server/catalog";

/** Two full rows on the widest grid (7 columns); the rest is one click away. */
const JUST_FOR_YOU_LIMIT = 14;

/** Card width inside horizontal rails (≈2.5 cards visible on phones, ≈7 on desktop). */
const RAIL_CARD = "w-[38vw] max-w-40 shrink-0 sm:w-40";

export default function HomePage() {
  return (
    <div className="container-page space-y-4 py-3 sm:space-y-5 sm:py-4">
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}

async function HomeContent() {
  const home = await getHome();

  // "Now" column: the live sale (non-flash) with its best deals, else best sellers.
  const liveSale = home.campaigns.find((c) => c.status === "live") ?? null;
  const liveSaleItems = liveSale
    ? home.justForYou.filter((p) => p.campaign?.campaignSlug === liveSale.slug).sort((a, b) => b.discountPct - a.discountPct)
    : [];
  const showLiveSale = liveSale !== null && liveSaleItems.length >= 3;
  const upcoming = home.campaigns.filter((c) => c.status !== "live").sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <>
      {/* Hero + what's happening now */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <HeroCarousel banners={home.banners} className="h-full" />
        <div className="grid gap-3 sm:grid-cols-2 sm:items-start lg:grid-cols-1 lg:grid-rows-[1fr_auto] lg:items-stretch">
          <LiveSaleCard campaign={showLiveSale ? liveSale : null} products={showLiveSale ? liveSaleItems : home.justForYou} />
          <UpcomingSales campaigns={upcoming} />
        </div>
      </div>

      {/* Categories */}
      <Panel labelledBy="categories-heading" className="py-3 sm:px-4 sm:py-3">
        <SectionHeader id="categories-heading" title="Shop by category" icon={LayoutGrid} href="/search" hrefLabel="All products" compact />
        <div className="scrollbar-none -mx-3.5 flex gap-1 overflow-x-auto px-3.5 sm:mx-0 sm:grid sm:grid-cols-8 sm:overflow-visible sm:px-0">
          {home.categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-lg p-1 text-center text-[11px] font-medium leading-tight transition-colors hover:bg-primary-soft/60 sm:w-auto sm:py-1.5"
            >
              <CategoryIcon icon={c.icon} hue={c.hue} className="size-10 transition-transform group-hover:scale-110" />
              <span className="line-clamp-2">{c.name}</span>
            </Link>
          ))}
        </div>
      </Panel>

      {/* Flash sale */}
      {home.flashSale && home.flashSale.items.length > 0 && (
        <Panel labelledBy="flash-heading" className="overflow-hidden p-0 sm:p-0">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-accent-soft via-[oklch(0.97_0.03_50)] to-card px-3.5 py-2 sm:px-5">
            <div className="flex items-center gap-3">
              <h2 id="flash-heading" className="inline-flex items-center gap-1.5 text-base font-extrabold italic tracking-tight text-accent sm:text-lg">
                <Zap className="size-4.5" fill="currentColor" aria-hidden /> Flash Sale
              </h2>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <span className="hidden sm:inline">Ends in</span>
                <Countdown to={home.flashSale.campaign.endAt} compact className="rounded bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background sm:hidden" />
                <Countdown to={home.flashSale.campaign.endAt} className="hidden sm:inline-flex" />
              </span>
            </div>
            <Link href={`/campaigns/${home.flashSale.campaign.slug}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline sm:text-sm">
              Shop all <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="p-3.5 sm:p-4">
            <Rail label="Flash sale products">
              {home.flashSale.items.map((p) => (
                <ProductCard key={p.id} product={p} showSoldBar className={RAIL_CARD} />
              ))}
            </Rail>
          </div>
        </Panel>
      )}

      {/* Verified picks */}
      {home.verifiedPicks.length > 0 && (
        <Panel labelledBy="verified-heading" className="border-verified/25 bg-gradient-to-br from-verified-soft via-card to-card sm:p-4">
          <SectionHeader
            id="verified-heading"
            title="Lunetbuz Verified"
            icon={BadgeCheck}
            tone="verified"
            subtitle="Physically inspected by our team: 100% genuine and exactly as shown."
            href="/search?verified=1"
          />
          <Rail label="Lunetbuz Verified products">
            {home.verifiedPicks.map((p) => (
              <ProductCard key={p.id} product={p} className={RAIL_CARD} />
            ))}
          </Rail>
        </Panel>
      )}

      {/* Just for you */}
      <section aria-labelledby="jfy-heading">
        <SectionHeader id="jfy-heading" title="Just for you" subtitle="Popular with shoppers across Bangladesh" />
        <ProductGrid products={home.justForYou.slice(0, JUST_FOR_YOU_LIMIT)} priorityCount={7} />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline" className="min-w-52 rounded-full border-primary/30 text-primary hover:bg-primary-soft">
            <Link href="/search?sort=popular">
              See more products <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-44 rounded-2xl sm:h-56" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <ProductGridSkeleton count={14} />
    </>
  );
}

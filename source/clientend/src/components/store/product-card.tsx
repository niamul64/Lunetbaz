import Link from "next/link";
import { BadgeCheck, Truck, Zap } from "lucide-react";
import { Rating } from "@/components/common/commerce";
import { Media } from "@/components/common/media";
import { Skeleton } from "@/components/ui/display";
import { cn, formatCompact, formatPrice } from "@/lib/utils";
import type { ProductCard as ProductCardData } from "@/types";

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
  priority?: boolean;
  /** Flash-sale style: shows a "sold" progress bar instead of location. */
  showSoldBar?: boolean;
}

export function ProductCard({ product, className, priority, showSoldBar }: ProductCardProps) {
  const soldPct = product.campaign ? Math.min(95, Math.round((product.soldCount / (product.soldCount + product.campaign.campaignStock * 10)) * 100)) : 0;

  return (
    <Link
      href={`/p/${product.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_30px_-12px_rgb(30_27_75/0.25)] focus-visible:shadow-md",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        <Media src={product.image} alt={product.name} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]" priority={priority} />
        {product.discountPct > 0 && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-danger px-1.5 py-px text-[10px] font-bold text-white shadow-sm">-{product.discountPct}%</span>
        )}
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          {product.verified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-verified/95 px-1.5 py-px text-[10px] font-semibold text-white shadow-sm backdrop-blur" title="Lunetbuz Verified">
              <BadgeCheck className="size-3" aria-hidden /> Verified
            </span>
          )}
        </div>
        {product.campaign && !showSoldBar && (
          <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-r from-accent to-[oklch(0.68_0.2_35)] px-2 py-0.5 text-[10px] font-semibold text-white">
            <Zap className="size-3" fill="currentColor" aria-hidden /> <span className="truncate">{product.campaign.campaignName}</span>
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold text-background">Out of stock</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 min-h-8 text-xs leading-4 text-foreground/90 group-hover:text-foreground">{product.name}</h3>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-base font-bold tracking-tight text-accent">{formatPrice(product.finalPrice)}</span>
          {product.price > product.finalPrice && <span className="text-[11px] text-muted-foreground line-through">{formatPrice(product.price)}</span>}
        </div>

        {showSoldBar ? (
          <div className="mt-auto space-y-1 pt-0.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-accent-soft">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-[oklch(0.62_0.21_30)]" style={{ width: `${Math.max(soldPct, 8)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">{formatCompact(product.soldCount)} sold</p>
          </div>
        ) : (
          <>
            <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              {product.reviewCount > 0 ? <Rating value={product.rating} count={product.reviewCount} compact /> : <span className="font-medium text-primary">New</span>}
              {product.soldCount > 0 && <span>{formatCompact(product.soldCount)} sold</span>}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{product.shop.location}</span>
              {product.freeShipping && (
                <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-success">
                  <Truck className="size-3" aria-hidden /> Free
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, className, priorityCount = 0 }: { products: ProductCardData[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7", className)} aria-busy aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-2 p-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

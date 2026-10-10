import { Star } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

export function Price({ value, original, className, size = "md" }: { value: number; original?: number | null; className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-3xl" };
  const showOriginal = original != null && original > value;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold text-accent", sizes[size])}>{formatPrice(value)}</span>
      {showOriginal && (
        <>
          <span className="text-xs text-muted-foreground line-through">
            <span className="sr-only">Original price </span>
            {formatPrice(original)}
          </span>
          <span className="text-xs font-medium text-foreground/80">-{Math.round(((original - value) / original) * 100)}%</span>
        </>
      )}
    </span>
  );
}

export function Rating({ value, count, size = "sm", compact, className }: { value: number; count?: number; size?: "sm" | "md"; compact?: boolean; className?: string }) {
  const star = size === "sm" ? "size-3" : "size-4";
  const label = `Rated ${value.toFixed(1)} out of 5${count !== undefined ? `, ${count} reviews` : ""}`;
  // Compact form (one icon) for product grids, where dozens of cards render at once.
  if (compact)
    return (
      <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={label}>
        <Star className={cn(star, "fill-amber-400 text-amber-400")} aria-hidden />
        <span className="font-medium text-foreground">{value.toFixed(1)}</span>
        {count !== undefined && <span>({count})</span>}
      </span>
    );
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={label}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(star, i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} />
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
    </span>
  );
}

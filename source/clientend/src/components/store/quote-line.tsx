"use client";

import Link from "next/link";
import { BadgeCheck, Minus, Plus, Trash2 } from "lucide-react";
import { Media } from "@/components/common/media";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/primitives";
import { cn, formatPrice, variantLabel } from "@/lib/utils";
import type { QuoteLine } from "@/types";

export function QuoteLineRow({
  line,
  selectable,
  selected,
  onToggle,
  onQty,
  onRemove,
}: {
  line: QuoteLine;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onQty?: (qty: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className={cn("flex gap-3 py-4", !line.available && "opacity-70")}>
      {selectable && <Checkbox checked={selected} onCheckedChange={onToggle} disabled={!line.available} aria-label={`Select ${line.name}`} className="mt-7" />}
      <Link href={`/p/${line.slug}`} className="shrink-0">
        <Media src={line.image} alt={line.name} className="size-20 rounded-lg border border-border" iconClassName="size-8" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <Link href={`/p/${line.slug}`} className="line-clamp-2 text-sm hover:text-primary">
          {line.name}
        </Link>
        <p className="text-xs text-muted-foreground">{variantLabel(line.attributes)}</p>
        <div className="flex flex-wrap gap-1.5">
          {line.verified && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-verified">
              <BadgeCheck className="size-3" aria-hidden /> Verified
            </span>
          )}
          {line.campaignName && <span className="text-[11px] font-medium text-accent">{line.campaignName} price</span>}
        </div>
        {line.issue && <p className="text-xs font-medium text-danger">{line.issue}</p>}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <div className="text-right">
          <p className="font-semibold text-accent">{formatPrice(line.unitPrice)}</p>
          {line.originalPrice > line.unitPrice && <p className="text-xs text-muted-foreground line-through">{formatPrice(line.originalPrice)}</p>}
        </div>
        {onQty ? (
          <div className="flex items-center gap-1">
            {onRemove && (
              <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove ${line.name}`}>
                <Trash2 className="text-muted-foreground" />
              </Button>
            )}
            <div className="flex items-center rounded-md border border-input">
              <Button variant="ghost" size="icon-sm" onClick={() => onQty(line.qty - 1)} disabled={line.qty <= 1} aria-label="Decrease quantity">
                <Minus />
              </Button>
              <span className="w-8 text-center text-sm tabular-nums">{line.qty}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => onQty(line.qty + 1)} disabled={line.qty >= line.maxQty} aria-label="Increase quantity">
                <Plus />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Qty: {line.qty}</p>
        )}
      </div>
    </div>
  );
}

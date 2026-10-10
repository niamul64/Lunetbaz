import Link from "next/link";
import { Check } from "lucide-react";
import { Media } from "@/components/common/media";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { cn, formatDateTime, formatPrice, variantLabel } from "@/lib/utils";
import type { OrderItem, OrderPackage, PackageStatus } from "@/types";

const FLOW: PackageStatus[] = ["pending", "confirmed", "packed", "ready_to_ship", "shipped", "delivered"];

/** Horizontal progress for a package. */
export function PackageProgress({ status }: { status: PackageStatus }) {
  if (status === "cancelled" || status === "returned") return <StatusBadge status={status} />;
  const current = FLOW.indexOf(status);
  return (
    <ol className="flex items-center gap-1" aria-label={`Status: ${statusLabel(status)}`}>
      {FLOW.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-1">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
              i <= current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
            title={statusLabel(s)}
          >
            {i < current ? <Check className="size-3" /> : i + 1}
          </span>
          {i < FLOW.length - 1 && <span className={cn("h-0.5 flex-1 rounded", i < current ? "bg-primary" : "bg-border")} />}
        </li>
      ))}
    </ol>
  );
}

export function PackageTimeline({ timeline }: { timeline: OrderPackage["timeline"] }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {[...timeline].reverse().map((e, i) => (
        <li key={`${e.status}-${e.at}`} className="relative">
          <span className={cn("absolute -left-[1.6rem] top-1 size-2.5 rounded-full ring-4 ring-card", i === 0 ? "bg-primary" : "bg-muted-foreground/40")} />
          <p className={cn("text-sm font-medium", i !== 0 && "text-muted-foreground")}>{statusLabel(e.status)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(e.at)}
            {e.note && ` · ${e.note}`}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function OrderItemRow({ item, linkToProduct = true }: { item: OrderItem; linkToProduct?: boolean }) {
  const name = <span className="line-clamp-2 text-sm">{item.name}</span>;
  return (
    <div className="flex gap-3 py-3">
      <Media src={item.image} alt={item.name} className="size-14 shrink-0 rounded-md border border-border" iconClassName="size-6" />
      <div className="min-w-0 flex-1">
        {linkToProduct ? (
          <Link href={`/p/${item.productId}`} className="hover:text-primary">
            {name}
          </Link>
        ) : (
          name
        )}
        <p className="text-xs text-muted-foreground">{variantLabel(item.attributes)}</p>
      </div>
      <div className="text-right text-sm">
        <p>{formatPrice(item.unitPrice)}</p>
        <p className="text-xs text-muted-foreground">× {item.qty}</p>
      </div>
    </div>
  );
}

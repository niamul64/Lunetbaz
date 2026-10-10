"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ShoppingCart, Store, Trash2 } from "lucide-react";
import { QuoteLineRow } from "@/components/store/quote-line";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Checkbox } from "@/components/ui/primitives";
import { cn, formatPrice } from "@/lib/utils";
import { storeQueries } from "@/services/store.service";
import { useCartStore } from "@/stores/cart.store";
import { useSession } from "@/stores/session.store";

export default function CartPage() {
  const router = useRouter();
  const { user } = useSession();
  const { items, hydrated, setQty, remove, toggle, toggleAll } = useCartStore();
  const lines = useMemo(() => items.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })), [items]);
  const quote = useQuery({ ...storeQueries.quote(lines), placeholderData: keepPreviousData });

  const selectedIds = new Set(items.filter((i) => i.selected).map((i) => i.variantId));
  const allLines = quote.data?.groups.flatMap((g) => g.lines) ?? [];
  const selectedLines = allLines.filter((l) => selectedIds.has(l.variantId) && l.available);
  const subtotal = selectedLines.reduce((s, l) => s + l.lineTotal, 0);
  const selectedCount = selectedLines.reduce((n, l) => n + l.qty, 0);
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  if (!hydrated) return <CartSkeleton />;

  if (!items.length)
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse categories or search for something you love."
          action={
            <Button asChild>
              <Link href="/">Continue shopping</Link>
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-2xl font-semibold">My cart</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card className="flex items-center justify-between px-4 py-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(Boolean(c))} /> Select all ({items.length})
            </label>
            <Button variant="ghost" size="sm" onClick={() => remove([...selectedIds])} disabled={!selectedIds.size}>
              <Trash2 /> Delete selected
            </Button>
          </Card>

          {!quote.data ? (
            <CartSkeleton inline />
          ) : (
            quote.data.groups.map((group) => (
              <Card key={group.shop.id} className={cn("px-4", quote.isPlaceholderData && "opacity-70")}>
                <Link href={`/shop/${group.shop.slug}`} className="flex items-center gap-2 border-b border-border py-3 text-sm font-medium hover:text-primary">
                  <Store className="size-4" aria-hidden /> {group.shop.name}
                </Link>
                <div className="divide-y divide-border">
                  {group.lines.map((line) => (
                    <QuoteLineRow
                      key={line.variantId}
                      line={line}
                      selectable
                      selected={selectedIds.has(line.variantId)}
                      onToggle={() => toggle(line.variantId)}
                      onQty={(q) => setQty(line.variantId, q)}
                      onRemove={() => remove([line.variantId])}
                    />
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="sticky top-32 space-y-4 p-5">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal ({selectedCount} items)</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="text-muted-foreground">Calculated at checkout</dd>
            </div>
          </dl>
          <div className="flex justify-between border-t border-border pt-3 font-semibold">
            <span>Total</span>
            <span className="text-accent">{formatPrice(subtotal)}</span>
          </div>
          <Button
            size="lg"
            variant="accent"
            className="w-full"
            disabled={!selectedCount}
            onClick={() => router.push(user ? "/checkout" : "/login?next=/checkout")}
          >
            Proceed to checkout ({selectedCount})
          </Button>
          {!user && <p className="text-center text-xs text-muted-foreground">You&apos;ll be asked to log in before placing the order.</p>}
        </Card>
      </div>
    </div>
  );
}

function CartSkeleton({ inline }: { inline?: boolean }) {
  const body = (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
  return inline ? body : <div className="container-page py-6">{body}</div>;
}

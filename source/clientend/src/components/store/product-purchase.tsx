"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, BadgeCheck, Heart, Minus, Plus, RotateCcw, ShieldCheck, Truck, Zap } from "lucide-react";
import { Countdown } from "@/components/common/countdown";
import { Price } from "@/components/common/commerce";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn, formatDate } from "@/lib/utils";
import { MAX_QTY_PER_LINE, useCartStore } from "@/stores/cart.store";
import type { ProductDetail } from "@/types";

/** Variant selection, price, quantity and add-to-cart. */
export function ProductPurchase({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const wishlist = useWishlist(product.id);

  const attributeKeys = useMemo(() => [...new Set(product.variants.flatMap((v) => Object.keys(v.attributes)))], [product.variants]);
  const initial = product.variants.find((v) => v.stock > 0) ?? product.variants[0]!;
  const [selection, setSelection] = useState<Record<string, string>>(initial.attributes);
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((v) => attributeKeys.every((k) => v.attributes[k] === selection[k])) ?? null;
  const offer = variant ? product.offers.find((o) => o.variantId === variant.id) : undefined;
  const regular = variant ? (variant.salePrice ?? variant.price) : 0;
  const finalPrice = offer ? Math.min(offer.campaignPrice, regular) : regular;
  const available = variant ? Math.min(variant.stock, offer ? offer.campaignStock : Infinity) : 0;
  const maxQty = Math.min(available, MAX_QTY_PER_LINE);

  function optionsFor(key: string) {
    return [...new Set(product.variants.map((v) => v.attributes[key]).filter(Boolean))] as string[];
  }
  function isOptionAvailable(key: string, value: string) {
    return product.variants.some((v) => v.attributes[key] === value && v.stock > 0 && attributeKeys.every((k) => k === key || v.attributes[k] === selection[k]));
  }

  function addToCart(buyNow: boolean) {
    if (!variant || maxQty <= 0) return;
    add({ productId: product.id, variantId: variant.id, qty }, { exclusive: buyNow });
    if (buyNow) router.push("/checkout");
    else
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
  }

  return (
    <div className="space-y-5">
      {offer && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent px-4 py-2.5 text-accent-foreground">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Zap className="size-4" fill="currentColor" aria-hidden /> {offer.campaignName}
          </span>
          <span className="inline-flex items-center gap-2 text-sm">
            Ends in <Countdown to={offer.endsAt} className="[&>span]:bg-white/25 [&>span]:text-white" />
          </span>
        </div>
      )}

      <div className="space-y-1">
        <Price value={finalPrice} original={variant?.price} size="xl" />
        {offer && <p className="text-xs text-muted-foreground">Only {offer.campaignStock} left at this campaign price</p>}
      </div>

      {attributeKeys.map((key) => (
        <fieldset key={key}>
          <legend className="mb-2 text-sm">
            <span className="text-muted-foreground">{key}: </span>
            <span className="font-medium">{selection[key]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {optionsFor(key).map((value) => {
              const selected = selection[key] === value;
              const ok = isOptionAvailable(key, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelection((s) => ({ ...s, [key]: value }));
                    setQty(1);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    selected ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-foreground/40",
                    !ok && "text-muted-foreground line-through decoration-1",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Quantity</span>
        <div className="flex items-center rounded-md border border-input">
          <Button variant="ghost" size="icon-sm" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
            <Minus />
          </Button>
          <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
            {qty}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity">
            <Plus />
          </Button>
        </div>
        <span className={cn("text-xs", available > 0 && available <= 5 ? "font-medium text-danger" : "text-muted-foreground")}>
          {available <= 0 ? "Out of stock" : available <= 5 ? `Only ${available} left` : "In stock"}
        </span>
      </div>

      <div className="flex gap-3">
        <Button size="lg" variant="accent" className="flex-1" onClick={() => addToCart(true)} disabled={!variant || maxQty <= 0}>
          Buy now
        </Button>
        <Button size="lg" className="flex-1" onClick={() => addToCart(false)} disabled={!variant || maxQty <= 0}>
          Add to cart
        </Button>
        <Button size="lg" variant="outline" className="px-3" onClick={wishlist.toggle} aria-pressed={wishlist.saved} aria-label={wishlist.saved ? "Remove from wishlist" : "Save to wishlist"}>
          <Heart className={cn("size-5!", wishlist.saved && "fill-danger text-danger")} />
        </Button>
      </div>

      {product.verification.status === "verified" && (
        <div className="rounded-lg border border-verified/40 bg-verified-soft p-4 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-[oklch(0.4_0.11_160)]">
            <BadgeCheck className="size-5" aria-hidden /> Lunetbuz Verified product
          </p>
          <ul className="mt-2 space-y-1 text-[oklch(0.35_0.08_160)]">
            <li>✔ Physically inspected by Lunetbuz: 100% original</li>
            <li>✔ Photos, videos and description are locked after verification</li>
            <li>✔ Not genuine or not as shown? Full money back</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Verified on {formatDate(product.verification.verifiedAt)} · valid until {formatDate(product.verification.expiresAt)} ·{" "}
            <Link href="/verified" className="underline">
              Learn more
            </Link>
          </p>
        </div>
      )}

      <ul className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
        <li className="flex gap-2">
          <Truck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{product.freeShipping ? "Free delivery" : "Delivery from ৳60"} · 1–5 days</span>
        </li>
        <li className="flex gap-2">
          <Banknote className="size-4 shrink-0 text-muted-foreground" aria-hidden /> Cash on Delivery available
        </li>
        <li className="flex gap-2">
          <RotateCcw className="size-4 shrink-0 text-muted-foreground" aria-hidden /> 7-day easy return
        </li>
        <li className="flex gap-2">
          <ShieldCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {product.warranty ?? "No warranty"}
        </li>
      </ul>
    </div>
  );
}

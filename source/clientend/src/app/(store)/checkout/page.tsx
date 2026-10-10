"use client";

import { RequireSession } from "@/components/common/guards";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, MapPin, Plus, ShieldCheck, Smartphone, Store, Tag } from "lucide-react";
import { toast } from "sonner";
import { AddressForm } from "@/components/store/address-form";
import { QuoteLineRow } from "@/components/store/quote-line";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardHeader, EmptyState, Skeleton } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/primitives";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/utils";
import { accountQueries, accountService } from "@/services/account.service";
import { storeQueries, storeService } from "@/services/store.service";
import { selectSelectedLines, useCartStore } from "@/stores/cart.store";
import type { PaymentMethod } from "@/types";
import { useShallow } from "zustand/react/shallow";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; description: string; icon: typeof Banknote }[] = [
  { value: "cod", label: "Cash on Delivery", description: "Pay when you receive the parcel", icon: Banknote },
  { value: "bkash", label: "bKash", description: "Pay with your bKash account", icon: Smartphone },
  { value: "nagad", label: "Nagad", description: "Pay with your Nagad account", icon: Smartphone },
  { value: "rocket", label: "Rocket", description: "Pay with DBBL Rocket", icon: Smartphone },
  { value: "card", label: "Credit / Debit card", description: "Visa, Mastercard, Amex via SSLCommerz", icon: CreditCard },
];

function CheckoutPageContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const hydrated = useCartStore((s) => s.hydrated);
  const lines = useCartStore(useShallow(selectSelectedLines));
  const removeSelected = useCartStore((s) => s.removeSelected);

  const addresses = useQuery(accountQueries.addresses());
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addressDialog, setAddressDialog] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const effectiveAddressId = addressId ?? addresses.data?.find((a) => a.isDefault)?.id ?? addresses.data?.[0]?.id ?? null;
  const address = addresses.data?.find((a) => a.id === effectiveAddressId);
  const quote = useQuery({ ...storeQueries.quote(lines, effectiveAddressId, voucherCode), placeholderData: keepPreviousData });
  const problems = useMemo(() => quote.data?.groups.flatMap((g) => g.lines.filter((l) => l.issue)) ?? [], [quote.data]);

  useEffect(() => {
    if (quote.data?.voucherError && voucherCode) toast.error(quote.data.voucherError);
  }, [quote.data?.voucherError, voucherCode]);

  const createAddress = useMutation({
    mutationFn: accountService.createAddress,
    onSuccess: (a) => {
      setAddressId(a.id);
      setAddressDialog(false);
      void qc.invalidateQueries({ queryKey: accountQueries.addresses().queryKey });
    },
  });

  const placeOrder = useMutation({
    mutationFn: () => {
      // Same key for retries of the same attempt, so a double click can't create two orders.
      idempotencyKey.current ??= crypto.randomUUID();
      return storeService.checkout({ items: lines, addressId: effectiveAddressId!, paymentMethod: payment, voucherCode }, idempotencyKey.current);
    },
    meta: { silent: true },
    onSuccess: (result) => {
      if (result.paymentRedirectUrl) {
        window.location.assign(result.paymentRedirectUrl);
        return;
      }
      removeSelected();
      void qc.invalidateQueries({ queryKey: ["account"] });
      void qc.invalidateQueries({ queryKey: ["store", "quote"] });
      router.replace(`/checkout/success?order=${result.orderId}`);
    },
    onError: (error) => {
      idempotencyKey.current = null;
      if (isApiError(error) && error.code === "CART_CHANGED") void quote.refetch();
      toast.error(error.message);
    },
  });

  if (!hydrated) return <CheckoutSkeleton />;
  if (!lines.length)
    return (
      <div className="container-page py-10">
        <EmptyState
          title="Nothing to check out"
          description="Select items in your cart first."
          action={
            <Button asChild>
              <Link href="/cart">Go to cart</Link>
            </Button>
          }
        />
      </div>
    );

  const q = quote.data;

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-2xl font-semibold">Checkout</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4" aria-hidden /> Delivery address
                </span>
              }
              action={
                <Button variant="outline" size="sm" onClick={() => setAddressDialog(true)}>
                  <Plus /> New address
                </Button>
              }
            />
            <div className="p-4">
              {addresses.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !addresses.data?.length ? (
                <p className="text-sm text-muted-foreground">Add a delivery address to continue.</p>
              ) : (
                <RadioGroup value={effectiveAddressId ?? ""} onValueChange={setAddressId}>
                  {addresses.data.map((a) => (
                    <RadioCard key={a.id} value={a.id}>
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">
                          {a.name} · {a.phone} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-normal">{a.label}</span>
                        </p>
                        <p className="text-muted-foreground">
                          {a.line}, {a.area}, {a.district}, {a.division}
                        </p>
                      </div>
                    </RadioCard>
                  ))}
                </RadioGroup>
              )}
            </div>
          </Card>

          {q?.groups.map((group) => (
            <Card key={group.shop.id} className="px-4">
              <div className="flex items-center justify-between border-b border-border py-3 text-sm">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Store className="size-4" aria-hidden /> {group.shop.name}
                </span>
                <span className="text-muted-foreground">
                  Delivery: {group.shippingFee ? formatPrice(group.shippingFee) : "Free"}
                  {q.etaDays && ` · ${q.etaDays} days`}
                </span>
              </div>
              <div className="divide-y divide-border">
                {group.lines.map((line) => (
                  <QuoteLineRow key={line.variantId} line={line} />
                ))}
              </div>
            </Card>
          ))}

          <Card>
            <CardHeader title="Payment method" />
            <div className="p-4">
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => (
                  <RadioCard key={m.value} value={m.value}>
                    <m.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                      <span className="block font-medium">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.description}</span>
                    </span>
                  </RadioCard>
                ))}
              </RadioGroup>
            </div>
          </Card>
        </div>

        <Card className="sticky top-32 space-y-4 p-5">
          <h2 className="font-semibold">Order summary</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setVoucherCode(voucherInput.trim().toUpperCase() || null);
            }}
          >
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={voucherInput} onChange={(e) => setVoucherInput(e.target.value)} placeholder="Voucher code" className="pl-9 uppercase" aria-label="Voucher code" />
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
          {q?.voucher && (
            <p className="text-xs text-success">
              {q.voucher.code} applied: {q.voucher.title}
            </p>
          )}
          {!q ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label={`Subtotal (${q.itemCount} items)`} value={formatPrice(q.subtotal)} />
              <Row label="Delivery fee" value={q.shippingFee ? formatPrice(q.shippingFee) : "Free"} />
              {q.discount > 0 && <Row label="Voucher discount" value={`-${formatPrice(q.discount)}`} className="text-success" />}
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-accent">{formatPrice(q.total)}</dd>
              </div>
            </dl>
          )}
          {problems.length > 0 && (
            <Alert tone="danger" title="Some items need attention">
              {problems.map((p) => `${p.name}: ${p.issue}`).join(" · ")}
            </Alert>
          )}
          <Button
            size="lg"
            variant="accent"
            className="w-full"
            loading={placeOrder.isPending}
            disabled={!address || !q || problems.length > 0 || quote.isFetching}
            onClick={() => placeOrder.mutate()}
          >
            {payment === "cod" ? "Place order" : `Pay ${q ? formatPrice(q.total) : ""}`}
          </Button>
          <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden /> Secure checkout · 7-day easy return
          </p>
        </Card>
      </div>

      <Dialog open={addressDialog} onOpenChange={setAddressDialog}>
        <DialogContent title="Add delivery address" size="lg">
          <AddressForm onSubmit={(v) => createAddress.mutate(v)} submitting={createAddress.isPending} submitLabel="Save and use this address" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireSession portal="store">
      <CheckoutPageContent />
    </RequireSession>
  );
}

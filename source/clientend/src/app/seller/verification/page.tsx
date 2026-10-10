"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, FileUp, Lock, ShieldCheck, X } from "lucide-react";
import { Can, RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, VerifiedBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { NativeSelect } from "@/components/ui/input";
import { RadioCard, RadioGroup, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, humanize } from "@/lib/utils";
import { sellerQueries, sellerService } from "@/services/seller.service";

export default function SellerVerificationPage() {
  return (
    <RequirePermission permission={P.sellerVerificationView}>
      <Verification />
    </RequirePermission>
  );
}

function Verification() {
  const { data, isLoading, error } = useQuery(sellerQueries.verification());
  const [applyOpen, setApplyOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Lunetbuz Verified Badge"
        description="Get your products physically verified as 100% genuine. Verified products rank higher and convert better."
        actions={
          <Can permission={P.sellerVerificationApply}>
            <Button variant="verified" onClick={() => setApplyOpen(true)}>
              <BadgeCheck /> Apply for a product
            </Button>
          </Can>
        }
      />
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {[
          { icon: FileUp, title: "1. Apply with proof", text: "Brand authorization, invoices or import documents." },
          { icon: ShieldCheck, title: "2. Inspection & approval", text: "An officer checks the real item; a second officer approves." },
          { icon: Lock, title: "3. Badge & content lock", text: "Photos and description lock. Price and stock stay editable." },
        ].map((s) => (
          <Card key={s.title} className="flex gap-3 p-4">
            <s.icon className="size-5 shrink-0 text-verified" aria-hidden />
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.text}</p>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error || !data ? (
        <ErrorState message={errorMessage(error)} />
      ) : (
        <Card>
          <Tabs defaultValue="requests">
            <TabsList className="px-4">
              <TabsTrigger value="requests">Requests ({data.requests.length})</TabsTrigger>
              <TabsTrigger value="changes">Change requests ({data.changeRequests.length})</TabsTrigger>
              <TabsTrigger value="history">Badge history</TabsTrigger>
            </TabsList>
            <TabsContent value="requests" className="pt-0">
              {data.requests.length === 0 ? (
                <EmptyState icon={BadgeCheck} title="No verification requests yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.requests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                      <Media src={r.product.images[0] ?? "ph://package/0"} alt="" className="size-14 shrink-0 rounded-lg" iconClassName="size-6" />
                      <div className="min-w-0 flex-1 space-y-1 text-sm">
                        <Link href={`/seller/products/${r.product.id}`} className="font-medium hover:text-primary">
                          {r.product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDate(r.submittedAt)} · {r.inspectionMethod === "hub" ? "Inspection at Lunetbuz hub" : "On-site inspection"} · {r.documents.length} document(s)
                        </p>
                        {r.inspection && (
                          <p className="text-xs">
                            Inspected by {r.inspectorName} on {formatDate(r.inspection.inspectedAt)}: <span className="text-muted-foreground">{r.inspection.notes}</span>
                          </p>
                        )}
                        {r.rejectionReason && <p className="text-xs text-danger">Reason: {r.rejectionReason}</p>}
                        {r.product.verification?.status === "suspended" && r.status === "approved" && (
                          <Alert tone="danger" className="mt-2">
                            Badge suspended pending an authenticity investigation.
                          </Alert>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {r.status === "approved" && r.product.verification?.status === "verified" ? <VerifiedBadge size="xs" /> : <StatusBadge status={r.status} />}
                        {r.product.verification?.expiresAt && r.status === "approved" && (
                          <span className="text-xs text-muted-foreground">Valid until {formatDate(r.product.verification.expiresAt)}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="changes" className="pt-0">
              {data.changeRequests.length === 0 ? (
                <EmptyState title="No change requests" description="Open a verified product and choose “Request change” to propose new content." />
              ) : (
                <ul className="divide-y divide-border">
                  {data.changeRequests.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium">{c.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Fields: {c.fields.map(humanize).join(", ")} · {formatDate(c.submittedAt)}
                        </p>
                        <p className="text-xs">“{c.reason}”</p>
                        {c.reviewNote && <p className="text-xs text-danger">Reviewer: {c.reviewNote}</p>}
                      </div>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="history" className="pt-0">
              {data.badgeEvents.length === 0 ? (
                <EmptyState title="No badge activity yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.badgeEvents.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span>
                        <Badge tone={e.action === "granted" || e.action === "reinstated" ? "verified" : "danger"}>{humanize(e.action)}</Badge>
                        <span className="ml-2">{data.requests.find((r) => r.productId === e.productId)?.product.name ?? e.productId}</span>
                        {e.reason && <span className="ml-2 text-xs text-muted-foreground">{e.reason}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(e.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {data && <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} products={data.eligibleProducts} />}
    </>
  );
}

const DOC_TYPES = [
  { value: "brand_authorization", label: "Brand authorization / distributor letter" },
  { value: "purchase_invoice", label: "Purchase invoice" },
  { value: "import_document", label: "Import document (LC / Bill of entry)" },
  { value: "gi_certificate", label: "GI / origin certificate" },
  { value: "warranty_card", label: "Warranty card" },
];

function ApplyDialog({ open, onOpenChange, products }: { open: boolean; onOpenChange: (o: boolean) => void; products: { id: string; name: string; images: string[] }[] }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [method, setMethod] = useState<"hub" | "onsite">("hub");
  const [docType, setDocType] = useState(DOC_TYPES[0]!.value);
  const [docs, setDocs] = useState<{ type: string; name: string }[]>([]);

  const apply = useMutation({
    mutationFn: () => sellerService.requestVerification(productId, { inspectionMethod: method, documents: docs }),
    onSuccess: () => {
      toast.success("Verification requested. Our team will schedule the inspection.");
      void qc.invalidateQueries({ queryKey: ["seller"] });
      onOpenChange(false);
      setProductId("");
      setDocs([]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Apply for the Verified Badge"
        description="While verification is in progress, the product's content is frozen so it can be compared with the real item."
        size="lg"
        footer={
          <Button variant="verified" onClick={() => apply.mutate()} loading={apply.isPending} disabled={!productId || !docs.length}>
            Submit request
          </Button>
        }
      >
        <div className="space-y-5">
          <Field label="Product" required hint={products.length ? undefined : "No eligible products. Only live, unverified products can apply."}>
            <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Choose a live product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">Inspection method</p>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as "hub" | "onsite")} className="sm:grid-cols-2">
              <RadioCard value="hub">
                <span>
                  <span className="block font-medium">Send a sample to our hub</span>
                  <span className="block text-xs text-muted-foreground">Fastest, usually 3–5 days</span>
                </span>
              </RadioCard>
              <RadioCard value="onsite">
                <span>
                  <span className="block font-medium">On-site inspection</span>
                  <span className="block text-xs text-muted-foreground">An officer visits your shop or warehouse</span>
                </span>
              </RadioCard>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Supporting documents</p>
            <div className="flex flex-wrap gap-2">
              <div className="w-72">
                <NativeSelect value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type">
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted">
                <FileUp className="size-4" aria-hidden /> Upload PDF/image
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setDocs((d) => [...d, { type: docType, name: f.name }]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <ul className="space-y-1">
              {docs.map((d, i) => (
                <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                  <span>
                    {d.name} <span className="text-xs text-muted-foreground">({humanize(d.type)})</span>
                  </span>
                  <button onClick={() => setDocs(docs.filter((_, j) => j !== i))} aria-label={`Remove ${d.name}`} className="text-muted-foreground hover:text-danger">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

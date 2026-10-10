"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleCheck, ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, VerificationStatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardBody, CardHeader, ErrorState, Skeleton, TBody, THead, Table, Td, Th } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice, humanize, variantLabel } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";

export default function AdminProductPage() {
  return (
    <RequirePermission permission={P.productsView}>
      <ProductReview />
    </RequirePermission>
  );
}

function ProductReview() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: p, isLoading, error } = useQuery(adminQueries.product(id));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "product", id] });
    void qc.invalidateQueries({ queryKey: ["admin", "products"] });
    void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };
  const moderate = useMutation({
    mutationFn: ({ decision, reason }: { decision: "approve" | "reject"; reason?: string }) => adminService.moderateProduct(id, decision, reason),
    onSuccess: (r) => (toast.success(r.status === "active" ? "Product approved and live" : "Product rejected. The seller has been notified."), refresh()),
  });
  const badge = useMutation({
    mutationFn: ({ action, reason }: { action: "suspend" | "revoke" | "reinstate"; reason?: string }) => adminService.badgeAction(id, action, reason),
    onSuccess: () => (toast.success("Badge updated"), refresh()),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !p) return <ErrorState message={errorMessage(error, "Product not found.")} />;
  const v = p.verification.status;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={p.name}
        description={`${p.shopName} · ${p.brand} · updated ${formatDate(p.updatedAt)}`}
        actions={
          <>
            <StatusBadge status={p.status} />
            <VerificationStatusBadge status={v} />
            {p.status === "active" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/p/${p.slug}`} target="_blank">
                  <ExternalLink /> Storefront
                </Link>
              </Button>
            )}
          </>
        }
      />

      {p.status === "pending_review" && (
        <Can permission={P.productsModerate}>
          <Alert
            tone="warning"
            title="Awaiting quality review"
            className="mb-4"
            action={
              <div className="flex shrink-0 gap-2">
                <ConfirmDialog
                  trigger={<Button size="sm" variant="outline" className="text-danger">Reject</Button>}
                  title="Reject this listing?"
                  variant="destructive"
                  confirmLabel="Reject"
                  reason={{ label: "What must the seller fix?", placeholder: "e.g. Images are stock photos, not the actual product" }}
                  onConfirm={(reason) => moderate.mutateAsync({ decision: "reject", reason })}
                />
                <Button size="sm" onClick={() => moderate.mutate({ decision: "approve" })} loading={moderate.isPending}>
                  <CircleCheck /> Approve
                </Button>
              </div>
            }
          >
            Check that photos are real, the title and category are accurate, and no prohibited claims are made.
          </Alert>
        </Can>
      )}
      {p.status === "rejected" && p.rejectionReason && (
        <Alert tone="danger" title="Rejected" className="mb-4">
          {p.rejectionReason}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Content" />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {p.images.map((src, i) => (
                  <Media key={i} src={src} alt={`Image ${i + 1}`} className="size-24 rounded-lg border border-border" iconClassName="size-8" />
                ))}
              </div>
              <ul className="list-inside list-disc text-sm">
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {p.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3 rounded bg-muted px-3 py-1.5">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Variants" />
            <Table>
              <THead>
                <tr>
                  <Th>Variant</Th>
                  <Th>SKU</Th>
                  <Th>Price</Th>
                  <Th>Sale</Th>
                  <Th>Stock</Th>
                </tr>
              </THead>
              <TBody>
                {p.variants.map((x) => (
                  <tr key={x.id}>
                    <Td>{variantLabel(x.attributes)}</Td>
                    <Td className="font-mono text-xs">{x.sku}</Td>
                    <Td>{formatPrice(x.price)}</Td>
                    <Td>{x.salePrice ? formatPrice(x.salePrice) : "—"}</Td>
                    <Td>{x.stock}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>
        <Card>
          <CardHeader title="Verified badge" />
          <CardBody className="space-y-3 text-sm">
            <VerificationStatusBadge status={v} />
            {p.verification.verifiedAt && <p className="text-muted-foreground">Verified {formatDate(p.verification.verifiedAt)} · expires {formatDate(p.verification.expiresAt)}</p>}
            <div className="flex flex-wrap gap-2">
              {v === "verified" && (
                <Can permission={[P.verificationInspect, P.ticketsManage]} mode="any">
                  <ConfirmDialog
                    trigger={<Button size="sm" variant="outline">Suspend</Button>}
                    title="Suspend the Verified badge?"
                    variant="destructive"
                    confirmLabel="Suspend"
                    reason={{ label: "Reason" }}
                    onConfirm={(reason) => badge.mutateAsync({ action: "suspend", reason })}
                  />
                </Can>
              )}
              {v === "suspended" && (
                <Can permission={P.verificationApprove}>
                  <Button size="sm" variant="verified" onClick={() => badge.mutate({ action: "reinstate" })}>
                    Reinstate
                  </Button>
                </Can>
              )}
              {(v === "verified" || v === "suspended") && (
                <Can permission={P.verificationRevoke}>
                  <ConfirmDialog
                    trigger={<Button size="sm" variant="destructive">Revoke</Button>}
                    title="Revoke the badge permanently?"
                    description="Use this when a product is confirmed fake or not as described. The shop receives a strike."
                    variant="destructive"
                    confirmLabel="Revoke"
                    reason={{ label: "Findings" }}
                    onConfirm={(reason) => badge.mutateAsync({ action: "revoke", reason })}
                  />
                </Can>
              )}
            </div>
            <ul className="space-y-2 border-t border-border pt-3">
              {p.badgeEvents.map((e) => (
                <li key={e.id}>
                  <Badge tone={e.action === "granted" || e.action === "reinstated" ? "verified" : "danger"}>{humanize(e.action)}</Badge>
                  <span className="ml-2 text-xs text-muted-foreground">{formatDate(e.at)}</span>
                  {e.reason && <p className="mt-0.5 text-xs">{e.reason}</p>}
                </li>
              ))}
              {!p.badgeEvents.length && <li className="text-muted-foreground">No badge history.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

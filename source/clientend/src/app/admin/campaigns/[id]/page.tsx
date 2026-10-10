"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ExternalLink, Pencil } from "lucide-react";
import { CampaignForm } from "@/components/admin/campaign-form";
import { CampaignRules } from "@/components/common/campaign-parts";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, statusLabel } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, EmptyState, ErrorState, Skeleton, TBody, THead, Table, Td, Th } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { CampaignApplicationView, CampaignStatus } from "@/types";

const NEXT: Partial<Record<CampaignStatus, { to: CampaignStatus; label: string; hint: string }>> = {
  draft: { to: "registration_open", label: "Open registration", hint: "Shops can start applying." },
  registration_open: { to: "registration_closed", label: "Close registration", hint: "No more applications are accepted." },
  registration_closed: { to: "scheduled", label: "Schedule campaign", hint: "Requires all applications to be reviewed." },
  scheduled: { to: "live", label: "Go live now", hint: "Normally done automatically at the start time." },
  live: { to: "ended", label: "End campaign", hint: "Normally done automatically at the end time." },
  ended: { to: "settled", label: "Mark settled", hint: "After fees and commission are calculated." },
};

export default function AdminCampaignPage() {
  return (
    <RequirePermission permission={P.campaignsView}>
      <CampaignDetail />
    </RequirePermission>
  );
}

function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(adminQueries.campaign(id));
  const { data: categories } = useQuery(adminQueries.categories());
  const [editOpen, setEditOpen] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "campaign", id] });
    void qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };
  const update = useMutation({
    mutationFn: (input: Parameters<typeof adminService.updateCampaign>[1]) => adminService.updateCampaign(id, input),
    onSuccess: (c) => {
      toast.success(`Campaign is now ${statusLabel(c.status).toLowerCase()}`);
      setEditOpen(false);
      refresh();
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={errorMessage(error, "Campaign not found.")} />;
  const { campaign: c, applications } = data;
  const next = NEXT[c.status];
  const editable = c.status === "draft" || c.status === "registration_open";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/campaigns", label: "Campaigns" }}
        title={c.name}
        description={c.tagline}
        actions={
          <>
            <StatusBadge status={c.status} />
            {c.status !== "draft" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/campaigns/${c.slug}`} target="_blank">
                  <ExternalLink /> Landing page
                </Link>
              </Button>
            )}
            <Can permission={P.campaignsManage}>
              {editable && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit
                </Button>
              )}
              {next && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm">
                      {next.label} <ArrowRight />
                    </Button>
                  }
                  title={`${next.label}?`}
                  description={next.hint}
                  confirmLabel={next.label}
                  onConfirm={() => update.mutateAsync({ status: next.to })}
                />
              )}
            </Can>
          </>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Rules & schedule" description={c.description} />
          <CardBody>
            <CampaignRules campaign={c} categoryNames={c.rules.categoryIds.map((cid) => categories?.find((x) => x.id === cid)?.name ?? cid)} />
          </CardBody>
        </Card>

        <section className="space-y-3">
          <h2 className="font-semibold">Shop applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <Card>
              <EmptyState title="No applications yet" description={c.status === "draft" ? "Open registration so shops can apply." : undefined} />
            </Card>
          ) : (
            applications.map((app) => <ApplicationCard key={app.id} app={app} minDiscount={c.rules.minDiscountPct} onReviewed={refresh} />)
          )}
        </section>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit campaign" size="xl">
          <CampaignForm campaign={c} onSubmit={(input) => update.mutate(input)} submitting={update.isPending} />
        </DialogContent>
      </Dialog>
    </>
  );
}

type Decision = { decision: "approve" | "reject"; reason: string };

function ApplicationCard({ app, minDiscount, onReviewed }: { app: CampaignApplicationView; minDiscount: number; onReviewed: () => void }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(app.itemsDetailed.map((i) => [i.variantId, { decision: i.discountPct >= minDiscount ? "approve" : "reject", reason: i.discountPct >= minDiscount ? "" : `Discount below ${minDiscount}% minimum.` }])),
  );
  const review = useMutation({
    mutationFn: () => adminService.reviewApplication(app.id, Object.entries(decisions).map(([variantId, d]) => ({ variantId, decision: d.decision, reason: d.reason || undefined }))),
    onSuccess: () => {
      toast.success("Application reviewed. The shop has been notified.");
      onReviewed();
    },
  });
  const pending = app.status === "pending";

  return (
    <Card>
      <CardHeader
        title={app.shop.name}
        description={`Rating ${app.shop.rating.toFixed(1)} · submitted ${formatDate(app.submittedAt)} · ${app.items.length} item(s)`}
        action={<StatusBadge status={app.status} />}
      />
      <Table>
        <THead>
          <tr>
            <Th>Product</Th>
            <Th>Regular</Th>
            <Th>Campaign</Th>
            <Th>Discount</Th>
            <Th>Stock</Th>
            <Th>Decision</Th>
          </tr>
        </THead>
        <TBody>
          {app.itemsDetailed.map((i) => {
            const d = decisions[i.variantId]!;
            return (
              <tr key={i.variantId} className="align-top">
                <Td>
                  <div className="flex min-w-56 items-center gap-2">
                    <Media src={i.image} alt="" className="size-10 shrink-0 rounded" iconClassName="size-4" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-medium">{i.productName}</p>
                      <p className="text-xs text-muted-foreground">{i.variantLabel}</p>
                    </div>
                  </div>
                </Td>
                <Td>{formatPrice(i.referencePrice)}</Td>
                <Td className="font-medium text-accent">{formatPrice(i.campaignPrice)}</Td>
                <Td className={cn(i.discountPct < minDiscount ? "font-medium text-danger" : "text-success")}>{i.discountPct}%</Td>
                <Td>{i.campaignStock}</Td>
                <Td className="min-w-56">
                  {pending ? (
                    <Can permission={P.campaignsReview} fallback={<StatusBadge status={i.status} />}>
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {(["approve", "reject"] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setDecisions((s) => ({ ...s, [i.variantId]: { ...d, decision: opt } }))}
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-xs capitalize",
                                d.decision === opt ? (opt === "approve" ? "border-success bg-success-soft" : "border-danger bg-danger-soft text-danger") : "border-border",
                              )}
                              aria-pressed={d.decision === opt}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {d.decision === "reject" && (
                          <Input
                            className="h-8 text-xs"
                            placeholder="Reason for the seller"
                            value={d.reason}
                            onChange={(e) => setDecisions((s) => ({ ...s, [i.variantId]: { ...d, reason: e.target.value } }))}
                            aria-label="Rejection reason"
                          />
                        )}
                      </div>
                    </Can>
                  ) : (
                    <>
                      <StatusBadge status={i.status} />
                      {i.rejectionReason && <p className="mt-1 text-xs text-danger">{i.rejectionReason}</p>}
                    </>
                  )}
                </Td>
              </tr>
            );
          })}
        </TBody>
      </Table>
      {pending && (
        <Can permission={P.campaignsReview}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 border-t border-border">
            {Object.values(decisions).some((d) => d.decision === "reject" && !d.reason.trim()) ? (
              <Alert tone="warning">Add a reason for every rejected item.</Alert>
            ) : (
              <span className="text-sm text-muted-foreground">
                {Object.values(decisions).filter((d) => d.decision === "approve").length} of {app.items.length} items will be approved.
              </span>
            )}
            <Button onClick={() => review.mutate()} loading={review.isPending} disabled={Object.values(decisions).some((d) => d.decision === "reject" && !d.reason.trim())}>
              Submit review
            </Button>
          </CardBody>
        </Can>
      )}
    </Card>
  );
}

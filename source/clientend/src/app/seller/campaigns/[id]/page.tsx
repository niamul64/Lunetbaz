"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleAlert, Send } from "lucide-react";
import { CampaignBanner, CampaignRules } from "@/components/common/campaign-parts";
import { Countdown } from "@/components/common/countdown";
import { Can, RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, VerificationStatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, ErrorState, Skeleton, TBody, THead, Table, Td, Th } from "@/components/ui/display";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/primitives";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice, variantLabel } from "@/lib/utils";
import { sellerQueries, sellerService } from "@/services/seller.service";
import type { ApplyCampaignItemInput, Campaign } from "@/types";

export default function SellerCampaignDetailPage() {
  return (
    <RequirePermission permission={P.sellerCampaignsView}>
      <CampaignDetail />
    </RequirePermission>
  );
}

function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery(sellerQueries.campaign(id));
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={errorMessage(error, "Campaign not found.")} />;
  const { campaign, applications, eligible } = data;

  return (
    <>
      <PageHeader back={{ href: "/seller/campaigns", label: "Campaigns" }} title={campaign.name} actions={<StatusBadge status={campaign.status} />} />
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CampaignBanner campaign={campaign}>
            {campaign.status === "registration_open" && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                Registration closes in <Countdown to={campaign.registrationEnd} className="[&>span]:bg-white/25 [&>span]:text-white" />
              </p>
            )}
          </CampaignBanner>
          <CardBody className="space-y-3">
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
            <CampaignRules campaign={campaign} />
          </CardBody>
        </Card>

        {applications.map((app) => (
          <Card key={app.id}>
            <CardHeader title="Your application" description={`Submitted ${formatDate(app.submittedAt)}`} action={<StatusBadge status={app.status} />} />
            <Table>
              <THead>
                <tr>
                  <Th>Product</Th>
                  <Th>Regular</Th>
                  <Th>Campaign price</Th>
                  <Th>Stock</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <TBody>
                {app.items.map((i) => (
                  <tr key={i.variantId}>
                    <Td>
                      <p className="line-clamp-1 font-medium">{i.productName}</p>
                      <p className="text-xs text-muted-foreground">{i.variantLabel}</p>
                    </Td>
                    <Td>{formatPrice(i.referencePrice)}</Td>
                    <Td className="font-medium text-accent">{formatPrice(i.campaignPrice)}</Td>
                    <Td>{i.campaignStock}</Td>
                    <Td>
                      <StatusBadge status={i.status} />
                      {i.rejectionReason && <p className="mt-1 max-w-xs text-xs text-danger">{i.rejectionReason}</p>}
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </Card>
        ))}

        {campaign.status === "registration_open" && (
          <Can permission={P.sellerCampaignsApply} fallback={<Alert tone="info">Only shop admins and managers can apply to campaigns.</Alert>}>
            {eligible.canApply ? (
              <ApplyForm campaign={campaign} />
            ) : (
              <Alert tone="warning" icon={CircleAlert} title="Your shop can't apply yet">
                {eligible.reasons.join(" ")}
              </Alert>
            )}
          </Can>
        )}
      </div>
    </>
  );
}

type Draft = { selected: boolean; price: string; stock: string };

function ApplyForm({ campaign }: { campaign: Campaign }) {
  const qc = useQueryClient();
  const products = useQuery(sellerQueries.products({ status: "active", pageSize: 100 }));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rows = useMemo(
    () =>
      (products.data?.data ?? [])
        .filter((p) => !campaign.rules.verifiedOnly || p.verification.status === "verified")
        .flatMap((p) => p.variants.map((v) => ({ product: p, variant: v, ref: v.salePrice ?? v.price }))),
    [products.data, campaign.rules.verifiedOnly],
  );

  const selected: ApplyCampaignItemInput[] = rows
    .filter((r) => drafts[r.variant.id]?.selected)
    .map((r) => ({ productId: r.product.id, variantId: r.variant.id, campaignPrice: Number(drafts[r.variant.id]!.price), campaignStock: Number(drafts[r.variant.id]!.stock) }));

  const apply = useMutation({
    mutationFn: () => sellerService.applyToCampaign(campaign.id, selected),
    // Errors are shown inline (per item) or in the alert above the table.
    meta: { silent: true },
    onSuccess: () => {
      toast.success("Application submitted. You'll be notified after review.");
      setDrafts({});
      setErrors({});
      void qc.invalidateQueries({ queryKey: ["seller", "campaign", campaign.id] });
      void qc.invalidateQueries({ queryKey: ["seller", "campaigns"] });
    },
    onError: (e) => {
      if (isApiError(e)) setErrors((e.details as { fieldErrors?: Record<string, string> })?.fieldErrors ?? {});
    },
  });

  const setDraft = (variantId: string, patch: Partial<Draft>, ref: number) =>
    setDrafts((d) => {
      const current = d[variantId] ?? { selected: false, price: String(Math.floor(ref * (1 - (campaign.rules.minDiscountPct + 5) / 100))), stock: String(campaign.rules.minStock) };
      return { ...d, [variantId]: { ...current, ...patch } };
    });

  return (
    <Card>
      <CardHeader
        title="Apply with your products"
        description={`Pick up to ${campaign.rules.maxProductsPerShop} products. Campaign price must be at least ${campaign.rules.minDiscountPct}% below the regular price.`}
        action={
          <Button onClick={() => apply.mutate()} loading={apply.isPending} disabled={!selected.length}>
            <Send /> Submit {selected.length ? `(${selected.length})` : ""}
          </Button>
        }
      />
      {apply.error && !Object.keys(errors).length && (
        <div className="px-5 pt-4">
          <Alert tone="danger">{errorMessage(apply.error)}</Alert>
        </div>
      )}
      {products.isLoading ? (
        <CardBody>
          <Skeleton className="h-40 w-full" />
        </CardBody>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th className="w-10">
                <span className="sr-only">Select</span>
              </Th>
              <Th>Product</Th>
              <Th>Regular price</Th>
              <Th>Campaign price ৳</Th>
              <Th>Discount</Th>
              <Th>Campaign stock</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map(({ product, variant, ref }) => {
              const d = drafts[variant.id];
              const pct = d ? Math.round(((ref - Number(d.price || 0)) / ref) * 100) : null;
              return (
                <tr key={variant.id} className="align-top">
                  <Td>
                    <Checkbox checked={Boolean(d?.selected)} onCheckedChange={(c) => setDraft(variant.id, { selected: Boolean(c) }, ref)} aria-label={`Select ${product.name}`} />
                  </Td>
                  <Td>
                    <div className="flex min-w-56 items-center gap-2">
                      <Media src={product.images[0] ?? "ph://package/0"} alt="" className="size-10 shrink-0 rounded" iconClassName="size-4" />
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-medium">{product.name}</p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          {variantLabel(variant.attributes)} · stock {variant.stock} <VerificationStatusBadge status={product.verification.status} />
                        </p>
                      </div>
                    </div>
                    {errors[variant.id] && <p className="mt-1 text-xs text-danger">{errors[variant.id]}</p>}
                  </Td>
                  <Td>{formatPrice(ref)}</Td>
                  <Td>
                    <Input
                      className="h-9 w-28"
                      inputMode="numeric"
                      disabled={!d?.selected}
                      value={d?.price ?? ""}
                      onChange={(e) => setDraft(variant.id, { price: e.target.value.replace(/\D/g, "") }, ref)}
                      aria-label="Campaign price"
                    />
                  </Td>
                  <Td className={pct !== null && pct < campaign.rules.minDiscountPct ? "font-medium text-danger" : "text-success"}>{d?.selected && pct !== null ? `${pct}%` : "—"}</Td>
                  <Td>
                    <Input
                      className="h-9 w-20"
                      inputMode="numeric"
                      disabled={!d?.selected}
                      value={d?.stock ?? ""}
                      onChange={(e) => setDraft(variant.id, { stock: e.target.value.replace(/\D/g, "") }, ref)}
                      aria-label="Campaign stock"
                    />
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, VerificationStatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, humanize } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";

export default function AdminShopPage() {
  return (
    <RequirePermission permission={P.shopsView}>
      <ShopDetail />
    </RequirePermission>
  );
}

function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: shop, isLoading, error } = useQuery(adminQueries.shop(id));
  const setStatus = useMutation({
    mutationFn: ({ status, reason }: { status: "active" | "suspended"; reason?: string }) => adminService.setShopStatus(id, status, reason),
    onSuccess: (s) => {
      toast.success(s.status === "active" ? "Shop is active" : "Shop suspended. Its products are hidden.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !shop) return <ErrorState message={errorMessage(error, "Shop not found.")} />;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/shops", label: "Shops" }}
        title={shop.name}
        description={shop.description}
        actions={
          <>
            <StatusBadge status={shop.status} />
            {shop.status === "active" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/shop/${shop.slug}`} target="_blank">
                  <ExternalLink /> Storefront
                </Link>
              </Button>
            )}
            {shop.status === "pending" && (
              <Can permission={P.shopsApprove}>
                <Button size="sm" onClick={() => setStatus.mutate({ status: "active" })} loading={setStatus.isPending}>
                  Approve shop & KYC
                </Button>
              </Can>
            )}
            <Can permission={P.shopsSuspend}>
              {shop.status === "active" && (
                <ConfirmDialog
                  trigger={<Button size="sm" variant="outline" className="text-danger">Suspend</Button>}
                  title={`Suspend ${shop.name}?`}
                  description="All products are hidden and the team loses access to selling features."
                  variant="destructive"
                  confirmLabel="Suspend"
                  reason={{ label: "Reason" }}
                  onConfirm={(reason) => setStatus.mutateAsync({ status: "suspended", reason })}
                />
              )}
              {shop.status === "suspended" && (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ status: "active" })}>
                  Reinstate
                </Button>
              )}
            </Can>
          </>
        }
      />
      {shop.status === "pending" && (
        <Alert tone="warning" title="New seller awaiting approval" className="mb-4">
          Check the trade license and NID below before approving.
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={`Products (${shop.products.length})`} />
            <ul className="divide-y divide-border">
              {shop.products.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-muted/50">
                    <Media src={p.images[0] ?? "ph://package/0"} alt="" className="size-9 shrink-0 rounded" iconClassName="size-4" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <VerificationStatusBadge status={p.verification.status} />
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Team" />
            <ul className="divide-y divide-border text-sm">
              {shop.team.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-2.5">
                  <span>
                    {u.name} <span className="text-muted-foreground">· {u.email}</span>
                  </span>
                  <span className="text-xs">{u.roleLabel}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Performance" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Rating", value: shop.rating ? shop.rating.toFixed(1) : "—" },
                  { label: "Positive", value: `${shop.positiveRatingPct}%` },
                  { label: "Ship on time", value: `${shop.shipOnTimePct}%` },
                  { label: "Response rate", value: `${shop.responseRatePct}%` },
                  { label: "Followers", value: shop.followers },
                  { label: "Strikes", value: <span className={shop.strikes ? "text-danger" : ""}>{shop.strikes}</span> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="KYC & payout" />
            <CardBody>
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "KYC status", value: <StatusBadge status={shop.kyc.status} /> },
                  { label: "Trade license", value: shop.kyc.tradeLicense },
                  { label: "NID", value: shop.kyc.nid },
                  { label: "TIN", value: shop.kyc.tin ?? "—" },
                  { label: "Commission", value: `${shop.commissionRatePct}%` },
                  { label: "Payout", value: `${humanize(shop.payout.method)} · ${shop.payout.accountName} · ${shop.payout.accountNo}` },
                  { label: "Location", value: `${shop.location.area}, ${shop.location.district}, ${shop.location.division}` },
                  { label: "Joined", value: formatDate(shop.joinedAt) },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

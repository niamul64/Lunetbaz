"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { CampaignBanner } from "@/components/common/campaign-parts";
import { RequirePermission } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { sellerQueries, type SellerCampaign } from "@/services/seller.service";

export default function SellerCampaignsPage() {
  return (
    <RequirePermission permission={P.sellerCampaignsView}>
      <Campaigns />
    </RequirePermission>
  );
}

function Campaigns() {
  const { data, isLoading, error } = useQuery(sellerQueries.campaigns());

  const open = data?.filter((c) => c.status === "registration_open") ?? [];
  const mine = data?.filter((c) => c.status !== "registration_open" && c.myApplication) ?? [];
  const others = data?.filter((c) => c.status !== "registration_open" && !c.myApplication && !["ended", "settled"].includes(c.status)) ?? [];

  return (
    <>
      <PageHeader title="Campaigns" description="Join sales and fests run by Lunetbuz to boost your visibility and sales." />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} />
      ) : !data?.length ? (
        <EmptyState icon={Megaphone} title="No campaigns right now" />
      ) : (
        <div className="space-y-8">
          <Section title="Open for registration" campaigns={open} emptyText="No campaigns are accepting registrations right now." />
          <Section title="My campaigns" campaigns={mine} emptyText="You haven't joined any campaign yet." />
          {others.length > 0 && <Section title="Upcoming & running" campaigns={others} />}
        </div>
      )}
    </>
  );
}

function Section({ title, campaigns, emptyText }: { title: string; campaigns: SellerCampaign[]; emptyText?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CampaignBanner campaign={c}>
                <StatusBadge status={c.status} className="w-fit bg-white/20 text-white" />
              </CampaignBanner>
              <div className="space-y-3 p-4 text-sm">
                <p className="text-muted-foreground">
                  {c.status === "registration_open" ? `Register by ${formatDate(c.registrationEnd)}` : `Live ${formatDate(c.startAt)} – ${formatDate(c.endAt)}`}
                </p>
                {c.myApplication && (
                  <p className="flex flex-wrap items-center gap-2">
                    Your application: <StatusBadge status={c.myApplication.status} />
                    <span className="text-xs text-muted-foreground">
                      {c.myApplication.approvedItems}/{c.myApplication.items} approved
                    </span>
                  </p>
                )}
                <Button asChild variant={c.status === "registration_open" ? "default" : "outline"} size="sm" className="w-full">
                  <Link href={`/seller/campaigns/${c.id}`}>{c.status === "registration_open" ? (c.myApplication ? "Update application" : "View & apply") : "View details"}</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

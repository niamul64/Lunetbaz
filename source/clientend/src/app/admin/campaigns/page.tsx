"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import { CAMPAIGN_TYPE_LABEL } from "@/components/common/campaign-parts";
import { Can, RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";

const TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "ended", label: "Ended" },
  { value: "settled", label: "Settled" },
];

export default function AdminCampaignsPage() {
  return (
    <RequirePermission permission={P.campaignsView}>
      <Campaigns />
    </RequirePermission>
  );
}

function Campaigns() {
  const { values, set } = useUrlState(["status"] as const);
  const { data, isLoading } = useQuery(adminQueries.campaigns(values.status));

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Sales, fests and flash sales. Open registration, review shop applications, then schedule."
        actions={
          <Can permission={P.campaignsManage}>
            <Button asChild>
              <Link href="/admin/campaigns/new">
                <Plus /> New campaign
              </Link>
            </Button>
          </Can>
        }
      />
      <div className="mb-4">
        <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon={Megaphone} title="No campaigns" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <Link key={c.id} href={`/admin/campaigns/${c.id}`} className="group">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                <div className="h-2" style={{ background: `linear-gradient(90deg, oklch(0.5 0.17 ${c.hue}), oklch(0.7 0.17 ${(c.hue + 40) % 360}))` }} />
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABEL[c.type]}</p>
                      <h2 className="font-semibold group-hover:text-primary">{c.name}</h2>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(c.startAt)} – {formatDate(c.endAt)}
                  </p>
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-muted p-2">
                      <dd className="text-base font-semibold">{c.stats.shops}</dd>
                      <dt className="text-muted-foreground">Shops</dt>
                    </div>
                    <div className="rounded bg-muted p-2">
                      <dd className="text-base font-semibold">{c.stats.approvedItems}</dd>
                      <dt className="text-muted-foreground">Approved items</dt>
                    </div>
                    <div className={`rounded p-2 ${c.stats.pendingApplications ? "bg-warning-soft" : "bg-muted"}`}>
                      <dd className="text-base font-semibold">{c.stats.pendingApplications}</dd>
                      <dt className="text-muted-foreground">To review</dt>
                    </div>
                  </dl>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

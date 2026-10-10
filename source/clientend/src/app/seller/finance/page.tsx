"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { PageHeader, StatCard } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Card, CardBody, CardHeader, DescriptionList, Skeleton } from "@/components/ui/display";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice, humanize } from "@/lib/utils";
import { sellerQueries } from "@/services/seller.service";
import type { Payout } from "@/types";

export default function SellerFinancePage() {
  return (
    <RequirePermission permission={P.sellerFinanceView}>
      <Finance />
    </RequirePermission>
  );
}

function Finance() {
  const { data, isLoading, error, refetch } = useQuery(sellerQueries.finance());

  const columns: Column<Payout>[] = [
    { key: "period", header: "Period", cell: (p) => `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}` },
    { key: "gross", header: "Gross sales", cell: (p) => formatPrice(p.grossSales), hideOnMobile: true },
    { key: "fees", header: "Commission & fees", hideOnMobile: true, cell: (p) => <span className="text-danger">-{formatPrice(p.commission + p.campaignFees + p.shippingFees + p.refunds)}</span> },
    { key: "net", header: "Net payout", cell: (p) => <span className="font-semibold">{formatPrice(p.netAmount)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div>
          <StatusBadge status={p.status} />
          {p.holdReason && <p className="mt-1 max-w-xs text-xs text-danger">{p.holdReason}</p>}
          {p.reference && <p className="mt-1 font-mono text-xs text-muted-foreground">{p.reference}</p>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Finance" description="Weekly settlements of delivered orders, after commission and fees." />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard kpi={{ key: "paid", label: "Paid out", value: data.summary.paidOut, format: "currency" }} />
            <StatCard kpi={{ key: "await", label: "Awaiting payout", value: data.summary.awaitingPayout, format: "currency" }} />
            <StatCard kpi={{ key: "pending", label: "Delivered, not yet settled", value: data.summary.pendingSettlement, format: "currency", hint: `Commission ${data.summary.commissionRatePct}%` }} />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card>
              <CardHeader title="Payouts" />
              <DataTable columns={columns} rows={data.payouts} rowKey={(p) => p.id} error={error} onRetry={() => refetch()} empty={{ title: "No payouts yet" }} />
            </Card>
            <Card>
              <CardHeader title="Payout account" description="Contact your account manager to change it." />
              <CardBody>
                <DescriptionList
                  className="sm:grid-cols-1"
                  items={[
                    { label: "Method", value: humanize(data.payoutAccount.method) },
                    { label: "Account name", value: data.payoutAccount.accountName },
                    { label: "Account", value: data.payoutAccount.accountNo },
                    ...(data.payoutAccount.bank ? [{ label: "Bank", value: data.payoutAccount.bank }] : []),
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

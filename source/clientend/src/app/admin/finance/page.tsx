"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { Can, RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader, StatCard } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice, humanize } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { PayoutView } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "pending_approval", label: "To approve" },
  { value: "approved", label: "To pay" },
  { value: "on_hold", label: "On hold" },
  { value: "paid", label: "Paid" },
];

export default function AdminFinancePage() {
  return (
    <RequirePermission permission={P.financeView}>
      <Payouts />
    </RequirePermission>
  );
}

function Payouts() {
  const qc = useQueryClient();
  const { values, set } = useUrlState(["status"] as const);
  const all = useQuery(adminQueries.payouts());
  const query = useQuery(adminQueries.payouts(values.status));
  const act = useMutation({
    mutationFn: ({ id, action, extra }: { id: string; action: "approve" | "pay" | "hold" | "release"; extra?: { reference?: string; reason?: string } }) => adminService.payoutAction(id, action, extra),
    onSuccess: (p) => {
      toast.success(`Payout ${humanize(p.status).toLowerCase()}`);
      void qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });

  const sum = (s: string) => all.data?.filter((p) => p.status === s).reduce((n, p) => n + p.netAmount, 0) ?? 0;

  const columns: Column<PayoutView>[] = [
    {
      key: "shop",
      header: "Shop",
      cell: (p) => (
        <div>
          <p className="font-medium">{p.shop.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
          </p>
        </div>
      ),
    },
    { key: "gross", header: "Gross", hideOnMobile: true, cell: (p) => formatPrice(p.grossSales) },
    { key: "commission", header: "Commission", hideOnMobile: true, cell: (p) => formatPrice(p.commission + p.campaignFees) },
    { key: "refunds", header: "Refunds & shipping", hideOnMobile: true, cell: (p) => formatPrice(p.refunds + p.shippingFees) },
    { key: "net", header: "Net", cell: (p) => <span className="font-semibold">{formatPrice(p.netAmount)}</span> },
    { key: "method", header: "Method", hideOnMobile: true, cell: (p) => humanize(p.method) },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div>
          <StatusBadge status={p.status} />
          {p.holdReason && <p className="mt-1 max-w-48 text-xs text-danger">{p.holdReason}</p>}
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (p) => (
        <Can permission={P.payoutsApprove}>
          <div className="flex justify-end gap-1">
            {p.status === "pending_approval" && (
              <Button size="sm" onClick={() => act.mutate({ id: p.id, action: "approve" })}>
                Approve
              </Button>
            )}
            {p.status === "approved" && (
              <ConfirmDialog
                trigger={<Button size="sm">Mark paid</Button>}
                title="Record bank / MFS transfer"
                confirmLabel="Mark paid"
                reason={{ label: "Transaction reference", placeholder: "e.g. BRAC-TRX-123456" }}
                onConfirm={(reference) => act.mutateAsync({ id: p.id, action: "pay", extra: { reference } })}
              />
            )}
            {(p.status === "pending_approval" || p.status === "approved") && (
              <ConfirmDialog
                trigger={<Button size="sm" variant="outline">Hold</Button>}
                title="Put payout on hold?"
                variant="destructive"
                confirmLabel="Hold payout"
                reason={{ label: "Reason (visible to the seller)" }}
                onConfirm={(reason) => act.mutateAsync({ id: p.id, action: "hold", extra: { reason } })}
              />
            )}
            {p.status === "on_hold" && (
              <Button size="sm" variant="outline" onClick={() => act.mutate({ id: p.id, action: "release" })}>
                Release
              </Button>
            )}
          </div>
        </Can>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Seller payouts" description="Weekly settlements. A payout is approved first, then marked paid with the transfer reference." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard kpi={{ key: "a", label: "Awaiting approval", value: sum("pending_approval"), format: "currency" }} />
        <StatCard kpi={{ key: "b", label: "Approved, to transfer", value: sum("approved"), format: "currency" }} />
        <StatCard kpi={{ key: "c", label: "On hold", value: sum("on_hold"), format: "currency" }} />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
        </div>
        <DataTable columns={columns} rows={query.data} rowKey={(p) => p.id} loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} empty={{ title: "No payouts" }} />
      </Card>
    </>
  );
}

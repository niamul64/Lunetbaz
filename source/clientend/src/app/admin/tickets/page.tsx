"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Card } from "@/components/ui/display";
import { Checkbox } from "@/components/ui/primitives";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDateTime, humanize } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";
import type { TicketView } from "@/types";

const TABS = [
  { value: "", label: "Open" },
  { value: "escalated", label: "Escalated" },
  { value: "pending_customer", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function AdminTicketsPage() {
  return (
    <RequirePermission permission={P.ticketsView}>
      <Tickets />
    </RequirePermission>
  );
}

function Tickets() {
  const router = useRouter();
  const { values, set, page } = useUrlState(["status", "q", "mine"] as const);
  const query = useQuery({
    ...adminQueries.tickets({ status: values.status || "open", q: values.q, assignee: values.mine === "1" ? "me" : undefined, page }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<TicketView>[] = [
    {
      key: "ticket",
      header: "Ticket",
      cell: (t) => (
        <div>
          <p className="font-medium">{t.subject}</p>
          <p className="text-xs text-muted-foreground">
            {t.ticketNo} · {humanize(t.category)} · via {t.channel}
          </p>
        </div>
      ),
    },
    { key: "customer", header: "Customer", hideOnMobile: true, cell: (t) => <span>{t.customer.name}<br /><span className="text-xs text-muted-foreground">{t.customer.phone}</span></span> },
    { key: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
    { key: "assignee", header: "Assignee", hideOnMobile: true, cell: (t) => t.assigneeName ?? <span className="text-muted-foreground">Unassigned</span> },
    { key: "updated", header: "Updated", hideOnMobile: true, cell: (t) => formatDateTime(t.updatedAt) },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <>
      <PageHeader title="Support tickets" description="Customer calls, chats and emails. Urgent and high-priority tickets are listed first." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={values.mine === "1"} onCheckedChange={(c) => set({ mine: c ? "1" : null })} /> Assigned to me
            </label>
            <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Ticket, subject, customer, phone" />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(t) => t.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          onRowClick={(t) => router.push(`/admin/tickets/${t.id}`)}
          empty={{ title: "No tickets here", description: "To log a phone call, open the customer's profile and choose “Log a call / ticket”." }}
        />
      </Card>
    </>
  );
}

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { PageHeader, SearchInput } from "@/components/common/page";
import { Badge, Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";
import type { AuditLog } from "@/types";

export default function AuditLogsPage() {
  return (
    <RequirePermission permission={P.auditView}>
      <Logs />
    </RequirePermission>
  );
}

function Logs() {
  const { values, set, page } = useUrlState(["q"] as const);
  const query = useQuery({ ...adminQueries.auditLogs({ q: values.q, page }), placeholderData: keepPreviousData });

  const columns: Column<AuditLog>[] = [
    { key: "at", header: "When", cell: (l) => <span className="whitespace-nowrap text-xs">{formatDateTime(l.at)}</span> },
    { key: "actor", header: "Who", cell: (l) => l.actorName },
    { key: "action", header: "Action", cell: (l) => <Badge tone="primary" className="font-mono">{l.action}</Badge> },
    { key: "summary", header: "Details", cell: (l) => <span className="text-sm">{l.summary}</span> },
    { key: "ip", header: "IP", hideOnMobile: true, cell: (l) => <span className="font-mono text-xs text-muted-foreground">{l.ip}</span> },
  ];

  return (
    <>
      <PageHeader title="Audit log" description="Immutable record of every administrative action across the platform." />
      <Card>
        <div className="border-b border-border p-4">
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Search action, entity or details" className="sm:w-96" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(l) => l.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          empty={{ title: "No matching entries" }}
        />
      </Card>
    </>
  );
}

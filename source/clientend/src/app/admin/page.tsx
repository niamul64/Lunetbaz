"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleCheck } from "lucide-react";
import { SalesChart } from "@/components/common/bar-chart";
import { RequirePermission, usePermissions } from "@/components/common/guards";
import { PageHeader, StatCard } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { adminQueries } from "@/services/admin.service";

export default function AdminDashboardPage() {
  return (
    <RequirePermission permission={P.adminDashboard}>
      <Dashboard />
    </RequirePermission>
  );
}

function Dashboard() {
  const { user } = usePermissions();
  const { data, isLoading, error, refetch } = useQuery(adminQueries.dashboard());

  return (
    <>
      <PageHeader title={`Good day, ${user?.name.split(" ")[0]}`} description={`${user?.roleLabel} · Your dashboard shows only what your role works on.`} />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error || !data ? (
        <ErrorState message={errorMessage(error)} action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />
      ) : (
        <div className="space-y-6">
          {data.kpis.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.kpis.map((k) => (
                <StatCard key={k.key} kpi={k} />
              ))}
            </div>
          )}
          <div className={cn("grid gap-6", data.series && "lg:grid-cols-[1fr_24rem]")}>
            {data.series && (
              <Card>
                <CardHeader title="Platform GMV – last 7 days" />
                <CardBody>
                  <SalesChart series={data.series} />
                </CardBody>
              </Card>
            )}
            <Card>
              <CardHeader title="Your work queues" description="Items waiting for someone with your role." />
              {data.queues.length === 0 ? (
                <CardBody className="text-sm text-muted-foreground">No queues for your role.</CardBody>
              ) : (
                <ul className="divide-y divide-border">
                  {data.queues.map((q) => (
                    <li key={q.key}>
                      <Link href={q.href} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/50">
                        <span>{q.label}</span>
                        <span className="flex items-center gap-2">
                          {q.count === 0 ? (
                            <CircleCheck className="size-4 text-success" aria-label="All clear" />
                          ) : (
                            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold">{q.count}</span>
                          )}
                          <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

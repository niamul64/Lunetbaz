"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { SalesChart } from "@/components/common/bar-chart";
import { RequirePermission, usePermissions } from "@/components/common/guards";
import { PageHeader, StatCard } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, ErrorState, Skeleton } from "@/components/ui/display";
import { P } from "@/lib/auth/permissions";
import { errorMessage } from "@/lib/api/errors";
import { formatDate, formatPrice } from "@/lib/utils";
import { sellerQueries } from "@/services/seller.service";

export default function SellerDashboardPage() {
  return (
    <RequirePermission permission={P.sellerDashboard}>
      <Dashboard />
    </RequirePermission>
  );
}

function Dashboard() {
  const { user, can } = usePermissions();
  const { data, isLoading, error, refetch } = useQuery(sellerQueries.dashboard());

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0]}`}
        description={`${user?.shop?.name} · ${user?.roleLabel}`}
        actions={
          can(P.sellerProductsManage) && (
            <Button asChild>
              <Link href="/seller/products/new">Add product</Link>
            </Button>
          )
        }
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error || !data ? (
        <ErrorState message={errorMessage(error)} action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />
      ) : (
        <div className="space-y-6">
          {data.alerts.length > 0 && (
            <div className="space-y-2">
              {data.alerts.map((a, i) => (
                <Alert
                  key={i}
                  tone={a.level === "info" ? "info" : a.level}
                  icon={a.level === "danger" ? CircleAlert : a.level === "warning" ? TriangleAlert : Info}
                  action={
                    a.href && (
                      <Link href={a.href} className="shrink-0 text-sm font-medium underline">
                        View
                      </Link>
                    )
                  }
                >
                  {a.message}
                </Alert>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.kpis.map((k) => (
              <StatCard key={k.key} kpi={k} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader title="Sales – last 7 days" />
              <CardBody>
                <SalesChart series={data.series} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Low stock" description="Variants with 5 or fewer units" />
              <CardBody className="space-y-3">
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All good. No low-stock variants.</p>
                ) : (
                  data.lowStock.map((l) => (
                    <Link key={`${l.productId}-${l.variant}`} href={`/seller/products/${l.productId}`} className="flex items-center justify-between gap-3 text-sm hover:text-primary">
                      <span className="min-w-0">
                        <span className="block truncate">{l.name}</span>
                        <span className="text-xs text-muted-foreground">{l.variant}</span>
                      </span>
                      <span className={l.stock === 0 ? "font-semibold text-danger" : "font-semibold text-warning"}>{l.stock}</span>
                    </Link>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader
              title="Recent orders"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/seller/orders">All orders</Link>
                </Button>
              }
            />
            <ul className="divide-y divide-border">
              {data.recentPackages.map((p) => (
                <li key={p.id}>
                  <Link href={`/seller/orders/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/50">
                    <span>
                      <span className="font-medium">{p.orderNo}</span>
                      <span className="ml-2 text-muted-foreground">
                        {p.customerName} · {formatDate(p.createdAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span>{formatPrice(p.items.reduce((s, i) => s + i.unitPrice * i.qty, 0))}</span>
                      <StatusBadge status={p.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

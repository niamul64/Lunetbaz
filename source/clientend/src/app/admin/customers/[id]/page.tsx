"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Headset } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { NewTicketDialog } from "@/components/admin/new-ticket-dialog";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";

const RISK_TONE = { trusted: "success", normal: "neutral", watch: "warning", blocked: "danger" } as const;

export default function AdminCustomerPage() {
  return (
    <RequirePermission permission={P.customersView}>
      <Customer />
    </RequirePermission>
  );
}

function Customer() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(adminQueries.customer(id));
  const [ticketOpen, setTicketOpen] = useState(false);
  const setStatus = useMutation({
    mutationFn: (status: "active" | "suspended") => adminService.setCustomerStatus(id, status),
    onSuccess: () => {
      toast.success("Customer updated");
      void qc.invalidateQueries({ queryKey: ["admin", "customer", id] });
      void qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={errorMessage(error, "Customer not found.")} />;
  const { customer, orders, tickets, addresses } = data;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={customer.name}
        description={`${customer.phone} · ${customer.email || "no email"} · customer since ${formatDate(customer.createdAt)}`}
        actions={
          <>
            <StatusBadge status={customer.status} />
            <Can permission={P.ticketsManage}>
              <Button size="sm" onClick={() => setTicketOpen(true)}>
                <Headset /> Log a call / ticket
              </Button>
            </Can>
            <Can permission={P.usersManage}>
              {customer.status === "active" ? (
                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm" className="text-danger">Suspend</Button>}
                  title="Suspend this customer?"
                  description="They won't be able to log in or place orders."
                  variant="destructive"
                  confirmLabel="Suspend"
                  reason={{ label: "Reason" }}
                  onConfirm={() => setStatus.mutateAsync("suspended")}
                />
              ) : (
                <Button variant="outline" size="sm" onClick={() => setStatus.mutate("active")}>
                  Reactivate
                </Button>
              )}
            </Can>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={`Orders (${orders.length})`} />
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/50">
                    <span>
                      <span className="font-medium">{o.orderNo}</span> <span className="text-muted-foreground">· {formatDate(o.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      {formatPrice(o.totals.total)} <StatusBadge status={o.status} />
                    </span>
                  </Link>
                </li>
              ))}
              {!orders.length && <li className="px-5 py-4 text-sm text-muted-foreground">No orders yet.</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title={`Tickets (${tickets.length})`} />
            <ul className="divide-y divide-border">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/50">
                    <span>
                      <span className="font-medium">{t.subject}</span> <span className="text-muted-foreground">· {t.ticketNo}</span>
                    </span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
              {!tickets.length && <li className="px-5 py-4 text-sm text-muted-foreground">No tickets.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Summary" />
            <CardBody>
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Orders", value: customer.orderCount },
                  { label: "Total spent", value: formatPrice(customer.totalSpent) },
                  { label: "COD risk", value: customer.risk ? <Badge tone={RISK_TONE[customer.risk.flag]}>{customer.risk.flag}</Badge> : "—" },
                  { label: "COD delivery success", value: customer.risk ? `${customer.risk.codSuccessRatePct}%` : "—" },
                  { label: "Returns", value: customer.risk?.returns ?? 0 },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Addresses" />
            <CardBody className="space-y-3 text-sm">
              {addresses.map((a) => (
                <p key={a.id}>
                  <span className="font-medium">{a.label}</span>
                  {a.isDefault && <span className="ml-1 text-xs text-primary">(default)</span>}
                  <br />
                  <span className="text-muted-foreground">
                    {a.line}, {a.area}, {a.district}
                  </span>
                </p>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
      <NewTicketDialog open={ticketOpen} onOpenChange={setTicketOpen} customerId={customer.id} orders={orders.map((o) => ({ id: o.id, orderNo: o.orderNo }))} />
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Send } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission, usePermissions } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Avatar, Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { cn, formatDateTime, humanize } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";

export default function AdminTicketPage() {
  return (
    <RequirePermission permission={P.ticketsView}>
      <Ticket />
    </RequirePermission>
  );
}

function Ticket() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: t, isLoading, error } = useQuery(adminQueries.ticket(id));
  const staff = useQuery({ ...adminQueries.staff(), enabled: can(P.ticketsManage) });
  const [reply, setReply] = useState("");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "ticket", id] });
    void qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  };

  const send = useMutation({ mutationFn: () => adminService.replyTicket(id, reply), onSuccess: () => (setReply(""), refresh()) });
  const update = useMutation({ mutationFn: (input: { status?: string; priority?: string; assigneeId?: string | null }) => adminService.updateTicket(id, input), onSuccess: () => (toast.success("Ticket updated"), refresh()) });
  const suspendBadge = useMutation({
    mutationFn: ({ productId, reason }: { productId: string; reason: string }) => adminService.badgeAction(productId, "suspend", reason),
    onSuccess: () => toast.success("Verified badge suspended and escalated to the verification team"),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !t) return <ErrorState message={errorMessage(error, "Ticket not found.")} />;

  return (
    <>
      <PageHeader back={{ href: "/admin/tickets", label: "Tickets" }} title={t.subject} description={`${t.ticketNo} · ${humanize(t.category)} · opened ${formatDateTime(t.createdAt)} via ${t.channel}`} actions={<StatusBadge status={t.status} />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="Conversation" />
          <CardBody className="space-y-4">
            <ol className="space-y-3">
              {t.messages.map((m, i) => (
                <li key={i} className={cn("flex gap-3", m.from === "system" && "justify-center")}>
                  {m.from === "system" ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {m.body} · {formatDateTime(m.at)}
                    </span>
                  ) : (
                    <>
                      <Avatar name={m.authorName} className="size-8" />
                      <div className={cn("max-w-prose rounded-lg px-3 py-2 text-sm", m.from === "agent" ? "bg-primary-soft" : "bg-muted")}>
                        <p className="mb-0.5 text-xs font-medium">
                          {m.authorName} <span className="font-normal text-muted-foreground">· {m.from === "agent" ? "Agent" : "Customer"} · {formatDateTime(m.at)}</span>
                        </p>
                        <p className="whitespace-pre-line">{m.body}</p>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
            <Can permission={P.ticketsManage}>
              <form
                className="space-y-2 border-t border-border pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reply.trim()) send.mutate();
                }}
              >
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply or an internal note of the call…" aria-label="Reply" />
                <Button type="submit" size="sm" loading={send.isPending} disabled={!reply.trim()}>
                  <Send /> Send
                </Button>
              </form>
            </Can>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4 text-sm">
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Customer", value: <Link href={`/admin/customers/${t.customer.id}`} className="text-primary hover:underline">{t.customer.name}</Link> },
                  { label: "Phone", value: <a href={`tel:${t.customer.phone}`} className="text-primary hover:underline">{t.customer.phone}</a> },
                  { label: "Order", value: t.order ? <Link href={`/admin/orders/${t.order.id}`} className="text-primary hover:underline">{t.order.orderNo}</Link> : "—" },
                ]}
              />
              <Can permission={P.ticketsManage} fallback={<p className="text-muted-foreground">Assignee: {t.assigneeName ?? "Unassigned"}</p>}>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <NativeSelect value={t.status} onChange={(e) => update.mutate({ status: e.target.value })}>
                    {["open", "pending_customer", "escalated", "resolved", "closed"].map((s) => (
                      <option key={s} value={s}>
                        {humanize(s)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <NativeSelect value={t.priority} onChange={(e) => update.mutate({ priority: e.target.value })}>
                    {["low", "normal", "high", "urgent"].map((s) => (
                      <option key={s} value={s}>
                        {humanize(s)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Assignee</span>
                  <NativeSelect value={t.assigneeId ?? ""} onChange={(e) => update.mutate({ assigneeId: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {staff.data?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({humanize(s.role)})
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </Can>
            </CardBody>
          </Card>
          {t.category === "authenticity" && t.order && (
            <Can permission={[P.ticketsManage, P.verificationInspect]} mode="any">
              <Card>
                <CardHeader title="Authenticity complaint" description="Suspend the Verified badge on products in this order while the team investigates." />
                <CardBody className="space-y-2">
                  {t.order.packages.flatMap((p) => p.items).map((item) => (
                    <ConfirmDialog
                      key={item.variantId}
                      trigger={
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <BadgeCheck /> <span className="truncate">Suspend badge: {item.name}</span>
                        </Button>
                      }
                      title="Suspend Verified badge?"
                      description="The badge is hidden immediately and the verification team is notified."
                      variant="destructive"
                      confirmLabel="Suspend badge"
                      reason={{ label: "Reason", placeholder: `Customer complaint (${t.ticketNo})` }}
                      onConfirm={(reason) => suspendBadge.mutateAsync({ productId: item.productId, reason })}
                    />
                  ))}
                </CardBody>
              </Card>
            </Can>
          )}
        </div>
      </div>
    </>
  );
}

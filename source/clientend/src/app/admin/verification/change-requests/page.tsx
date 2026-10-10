"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, Skeleton } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDateTime, humanize } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ChangeRequestsPage() {
  return (
    <RequirePermission permission={P.verificationView}>
      <ChangeRequests />
    </RequirePermission>
  );
}

function ChangeRequests() {
  const qc = useQueryClient();
  const { values, set } = useUrlState(["status"] as const);
  const status = values.status ?? "pending";
  const { data, isLoading } = useQuery(adminQueries.changeRequests(status === "all" ? undefined : status));
  const decide = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) => adminService.decideChangeRequest(id, decision, note),
    onSuccess: () => {
      toast.success("Change request reviewed");
      void qc.invalidateQueries({ queryKey: ["admin", "verification"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Locked-content change requests"
        description="Sellers can't edit Verified listings directly. Approve only changes that are true for the inspected item; approved changes update the live listing."
      />
      <div className="mb-4">
        <FilterPills options={TABS} value={status} onChange={(v) => set({ status: v })} />
      </div>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data?.length ? (
        <EmptyState icon={ClipboardCheck} title="No change requests" />
      ) : (
        <div className="space-y-4">
          {data.map((cr) => (
            <Card key={cr.id}>
              <CardHeader
                title={cr.product.name}
                description={`${cr.shop.name} · ${formatDateTime(cr.submittedAt)} · fields: ${cr.fields.map(humanize).join(", ")}`}
                action={<StatusBadge status={cr.status} />}
              />
              <CardBody className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Seller&apos;s reason: </span>“{cr.reason}”
                </p>
                {cr.fields.includes("description") && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-border p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Current (verified)</p>
                      <p>{cr.product.description}</p>
                    </div>
                    <div className="rounded-md border border-primary/40 bg-primary-soft/30 p-3">
                      <p className="mb-1 text-xs font-medium text-primary">Proposed</p>
                      <p>{cr.proposed.description}</p>
                    </div>
                  </div>
                )}
                {cr.fields
                  .filter((f) => f !== "description")
                  .map((f) => (
                    <p key={f} className="rounded-md bg-muted p-2 text-xs">
                      <span className="font-medium">{humanize(f)}:</span> {JSON.stringify(cr.proposed[f])}
                    </p>
                  ))}
                {cr.reviewNote && <p className="text-xs text-muted-foreground">Review note: {cr.reviewNote}</p>}
                {cr.status === "pending" && (
                  <Can permission={P.verificationApprove}>
                    <div className="flex gap-2">
                      <Button size="sm" variant="verified" onClick={() => decide.mutate({ id: cr.id, decision: "approve" })}>
                        Approve change
                      </Button>
                      <ConfirmDialog
                        trigger={<Button size="sm" variant="outline" className="text-danger">Reject</Button>}
                        title="Reject this change?"
                        variant="destructive"
                        confirmLabel="Reject"
                        reason={{ label: "Note to seller" }}
                        onConfirm={(note) => decide.mutateAsync({ id: cr.id, decision: "reject", note })}
                      />
                    </div>
                  </Can>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

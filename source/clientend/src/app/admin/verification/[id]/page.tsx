"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, CalendarDays, CircleCheck, CircleX, FileText, Lock, ShieldAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission, usePermissions } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { StatusBadge, VerifiedBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardBody, CardHeader, DescriptionList, ErrorState, Skeleton } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { InspectionChecklist } from "@/types";

const CHECKS: { key: keyof InspectionChecklist; label: string; help: string }[] = [
  { key: "genuine", label: "Product is 100% genuine", help: "Serial/IMEI/batch verified with brand or registry" },
  { key: "matchesPhotos", label: "Matches listing photos & video", help: "Color, model, packaging and accessories" },
  { key: "matchesDescription", label: "Matches description & specs", help: "Every claim in title, highlights and specs is true" },
  { key: "packagingIntact", label: "Packaging & accessories complete", help: "Seals, manuals, warranty card" },
  { key: "documentsValid", label: "Documents are valid", help: "Invoices / authorization letters checked" },
];

export default function AdminVerificationDetailPage() {
  return (
    <RequirePermission permission={P.verificationView}>
      <Detail />
    </RequirePermission>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = usePermissions();
  const { data: r, isLoading, error } = useQuery(adminQueries.verificationRequest(id));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "verification"] });
    void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const schedule = useMutation({ mutationFn: () => adminService.scheduleInspection(id), onSuccess: () => (toast.success("Inspection scheduled"), refresh()) });
  const decide = useMutation({
    mutationFn: (input: { decision: "approve" | "reject"; notes?: string; reason?: string }) => adminService.decideVerification(id, input),
    onSuccess: (res) => (toast.success(res.status === "approved" ? "Badge granted. Product content is now locked." : "Request rejected"), refresh()),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !r) return <ErrorState message={errorMessage(error, "Request not found.")} />;

  const isOwnInspection = r.inspection?.officerId === user?.id;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/verification", label: "Verification queue" }}
        title={r.product.name}
        description={`${r.shop.name} · submitted ${formatDateTime(r.submittedAt)} · ${r.inspectionMethod === "hub" ? "inspection at hub" : "on-site inspection"}`}
        actions={<StatusBadge status={r.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Listing as submitted"
              description="This content is frozen while verification is in progress and locked once approved."
              action={<Lock className="size-4 text-muted-foreground" aria-label="Locked" />}
            />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {r.product.images.map((src, i) => (
                  <Media key={i} src={src} alt={`Listing image ${i + 1}`} className="size-24 rounded-lg border border-border" iconClassName="size-8" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{r.product.description}</p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {r.product.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3 rounded bg-muted px-3 py-1.5">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          {(r.status === "submitted" || r.status === "inspection_scheduled") && (
            <Can permission={P.verificationInspect} fallback={<Alert tone="info">Waiting for a verification officer to inspect this product.</Alert>}>
              {r.status === "submitted" ? (
                <Alert
                  tone="info"
                  icon={CalendarDays}
                  title="New request"
                  action={
                    <Button size="sm" onClick={() => schedule.mutate()} loading={schedule.isPending}>
                      Schedule inspection
                    </Button>
                  }
                >
                  Arrange the {r.inspectionMethod === "hub" ? "sample drop-off at the hub" : "on-site visit"} with the seller, then record the inspection.
                </Alert>
              ) : null}
              <InspectionForm requestId={id} onDone={refresh} />
            </Can>
          )}

          {r.inspection && (
            <Card>
              <CardHeader
                title="Inspection report"
                description={`${r.inspectorName} · ${formatDateTime(r.inspection.inspectedAt)}`}
                action={<StatusBadge status={r.inspection.result} />}
              />
              <CardBody className="space-y-3 text-sm">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {CHECKS.map((c) => (
                    <li key={c.key} className="flex items-center gap-2">
                      {r.inspection!.checklist[c.key] ? <CircleCheck className="size-4 text-success" aria-label="Pass" /> : <CircleX className="size-4 text-danger" aria-label="Fail" />}
                      {c.label}
                    </li>
                  ))}
                </ul>
                <p className="rounded-md bg-muted p-3">{r.inspection.notes}</p>
                {r.inspection.evidence.length > 0 && (
                  <div className="flex gap-2">
                    {r.inspection.evidence.map((src, i) => (
                      <Media key={i} src={src} alt={`Evidence ${i + 1}`} className="size-16 rounded-md" iconClassName="size-6" />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {r.status === "awaiting_approval" && (
            <Can permission={P.verificationApprove}>
              {isOwnInspection ? (
                <Alert tone="warning" icon={ShieldAlert} title="Four-eyes rule">
                  You inspected this product, so a different verification officer must give the second approval.
                </Alert>
              ) : (
                <Card className="border-verified/40">
                  <CardHeader title="Second approval" description="Approving grants the badge, locks the listing content and starts the 12-month validity." />
                  <CardBody className="flex flex-wrap gap-2">
                    <Button variant="verified" onClick={() => decide.mutate({ decision: "approve" })} loading={decide.isPending}>
                      <BadgeCheck /> Approve & grant badge
                    </Button>
                    <ConfirmDialog
                      trigger={<Button variant="outline" className="text-danger">Reject</Button>}
                      title="Reject this verification?"
                      variant="destructive"
                      confirmLabel="Reject"
                      reason={{ label: "Reason (shared with the seller)" }}
                      onConfirm={(reason) => decide.mutateAsync({ decision: "reject", reason })}
                    />
                  </CardBody>
                </Card>
              )}
            </Can>
          )}

          {r.status === "approved" && r.product.verification.status === "verified" && (
            <Alert tone="verified" icon={BadgeCheck} title="Verified">
              Approved by {r.approverName} on {formatDate(r.approval?.approvedAt)}. Valid until {formatDate(r.product.verification.expiresAt)}.
            </Alert>
          )}
          {r.rejectionReason && (
            <Alert tone="danger" title="Rejected">
              {r.rejectionReason}
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Request" />
            <CardBody className="space-y-4">
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Shop", value: r.shop.name },
                  { label: "Brand", value: r.product.brand },
                  { label: "Current badge", value: r.product.verification.status === "verified" ? <VerifiedBadge size="xs" /> : humanize(r.product.verification.status) },
                  { label: "Inspector", value: r.inspectorName ?? "—" },
                  { label: "Second approver", value: r.approverName ?? "—" },
                ]}
              />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Documents</p>
                <ul className="space-y-1 text-sm">
                  {r.documents.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" aria-hidden /> {d.name}
                      <Badge>{humanize(d.type)}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/admin/products/${r.productId}`}>Open product</Link>
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Badge history" />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {r.badgeEvents.map((e) => (
                  <li key={e.id}>
                    <Badge tone={e.action === "granted" || e.action === "reinstated" ? "verified" : "danger"}>{humanize(e.action)}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {e.byName} · {formatDate(e.at)}
                    </span>
                    {e.reason && <p className="mt-0.5 text-xs">{e.reason}</p>}
                  </li>
                ))}
                {!r.badgeEvents.length && <li className="text-muted-foreground">No history yet.</li>}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function InspectionForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [checks, setChecks] = useState<InspectionChecklist>({ genuine: false, matchesPhotos: false, matchesDescription: false, packagingIntact: false, documentsValid: false });
  const [notes, setNotes] = useState("");
  const allPass = Object.values(checks).every(Boolean);
  const submit = useMutation({
    mutationFn: (result: "pass" | "fail") => adminService.submitInspection(requestId, { checklist: checks, notes, result, evidence: ["ph://camera/200"] }),
    onSuccess: (r) => {
      toast.success(r.status === "awaiting_approval" ? "Inspection passed. Waiting for a second officer's approval." : "Inspection failed. Request rejected.");
      onDone();
    },
  });

  return (
    <Card>
      <CardHeader title="Record inspection" description="Compare the real item with the listing above. Every item must pass to recommend approval." />
      <CardBody className="space-y-4">
        <ul className="space-y-3">
          {CHECKS.map((c) => (
            <li key={c.key}>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={checks[c.key]} onCheckedChange={(v) => setChecks((s) => ({ ...s, [c.key]: Boolean(v) }))} className="mt-0.5" />
                <span>
                  <span className="block font-medium">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">{c.help}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Field label="Inspection notes" required hint="What did you verify and how? These notes are kept as evidence.">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="verified" disabled={!allPass || notes.trim().length < 10} onClick={() => submit.mutate("pass")} loading={submit.isPending && submit.variables === "pass"}>
            <CircleCheck /> Pass: send for 2nd approval
          </Button>
          <Button variant="outline" className="text-danger" disabled={notes.trim().length < 10} onClick={() => submit.mutate("fail")} loading={submit.isPending && submit.variables === "fail"}>
            <CircleX /> Fail & reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

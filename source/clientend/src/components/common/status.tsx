import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/display";
import { cn, humanize } from "@/lib/utils";
import type { VerificationStatus } from "@/types";

/** One place that maps every backend status to a label and color. */
const TONES: Record<string, BadgeTone> = {
  // generic
  active: "success",
  approved: "success",
  paid: "success",
  delivered: "success",
  published: "success",
  resolved: "success",
  pass: "success",
  live: "accent",
  verified: "verified",
  pending: "warning",
  pending_review: "warning",
  pending_approval: "warning",
  pending_customer: "info",
  submitted: "info",
  inspection_scheduled: "info",
  awaiting_approval: "warning",
  partially_approved: "info",
  invited: "info",
  draft: "neutral",
  inactive: "neutral",
  closed: "neutral",
  settled: "neutral",
  ended: "neutral",
  none: "neutral",
  expired: "neutral",
  rejected: "danger",
  suspended: "danger",
  cancelled: "danger",
  returned: "danger",
  revoked: "danger",
  failed: "danger",
  fail: "danger",
  refunded: "info",
  on_hold: "danger",
  flagged: "danger",
  removed: "neutral",
  escalated: "danger",
  open: "warning",
  // order flow
  confirmed: "info",
  processing: "info",
  packed: "info",
  ready_to_ship: "primary",
  shipped: "primary",
  partially_delivered: "primary",
  // campaigns
  registration_open: "success",
  registration_closed: "warning",
  scheduled: "primary",
  // priorities
  urgent: "danger",
  high: "danger",
  normal: "neutral",
  low: "neutral",
};

const LABELS: Record<string, string> = {
  pending_review: "Awaiting QC",
  ready_to_ship: "Ready to ship",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  pending_customer: "Waiting on customer",
  awaiting_approval: "Awaiting 2nd approval",
  inspection_scheduled: "Inspection scheduled",
  cod: "Cash on Delivery",
};

export function statusLabel(status: string) {
  return LABELS[status] ?? humanize(status);
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={TONES[status] ?? "neutral"} className={className}>
      {statusLabel(status)}
    </Badge>
  );
}

/** The Lunetbuz Verified Badge (proposal §4.6). */
export function VerifiedBadge({ size = "sm", className, label = true }: { size?: "xs" | "sm" | "md"; className?: string; label?: boolean }) {
  const sizes = { xs: "text-[10px] px-1.5 py-0 gap-0.5 [&_svg]:size-3", sm: "text-xs px-2 py-0.5 gap-1 [&_svg]:size-3.5", md: "text-sm px-2.5 py-1 gap-1.5 [&_svg]:size-4" };
  return (
    <span className={cn("inline-flex items-center rounded-full bg-verified font-semibold text-verified-foreground", sizes[size], className)} title="Lunetbuz Verified: 100% genuine, exactly as shown">
      <BadgeCheck aria-hidden />
      {label ? "Lunetbuz Verified" : <span className="sr-only">Lunetbuz Verified</span>}
    </span>
  );
}

/** Verification state for seller/admin tables. */
export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified") return <VerifiedBadge size="xs" label={false} className="px-2 py-0.5" />;
  if (status === "suspended")
    return (
      <Badge tone="danger">
        <ShieldAlert /> Suspended
      </Badge>
    );
  if (status === "revoked")
    return (
      <Badge tone="danger">
        <ShieldX /> Revoked
      </Badge>
    );
  if (status === "pending") return <Badge tone="info">Verifying</Badge>;
  if (status === "expired") return <Badge tone="neutral">Expired</Badge>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

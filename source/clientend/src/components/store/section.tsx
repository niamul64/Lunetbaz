import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent heading row for storefront sections: icon · title · subtitle · "See all". */
export function SectionHeader({
  id,
  title,
  subtitle,
  icon: Icon,
  href,
  hrefLabel = "See all",
  tone = "default",
  extra,
  compact,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  href?: string;
  hrefLabel?: string;
  tone?: "default" | "accent" | "verified";
  extra?: ReactNode;
  /** Smaller title and spacing for dense sections. */
  compact?: boolean;
}) {
  const toneCls = { default: "text-foreground", accent: "text-accent", verified: "text-[oklch(0.42_0.11_160)]" }[tone];
  return (
    <div className={cn("flex items-end justify-between gap-3", compact ? "mb-2" : "mb-3")}>
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={id} className={cn("inline-flex items-center gap-1.5 font-bold tracking-tight", compact ? "text-sm sm:text-base" : "text-base sm:text-lg", toneCls)}>
            {Icon && <Icon className="size-4.5" aria-hidden fill={tone === "accent" ? "currentColor" : "none"} />}
            {title}
          </h2>
          {extra}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground sm:text-[13px]">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm">
          {hrefLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** White rounded panel used to group a storefront section. */
export function Panel({ children, className, labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={cn("rounded-2xl border border-border/60 bg-card p-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] sm:p-5", className)}>
      {children}
    </section>
  );
}

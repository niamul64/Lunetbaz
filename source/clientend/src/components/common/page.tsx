"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/display";
import { Input } from "@/components/ui/input";
import { cn, formatNumber, formatPrice } from "@/lib/utils";
import type { Kpi } from "@/types";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 space-y-2">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function formatKpi(kpi: Pick<Kpi, "value" | "format">) {
  if (kpi.format === "currency") return formatPrice(kpi.value);
  if (kpi.format === "percent") return `${kpi.value}%`;
  return Number.isInteger(kpi.value) ? formatNumber(kpi.value) : kpi.value.toFixed(1);
}

export function StatCard({ kpi, icon }: { kpi: Kpi; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{kpi.label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatKpi(kpi)}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {kpi.delta != null && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", kpi.delta >= 0 ? "text-success" : "text-danger")}>
            {kpi.delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Math.abs(kpi.delta).toFixed(1)}%
          </span>
        )}
        {kpi.hint && <span className="text-muted-foreground">{kpi.hint}</span>}
      </div>
    </Card>
  );
}

/** Debounced search box that reports the value after the user pauses typing. */
export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value?: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value ?? "");
  const first = useRef(true);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => onChangeRef.current(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  );
}

/** Horizontal pill filters (status tabs on list pages). */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T | ""; label: string; count?: number }[];
  value: T | "" | undefined;
  onChange: (v: T | "") => void;
}) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1" role="tablist">
      {options.map((o) => {
        const active = (value ?? "") === o.value;
        return (
          <button
            key={o.value || "all"}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("ml-1.5 text-xs", active ? "opacity-80" : "text-muted-foreground")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

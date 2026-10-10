import { formatCompact, formatPrice } from "@/lib/utils";
import type { SeriesPoint } from "@/types";

/** Lightweight dependency-free bar chart for dashboard sales series. */
export function SalesChart({ series, metric = "gmv" }: { series: SeriesPoint[]; metric?: "gmv" | "orders" }) {
  if (!series.length) return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
  const values = series.map((p) => p[metric]);
  const max = Math.max(...values, 1);
  const label = (v: number) => (metric === "gmv" ? formatPrice(v) : `${v} orders`);

  return (
    <figure>
      <div className="flex h-48 items-end gap-2" role="img" aria-label={`${metric === "gmv" ? "Sales" : "Orders"} for the last ${series.length} days`}>
        {series.map((p) => (
          <div key={p.date} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max((p[metric] / max) * 100, 2)}%` }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] text-background group-hover:block">
              {label(p[metric])}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-center text-[11px] text-muted-foreground">
        {series.map((p) => (
          <span key={p.date} className="flex-1">
            {new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {series.map((p) => `${p.date}: ${metric === "gmv" ? formatCompact(p.gmv) : p.orders}`).join(", ")}
      </figcaption>
    </figure>
  );
}

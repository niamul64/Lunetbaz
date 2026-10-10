"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { ICONS } from "@/components/common/media";
import { statusLabel } from "@/components/common/status";
import { cn, formatDate } from "@/lib/utils";
import type { Campaign } from "@/types";

/** Compact auto-rotating strip of upcoming sales (rotates only when there are several). */
export function UpcomingSales({ campaigns }: { campaigns: Campaign[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = campaigns.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(id);
  }, [paused, count]);

  if (!count) return null;

  return (
    <section
      aria-label="Upcoming sales"
      aria-roledescription="carousel"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="size-3" aria-hidden /> Coming up
        </p>
        {count > 1 && (
          <div className="flex gap-1">
            {campaigns.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setIndex(i)}
                aria-label={`Show ${c.name}`}
                aria-current={i === index}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground")}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {campaigns.map((c, i) => {
          const Icon = ICONS[c.banner.slice(5).split("/")[0] ?? ""] ?? ICONS.sparkles!;
          return (
            <Link
              key={c.id}
              href={`/campaigns/${c.slug}`}
              tabIndex={i === index ? 0 : -1}
              aria-hidden={i !== index}
              className="group flex w-full shrink-0 items-center gap-2.5 px-3 pb-2.5 pt-1.5"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, oklch(0.5 0.17 ${c.hue}), oklch(0.65 0.17 ${(c.hue + 40) % 360}))` }}
              >
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold group-hover:text-primary">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Starts {formatDate(c.startAt)} · {statusLabel(c.status)}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Live countdown. Renders nothing on the server to avoid hydration mismatches. */
export function Countdown({ to, className, compact }: { to: string; className?: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock source; must start after mount
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <span className={cn("inline-block h-6 w-28", className)} aria-hidden />;
  const left = new Date(to).getTime() - now;
  if (left <= 0) return <span className={className}>Ended</span>;
  const { d, h, m, s } = parts(left);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (compact) return <span className={cn("tabular-nums", className)}>{d > 0 ? `${d}d ${pad(h)}h` : `${pad(h)}:${pad(m)}:${pad(s)}`}</span>;

  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", className)} role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {d > 0 && (
        <>
          <Unit v={String(d)} />
          <span className="text-xs">d</span>
        </>
      )}
      <Unit v={pad(h)} />:<Unit v={pad(m)} />:<Unit v={pad(s)} />
    </span>
  );
}

function Unit({ v }: { v: string }) {
  return <span className="rounded bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background">{v}</span>;
}

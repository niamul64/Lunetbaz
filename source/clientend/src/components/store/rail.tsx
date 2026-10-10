"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal, swipeable row (product rails, campaign tiles). Uses native
 * scroll-snap so it works with touch, trackpads and keyboards; desktop gets
 * arrow buttons that appear only when there is more to scroll.
 */
export function Rail({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <div className={cn("group/rail relative", className)}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 sm:mx-0 sm:gap-3 sm:scroll-px-0 sm:px-0 [&>*]:snap-start"
      >
        {children}
      </div>
      {!edges.start && <RailButton dir={-1} onClick={() => scroll(-1)} />}
      {!edges.end && <RailButton dir={1} onClick={() => scroll(1)} />}
    </div>
  );
}

function RailButton({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? "Scroll right" : "Scroll left"}
      className={cn(
        "absolute top-[38%] z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-lg backdrop-blur transition hover:scale-105 hover:text-primary sm:flex",
        dir === 1 ? "-right-4" : "-left-4",
      )}
    >
      <Icon className="size-4.5" />
    </button>
  );
}

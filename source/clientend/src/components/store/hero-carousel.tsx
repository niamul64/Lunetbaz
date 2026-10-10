"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ICONS } from "@/components/common/media";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types";

export function HeroCarousel({ banners, className }: { banners: Banner[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [paused, count]);

  if (!count) return null;
  const go = (i: number) => setIndex((i + count) % count);

  return (
    <section
      className={cn("relative overflow-hidden rounded-2xl", className)}
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex h-full min-h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((b, i) => {
          const Icon = ICONS[b.icon] ?? ICONS.sparkles!;
          return (
            <div
              key={b.id}
              className="relative flex min-h-44 w-full shrink-0 items-center overflow-hidden px-5 pb-10 pt-5 sm:min-h-56 sm:px-9"
              style={{ background: `linear-gradient(115deg, oklch(0.36 0.16 ${b.hue}) 0%, oklch(0.52 0.2 ${(b.hue + 15) % 360}) 55%, oklch(0.7 0.17 ${(b.hue + 45) % 360}) 100%)` }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${b.title}`}
              aria-hidden={i !== index}
            >
              {/* decoration */}
              <span aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
              <span aria-hidden className="absolute -bottom-32 right-40 size-72 rounded-full bg-white/5" />
              <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.12)_1px,transparent_0)] [background-size:22px_22px]" />
              <span
                aria-hidden
                className="absolute right-8 top-[44%] hidden size-28 -translate-y-1/2 items-center justify-center rounded-[1.75rem] border border-white/25 bg-white/15 shadow-2xl backdrop-blur-md sm:flex lg:right-12 lg:size-32"
              >
                <Icon className="size-14 text-white drop-shadow-lg lg:size-16" strokeWidth={1.5} />
              </span>

              <div className="relative z-10 max-w-md space-y-2 text-white">
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">{b.title}</h2>
                <p className="text-sm text-white/85">{b.subtitle}</p>
                <Link
                  href={b.href}
                  tabIndex={i === index ? 0 : -1}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-foreground shadow-lg transition hover:gap-3 hover:shadow-xl"
                >
                  {b.cta} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-5 bottom-3 flex items-center justify-between sm:inset-x-9 sm:bottom-3.5">
          <div className="flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-7 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80")}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
          <div className="hidden gap-2 sm:flex">
            <button onClick={() => go(index - 1)} className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35" aria-label="Previous slide">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => go(index + 1)} className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35" aria-label="Next slide">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Media } from "@/components/common/media";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name, video }: { images: string[]; name: string; video: string | null }) {
  const [active, setActive] = useState(0);
  return (
    <div className="space-y-3">
      <Media src={images[active] ?? "ph://package/0"} alt={`${name} – image ${active + 1}`} className="aspect-square w-full rounded-xl border border-border" sizes="(max-width: 1024px) 100vw, 480px" priority />
      <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist" aria-label="Product images">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            role="tab"
            aria-selected={i === active}
            aria-label={`Show image ${i + 1}`}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            className={cn("shrink-0 overflow-hidden rounded-lg border-2", i === active ? "border-primary" : "border-transparent")}
          >
            <Media src={src} alt="" className="size-16" iconClassName="size-6" />
          </button>
        ))}
        {video && (
          <a href={video} target="_blank" rel="noreferrer" className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-muted text-[10px] text-muted-foreground hover:text-primary">
            <PlayCircle className="size-6" aria-hidden /> Video
          </a>
        )}
      </div>
    </div>
  );
}

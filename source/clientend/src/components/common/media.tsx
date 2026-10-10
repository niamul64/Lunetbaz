import Image from "next/image";
import {
  BadgeCheck,
  Baby,
  BatteryCharging,
  BookOpen,
  Camera,
  CookingPot,
  Cpu,
  Droplet,
  Dumbbell,
  Footprints,
  Headphones,
  Heart,
  Lamp,
  Laptop,
  Package,
  Palette,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Snowflake,
  Sofa,
  Sparkles,
  Sun,
  Watch,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders product/shop media. Dummy data uses `ph://<icon>/<hue>` placeholders
 * so the demo works offline; real URLs from the backend go through next/image.
 */
export const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  watch: Watch,
  shirt: Shirt,
  sparkles: Sparkles,
  footprints: Footprints,
  heart: Heart,
  droplet: Droplet,
  palette: Palette,
  sofa: Sofa,
  "cooking-pot": CookingPot,
  lamp: Lamp,
  "shopping-basket": ShoppingBasket,
  dumbbell: Dumbbell,
  baby: Baby,
  "book-open": BookOpen,
  cpu: Cpu,
  camera: Camera,
  "battery-charging": BatteryCharging,
  package: Package,
  zap: Zap,
  sun: Sun,
  snowflake: Snowflake,
  "badge-check": BadgeCheck,
};

export function parsePlaceholder(src: string) {
  if (!src.startsWith("ph://")) return null;
  const [icon = "package", hue = "220"] = src.slice(5).split("/");
  return { Icon: ICONS[icon] ?? Package, hue: Number(hue) || 0 };
}

interface MediaProps {
  src: string;
  alt: string;
  className?: string;
  /** Size hint for next/image. */
  sizes?: string;
  priority?: boolean;
  /** Legacy sizing hint; placeholders now scale with their container. */
  iconClassName?: string;
}

export function Media({ src, alt, className, sizes = "(max-width: 768px) 50vw, 240px", priority }: MediaProps) {
  const ph = parsePlaceholder(src);
  if (ph) {
    const { Icon, hue } = ph;
    // "Studio shot" look: soft backdrop, a glossy product tile and a floor shadow.
    // Everything is sized in % so it works from 40px thumbnails to the gallery.
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("relative flex items-center justify-center overflow-hidden", className)}
        style={{ background: `radial-gradient(120% 90% at 50% 15%, oklch(0.995 0.005 ${hue}) 0%, oklch(0.955 0.025 ${hue}) 55%, oklch(0.9 0.045 ${hue}) 100%)` }}
      >
        <span aria-hidden className="absolute bottom-[17%] left-1/2 h-[7%] w-[44%] -translate-x-1/2 rounded-[50%] bg-black/15 blur-[6px]" />
        <span
          aria-hidden
          className="relative flex aspect-square w-[50%] items-center justify-center rounded-[24%] shadow-[0_10px_25px_-8px_rgb(0_0_0/0.35)]"
          style={{ background: `linear-gradient(150deg, oklch(0.78 0.13 ${hue}) 0%, oklch(0.6 0.17 ${hue}) 55%, oklch(0.48 0.16 ${(hue + 20) % 360}) 100%)` }}
        >
          <span className="absolute inset-0 rounded-[24%] bg-gradient-to-b from-white/25 via-white/0 to-transparent" />
          <Icon className="relative size-[52%] text-white drop-shadow-sm" strokeWidth={1.7} />
        </span>
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {/* SVGs are already resolution-independent; the optimizer only handles raster formats. */}
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.endsWith(".svg")} className="object-cover" />
    </div>
  );
}

export function CategoryIcon({ icon, hue, className }: { icon: string; hue: number; className?: string }) {
  const Icon = ICONS[icon] ?? Package;
  return (
    <span className={cn("flex items-center justify-center rounded-full", className)} style={{ background: `oklch(0.95 0.04 ${hue})`, color: `oklch(0.45 0.14 ${hue})` }}>
      <Icon className="size-1/2" strokeWidth={1.6} aria-hidden />
    </span>
  );
}

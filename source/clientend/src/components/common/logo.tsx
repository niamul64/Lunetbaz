import Link from "next/link";
import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", suffix, className, inverted }: { href?: string; suffix?: string; className?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)} aria-label={`Lunetbuz${suffix ? ` ${suffix}` : ""} home`}>
      <span className={cn("flex size-8 items-center justify-center rounded-lg", inverted ? "bg-white text-primary" : "bg-primary text-primary-foreground")}>
        <Moon className="size-4.5" fill="currentColor" aria-hidden />
      </span>
      <span className="text-lg leading-none">
        Lunet<span className={inverted ? "text-white/80" : "text-primary"}>buz</span>
        {suffix && <span className={cn("ml-1.5 text-sm font-medium", inverted ? "text-white/70" : "text-muted-foreground")}>{suffix}</span>}
      </span>
    </Link>
  );
}

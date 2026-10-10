import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const taka = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ৳1,23,456 – Bangladeshi digit grouping. */
export function formatPrice(amount: number) {
  return `৳${taka.format(Math.round(amount))}`;
}

export function formatNumber(value: number) {
  return taka.format(value);
}

/** 12.4K, 1.2M – for counters like "sold" and followers. */
export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

export function formatDate(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null | undefined) {
  return iso ? dateTimeFmt.format(new Date(iso)) : "—";
}

export function discountPct(price: number, finalPrice: number) {
  if (!price || finalPrice >= price) return 0;
  return Math.round(((price - finalPrice) / price) * 100);
}

/** "pending_review" → "Pending review" */
export function humanize(value: string) {
  const s = value.replace(/[_.-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function variantLabel(attributes: Record<string, string>) {
  return Object.values(attributes).join(" / ");
}

/** Build a query string, dropping empty values. */
export function toQueryString(params: Record<string, unknown> | undefined) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)));
    else search.set(key, value === true ? "1" : String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

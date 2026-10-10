import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { formatDate, humanize } from "@/lib/utils";
import type { Campaign } from "@/types";

export const CAMPAIGN_TYPE_LABEL: Record<Campaign["type"], string> = {
  mega: "Mega sale",
  festival: "Festival",
  flash: "Flash sale",
  category_day: "Category day",
  brand_day: "Brand day",
  clearance: "Clearance",
  special: "Special",
};

export function CampaignBanner({ campaign, children }: { campaign: Campaign; children?: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 p-5 text-white"
      style={{ background: `linear-gradient(120deg, oklch(0.42 0.17 ${campaign.hue}), oklch(0.64 0.18 ${(campaign.hue + 40) % 360}))` }}
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-white/75">{CAMPAIGN_TYPE_LABEL[campaign.type]}</p>
        <h2 className="text-xl font-bold">{campaign.name}</h2>
        <p className="text-sm text-white/85">{campaign.tagline}</p>
      </div>
      {children}
    </div>
  );
}

export function CampaignRules({ campaign, categoryNames }: { campaign: Campaign; categoryNames?: string[] }) {
  const r = campaign.rules;
  const items = [
    { label: "Registration", value: `${formatDate(campaign.registrationStart)} – ${formatDate(campaign.registrationEnd)}` },
    { label: "Campaign live", value: `${formatDate(campaign.startAt)} – ${formatDate(campaign.endAt)}` },
    { label: "Minimum discount", value: `${r.minDiscountPct}% below 30-day lowest price` },
    { label: "Minimum campaign stock", value: `${r.minStock} units per item` },
    { label: "Max products per shop", value: String(r.maxProductsPerShop) },
    { label: "Minimum shop rating", value: `${r.minShopRating.toFixed(1)}★` },
    { label: "Categories", value: r.categoryIds.length ? (categoryNames?.join(", ") ?? `${r.categoryIds.length} categories`) : "All categories" },
    { label: "Extra commission", value: `${campaign.extraCommissionPct}%` },
    { label: "Voucher funding", value: humanize(campaign.voucherFundedBy) },
  ];
  return (
    <div className="space-y-3">
      {r.verifiedOnly && (
        <p className="inline-flex items-center gap-1.5 rounded-md bg-verified-soft px-3 py-1.5 text-sm font-medium text-[oklch(0.4_0.11_160)]">
          <BadgeCheck className="size-4" aria-hidden /> Only Lunetbuz Verified products can join
        </p>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-xs text-muted-foreground">{i.label}</dt>
            <dd className="font-medium">{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

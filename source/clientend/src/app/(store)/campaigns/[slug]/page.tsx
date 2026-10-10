import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Countdown } from "@/components/common/countdown";
import { StatusBadge } from "@/components/common/status";
import { ProductGridSkeleton } from "@/components/store/product-card";
import { ProductListing } from "@/components/store/product-listing";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { formatDate } from "@/lib/utils";
import { getCampaign } from "@/server/catalog";

export async function generateStaticParams() {
  return [{ slug: "durga-puja-fest-2026" }];
}

export async function generateMetadata({ params }: PageProps<"/campaigns/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCampaign(slug);
  return c ? { title: c.name, description: c.tagline } : { title: "Campaign not found" };
}

export default function CampaignPage(props: PageProps<"/campaigns/[slug]">) {
  return (
    <div className="container-page py-4">
      <Suspense fallback={<><Skeleton className="mb-6 h-44 w-full rounded-2xl" /><ProductGridSkeleton /></>}>
        <CampaignContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function CampaignContent({ params }: Pick<PageProps<"/campaigns/[slug]">, "params">) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();
  const live = campaign.status === "live";

  return (
    <>
      <section
        className="mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl px-6 py-8 text-white sm:flex-row sm:items-end sm:justify-between sm:px-10"
        style={{ background: `linear-gradient(120deg, oklch(0.42 0.17 ${campaign.hue}), oklch(0.64 0.18 ${(campaign.hue + 40) % 360}))` }}
      >
        <div className="max-w-xl space-y-2">
          <StatusBadge status={campaign.status} className="bg-white/20 text-white" />
          <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-white/85">{campaign.description}</p>
          {campaign.rules.verifiedOnly && (
            <p className="inline-flex items-center gap-1 text-sm font-medium">
              <BadgeCheck className="size-4" aria-hidden /> Only Lunetbuz Verified products
            </p>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-white/80">{live ? "Ends in" : "Starts in"}</p>
          <Countdown to={live ? campaign.endAt : campaign.startAt} className="text-base [&>span]:bg-white/25 [&>span]:text-white" />
          <p className="text-xs text-white/70">
            {formatDate(campaign.startAt)} – {formatDate(campaign.endAt)}
          </p>
        </div>
      </section>
      {live ? (
        <ProductListing scope={{ campaign: campaign.slug }} />
      ) : (
        <EmptyState
          title={campaign.status === "ended" || campaign.status === "settled" ? "This campaign has ended" : "Deals unlock when the campaign goes live"}
          description={`Come back on ${formatDate(campaign.startAt)}. Sellers are preparing their best prices.`}
        />
      )}
    </>
  );
}

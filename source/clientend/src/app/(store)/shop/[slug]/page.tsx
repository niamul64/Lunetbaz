import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Star, Users } from "lucide-react";
import { Media } from "@/components/common/media";
import { ProductGridSkeleton } from "@/components/store/product-card";
import { ProductListing } from "@/components/store/product-listing";
import { Skeleton } from "@/components/ui/display";
import { formatCompact, formatDate } from "@/lib/utils";
import { getShop } from "@/server/catalog";

export async function generateStaticParams() {
  return [{ slug: "techhaat" }];
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop(slug);
  return shop ? { title: `${shop.name} – Official store`, description: shop.description } : { title: "Shop not found" };
}

export default function ShopPage(props: PageProps<"/shop/[slug]">) {
  return (
    <div className="container-page py-4">
      <Suspense fallback={<><Skeleton className="mb-6 h-40 w-full rounded-2xl" /><ProductGridSkeleton /></>}>
        <ShopContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ShopContent({ params }: Pick<PageProps<"/shop/[slug]">, "params">) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) notFound();

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
        <Media src={shop.banner} alt="" className="h-28 w-full sm:h-36" />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <Media src={shop.logo} alt={`${shop.name} logo`} className="-mt-10 size-20 rounded-2xl border-4 border-card" iconClassName="size-8" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{shop.name}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{shop.description}</p>
          </div>
          <dl className="flex flex-wrap gap-5 text-sm">
            <Stat icon={Star} label="Rating" value={`${shop.rating.toFixed(1)} (${shop.positiveRatingPct}% positive)`} />
            <Stat icon={Users} label="Followers" value={formatCompact(shop.followers)} />
            <Stat icon={BadgeCheck} label="Verified products" value={String(shop.verifiedProductCount)} />
            <Stat icon={MapPin} label="Location" value={`${shop.location.area}, ${shop.location.district}`} />
          </dl>
        </div>
        <p className="border-t border-border px-5 py-2 text-xs text-muted-foreground">On Lunetbuz since {formatDate(shop.joinedAt)}</p>
      </section>
      <ProductListing scope={{ shop: shop.slug }} title={shop.name} />
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

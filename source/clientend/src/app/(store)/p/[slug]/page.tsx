import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Store } from "lucide-react";
import { Rating } from "@/components/common/commerce";
import { Media } from "@/components/common/media";
import { VerifiedBadge } from "@/components/common/status";
import { ProductReviews, ProductQuestions } from "@/components/store/product-feedback";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductCard } from "@/components/store/product-card";
import { Rail } from "@/components/store/rail";
import { SectionHeader } from "@/components/store/section";
import { ProductPurchase } from "@/components/store/product-purchase";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { formatCompact } from "@/lib/utils";
import { getPopularProductSlugs, getProduct } from "@/server/catalog";

export async function generateStaticParams() {
  const slugs = await getPopularProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: { title: product.name, description: product.description.slice(0, 160), type: "website" },
  };
}

export default function ProductPage(props: PageProps<"/p/[slug]">) {
  return (
    <div className="container-page py-4">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/p/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const { shop } = product;
  const lowest = Math.min(...product.variants.map((v) => v.salePrice ?? v.price));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description,
    sku: product.variants[0]?.sku,
    aggregateRating: product.reviewCount ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } : undefined,
    offers: { "@type": "AggregateOffer", priceCurrency: "BDT", lowPrice: lowest, offerCount: product.variants.length, availability: product.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        {product.categoryPath.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            <Link href={`/c/${c.slug}`} className="hover:text-primary">
              {c.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr_16rem]">
        <ProductGallery images={product.images} name={product.name} video={product.video} />

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            {product.verification.status === "verified" && <VerifiedBadge size="md" />}
            <h1 className="text-xl font-semibold leading-snug sm:text-2xl">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {product.reviewCount > 0 && (
                <a href="#reviews" className="hover:text-primary">
                  <Rating value={product.rating} count={product.reviewCount} />
                </a>
              )}
              <span>{formatCompact(product.soldCount)} sold</span>
              <span>
                Brand: <span className="text-foreground">{product.brand}</span>
              </span>
            </div>
          </div>
          <ProductPurchase product={product} />
        </div>

        <aside className="space-y-4" aria-label="Seller">
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Media src={shop.logo} alt="" className="size-12 rounded-full" iconClassName="size-6" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Sold by</p>
                <p className="truncate font-semibold">{shop.name}</p>
                {shop.tier === "mall" && <span className="text-xs font-medium text-primary">LunetMall</span>}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Positive ratings", value: `${shop.positiveRatingPct}%` },
                { label: "Ship on time", value: `${shop.shipOnTimePct}%` },
                { label: "Response rate", value: `${shop.responseRatePct}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-md bg-muted p-2">
                  <dd className="font-semibold">{s.value}</dd>
                  <dt className="text-[10px] leading-tight text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden /> Ships from {shop.location.district}
            </p>
            {shop.verifiedProductCount > 0 && <p className="text-xs font-medium text-verified">{shop.verifiedProductCount} Lunetbuz Verified products</p>}
            <Button asChild variant="outline" className="w-full">
              <Link href={`/shop/${shop.slug}`}>
                <Store /> Visit store
              </Link>
            </Button>
          </Card>
        </aside>
      </div>

      <Card className="mt-6">
        <Tabs defaultValue="details">
          <TabsList className="px-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="reviews" id="reviews">
              Reviews ({product.reviewCount})
            </TabsTrigger>
            <TabsTrigger value="qa">Questions</TabsTrigger>
          </TabsList>
          <div className="px-5 pb-5">
            <TabsContent value="details" className="space-y-4">
              <ul className="list-inside list-disc space-y-1 text-sm">
                {product.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </TabsContent>
            <TabsContent value="specs">
              <dl className="divide-y divide-border rounded-lg border border-border text-sm">
                {product.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-3 gap-4 px-4 py-2.5">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="col-span-2">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>
            <TabsContent value="reviews">
              <ProductReviews productId={product.id} />
            </TabsContent>
            <TabsContent value="qa">
              <ProductQuestions productId={product.id} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {product.related.length > 0 && (
        <section className="mt-6" aria-labelledby="related-heading">
          <SectionHeader id="related-heading" title="You may also like" href={`/c/${product.categoryPath.at(-1)?.slug ?? ""}`} hrefLabel="More in this category" />
          <Rail label="Related products">
            {product.related.map((p) => (
              <ProductCard key={p.id} product={p} className="w-[38vw] max-w-40 shrink-0 sm:w-40" />
            ))}
          </Rail>
        </section>
      )}
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr_16rem]">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-60 w-full" />
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/common/media";
import { ProductGridSkeleton } from "@/components/store/product-card";
import { ProductListing } from "@/components/store/product-listing";
import { Skeleton } from "@/components/ui/display";
import { getCategories } from "@/server/catalog";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.filter((c) => !c.parentId).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  return category ? { title: `${category.name} – Buy online in Bangladesh`, description: `Shop ${category.name} from trusted sellers with Cash on Delivery.` } : {};
}

export default function CategoryPage(props: PageProps<"/c/[slug]">) {
  return (
    <div className="container-page py-4">
      <Suspense
        fallback={
          <>
            <Skeleton className="mb-6 h-20 w-full" />
            <ProductGridSkeleton />
          </>
        }
      >
        <CategoryContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/c/[slug]">, "params">) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  const parent = categories.find((c) => c.id === category.parentId);
  const children = categories.filter((c) => c.parentId === category.id);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        {parent && (
          <>
            <Link href={`/c/${parent.slug}`} className="hover:text-primary">
              {parent.name}
            </Link>
            <ChevronRight className="size-3" aria-hidden />
          </>
        )}
        <span className="text-foreground">{category.name}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <CategoryIcon icon={category.icon} hue={category.hue} className="size-14" />
        <div>
          <h1 className="text-2xl font-semibold">{category.name}</h1>
          <p className="text-sm text-muted-foreground" lang="bn">
            {category.nameBn}
          </p>
        </div>
        {children.length > 0 && (
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            {children.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>
      <ProductListing scope={{ category: category.slug }} />
    </>
  );
}

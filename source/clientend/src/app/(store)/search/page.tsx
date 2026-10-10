import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductGridSkeleton } from "@/components/store/product-card";
import { ProductListing } from "@/components/store/product-listing";

export const metadata: Metadata = { title: "Search products" };

export default function SearchPage() {
  return (
    <div className="container-page py-4">
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductListing />
      </Suspense>
    </div>
  );
}

"use client";

import { RequireSession } from "@/components/common/guards";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { ProductGrid, ProductGridSkeleton } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { accountQueries } from "@/services/account.service";

function WishlistPageContent() {
  const { data, isLoading } = useQuery(accountQueries.wishlist());
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Wishlist</h1>
      {isLoading ? (
        <ProductGridSkeleton count={4} className="lg:grid-cols-4 xl:grid-cols-4" />
      ) : !data?.length ? (
        <EmptyState icon={Heart} title="Your wishlist is empty" description="Tap the heart on any product to save it for later." action={<Button asChild><Link href="/">Discover products</Link></Button>} />
      ) : (
        <ProductGrid products={data} className="lg:grid-cols-4 xl:grid-cols-4" />
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <RequireSession portal="store">
      <WishlistPageContent />
    </RequireSession>
  );
}

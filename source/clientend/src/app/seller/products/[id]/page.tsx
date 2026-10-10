"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Can, RequirePermission } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { ProductEditor } from "@/components/seller/product-editor";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { sellerQueries, sellerService } from "@/services/seller.service";

export default function EditProductPage() {
  return (
    <RequirePermission permission={P.sellerProductsView}>
      <EditProduct />
    </RequirePermission>
  );
}

function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: product, isLoading, error } = useQuery(sellerQueries.product(id));
  const toggle = useMutation({
    mutationFn: (status: "active" | "inactive") => sellerService.setProductStatus(id, status),
    onSuccess: (p) => {
      qc.setQueryData(sellerQueries.product(id).queryKey, p);
      void qc.invalidateQueries({ queryKey: ["seller", "products"] });
      toast.success(p.status === "active" ? "Product is live again" : "Product hidden from the store");
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !product) return <ErrorState message={errorMessage(error, "Product not found.")} />;

  return (
    <>
      <PageHeader
        back={{ href: "/seller/products", label: "Products" }}
        title={product.name}
        actions={
          <>
            {product.status === "active" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/p/${product.slug}`} target="_blank">
                  <ExternalLink /> View in store
                </Link>
              </Button>
            )}
            <Can permission={P.sellerProductsManage}>
              {product.status === "active" && (
                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm">Deactivate</Button>}
                  title="Hide this product from the store?"
                  confirmLabel="Deactivate"
                  onConfirm={() => toggle.mutateAsync("inactive")}
                />
              )}
              {product.status === "inactive" && (
                <Button size="sm" onClick={() => toggle.mutate("active")} loading={toggle.isPending}>
                  Activate
                </Button>
              )}
            </Can>
          </>
        }
      />
      <ProductEditor key={product.updatedAt} product={product} />
    </>
  );
}

"use client";

import { RequirePermission } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { ProductEditor } from "@/components/seller/product-editor";
import { P } from "@/lib/auth/permissions";

export default function NewProductPage() {
  return (
    <RequirePermission permission={P.sellerProductsManage}>
      <PageHeader back={{ href: "/seller/products", label: "Products" }} title="Add product" description="New products are checked by our quality team before going live." />
      <ProductEditor />
    </RequirePermission>
  );
}

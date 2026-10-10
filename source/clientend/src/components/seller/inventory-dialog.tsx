"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TBody, THead, Td, Th } from "@/components/ui/display";
import { isApiError } from "@/lib/api/errors";
import { variantLabel } from "@/lib/utils";
import { sellerService } from "@/services/seller.service";
import type { Product } from "@/types";

type Row = { price: string; salePrice: string; stock: string };

/**
 * Price & stock editor. Always available — including on Verified products,
 * whose content is otherwise locked (proposal §4.6).
 */
export function InventoryDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(product.variants.map((v) => [v.id, { price: String(v.price), salePrice: v.salePrice == null ? "" : String(v.salePrice), stock: String(v.stock) }])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async () => {
      const changed = product.variants.filter((v) => {
        const r = rows[v.id]!;
        return r.price !== String(v.price) || r.salePrice !== (v.salePrice == null ? "" : String(v.salePrice)) || r.stock !== String(v.stock);
      });
      for (const v of changed) {
        const r = rows[v.id]!;
        try {
          await sellerService.updateInventory(product.id, v.id, { price: Number(r.price), salePrice: r.salePrice === "" ? null : Number(r.salePrice), stock: Number(r.stock) });
        } catch (e) {
          if (isApiError(e)) {
            const fe = (e.details as { fieldErrors?: Record<string, string> })?.fieldErrors;
            setErrors((x) => ({ ...x, [v.id]: fe ? Object.values(fe).join(" ") : e.message }));
          }
          throw e;
        }
      }
      return changed.length;
    },
    meta: { inlineValidation: true },
    onSuccess: (n) => {
      toast.success(n ? `Updated ${n} variant(s)` : "No changes");
      void qc.invalidateQueries({ queryKey: ["seller"] });
      onOpenChange(false);
    },
  });

  const update = (id: string, key: keyof Row, value: string) => {
    setErrors((e) => ({ ...e, [id]: "" }));
    setRows((r) => ({ ...r, [id]: { ...r[id]!, [key]: value.replace(/[^\d]/g, "") } }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Price & stock"
        description={product.name}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Save
            </Button>
          </>
        }
      >
        <Table>
          <THead>
            <tr>
              <Th>Variant</Th>
              <Th>Price (৳)</Th>
              <Th>Sale price (৳)</Th>
              <Th>Stock</Th>
            </tr>
          </THead>
          <TBody>
            {product.variants.map((v) => (
              <tr key={v.id} className="align-top">
                <Td>
                  <p className="font-medium">{variantLabel(v.attributes)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{v.sku}</p>
                  {errors[v.id] && <p className="mt-1 text-xs text-danger">{errors[v.id]}</p>}
                </Td>
                <Td>
                  <Input inputMode="numeric" value={rows[v.id]!.price} onChange={(e) => update(v.id, "price", e.target.value)} className="h-9 w-28" aria-label="Price" />
                </Td>
                <Td>
                  <Input inputMode="numeric" value={rows[v.id]!.salePrice} onChange={(e) => update(v.id, "salePrice", e.target.value)} placeholder="—" className="h-9 w-28" aria-label="Sale price" />
                </Td>
                <Td>
                  <Input inputMode="numeric" value={rows[v.id]!.stock} onChange={(e) => update(v.id, "stock", e.target.value)} className="h-9 w-20" aria-label="Stock" />
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { sellerService } from "@/services/seller.service";
import type { Product } from "@/types";

/**
 * Proposes new content for a Verified product. The live, verified listing stays
 * unchanged until a verification officer approves the change.
 */
export function ChangeRequestDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [highlights, setHighlights] = useState(product.highlights.join("\n"));
  const [reason, setReason] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      sellerService.requestChange(product.id, {
        reason,
        proposed: { name, description, highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean) },
      }),
    onSuccess: () => {
      toast.success("Change request submitted for re-verification");
      void qc.invalidateQueries({ queryKey: ["seller", "verification"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Request a content change"
        description="A verification officer will review the change. Your current listing stays live and unchanged until it's approved."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="verified" onClick={() => submit.mutate()} loading={submit.isPending} disabled={reason.trim().length < 10}>
              Submit for review
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert tone="info">To change photos or video, bring the item for re-inspection. Officers will capture new verified media.</Alert>
          <Field label="Product name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Highlights" hint="One per line">
            <Textarea rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} />
          </Field>
          <Field label="Why is this change needed?" required hint="At least 10 characters">
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { RequireSession } from "@/components/common/guards";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AddressForm } from "@/components/store/address-form";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { accountQueries, accountService, type AddressInput } from "@/services/account.service";
import type { Address } from "@/types";

function AddressesPageContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(accountQueries.addresses());
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: accountQueries.addresses().queryKey });

  const save = useMutation({
    mutationFn: (v: AddressInput) => (editing && editing !== "new" ? accountService.updateAddress(editing.id, v) : accountService.createAddress(v)),
    onSuccess: () => {
      toast.success("Address saved");
      setEditing(null);
      void invalidate();
    },
  });
  const remove = useMutation({ mutationFn: accountService.deleteAddress, onSuccess: () => void invalidate() });
  const makeDefault = useMutation({ mutationFn: (id: string) => accountService.updateAddress(id, { isDefault: true }), onSuccess: () => void invalidate() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Address book</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Add address
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data?.length ? (
        <EmptyState icon={MapPin} title="No saved addresses" description="Save addresses to check out faster." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-4 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-medium">{a.name}</p>
                <Badge>{a.label}</Badge>
                {a.isDefault && <Badge tone="primary">Default</Badge>}
              </div>
              <p className="text-muted-foreground">
                {a.line}, {a.area}, {a.district}, {a.division}
                <br />
                {a.phone}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
                  <Pencil /> Edit
                </Button>
                {!a.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => makeDefault.mutate(a.id)}>
                    Set as default
                  </Button>
                )}
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-danger">
                      <Trash2 /> Delete
                    </Button>
                  }
                  title="Delete this address?"
                  confirmLabel="Delete"
                  variant="destructive"
                  onConfirm={() => remove.mutateAsync(a.id)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Add address" : "Edit address"} size="lg">
          {editing !== null && <AddressForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} onSubmit={(v) => save.mutate(v)} submitting={save.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AddressesPage() {
  return (
    <RequireSession portal="store">
      <AddressesPageContent />
    </RequireSession>
  );
}

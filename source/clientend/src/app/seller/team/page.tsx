"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission, usePermissions } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Avatar, Card, CardBody } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { sellerQueries, sellerService, type TeamInviteInput } from "@/services/seller.service";
import type { SessionUser } from "@/types";

const ROLE_HELP = {
  shop_manager: "Products, orders, campaigns and verification. No team, finance or settings.",
  shop_staff: "Pack orders and update price & stock only.",
};

export default function SellerTeamPage() {
  return (
    <RequirePermission permission={P.sellerTeamManage}>
      <Team />
    </RequirePermission>
  );
}

function Team() {
  const qc = useQueryClient();
  const { user: me } = usePermissions();
  const { data, isLoading, error, refetch } = useQuery(sellerQueries.team());
  const [inviteOpen, setInviteOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: sellerQueries.team().queryKey });

  const updateRole = useMutation({ mutationFn: ({ id, role }: { id: string; role: string }) => sellerService.updateMember(id, { role }), onSuccess: () => (toast.success("Role updated"), invalidate()) });
  const remove = useMutation({ mutationFn: sellerService.removeMember, onSuccess: () => (toast.success("Member removed"), invalidate()) });

  const columns: Column<SessionUser>[] = [
    {
      key: "member",
      header: "Member",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} />
          <div>
            <p className="font-medium">
              {u.name} {u.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {u.email} · {u.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (u) =>
        u.role === "shop_admin" ? (
          <span className="font-medium">{u.roleLabel}</span>
        ) : (
          <NativeSelect value={u.role} onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })} className="h-8 w-40 text-xs" aria-label={`Role of ${u.name}`}>
            <option value="shop_manager">Shop Manager</option>
            <option value="shop_staff">Shop Staff</option>
          </NativeSelect>
        ),
    },
    { key: "status", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (u) =>
        u.role !== "shop_admin" && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-danger">
                Remove
              </Button>
            }
            title={`Remove ${u.name}?`}
            description="They will immediately lose access to your Seller Center."
            confirmLabel="Remove"
            variant="destructive"
            onConfirm={() => remove.mutateAsync(u.id)}
          />
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Team"
        description="Give your staff their own logins with only the access they need."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite member
          </Button>
        }
      />
      <Card className="mb-4">
        <CardBody className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium">Shop Admin</p>
            <p className="text-muted-foreground">Full control including team, finance and settings.</p>
          </div>
          <div>
            <p className="font-medium">Shop Manager</p>
            <p className="text-muted-foreground">{ROLE_HELP.shop_manager}</p>
          </div>
          <div>
            <p className="font-medium">Shop Staff</p>
            <p className="text-muted-foreground">{ROLE_HELP.shop_staff}</p>
          </div>
        </CardBody>
      </Card>
      <Card>
        <DataTable columns={columns} rows={data} rowKey={(u) => u.id} loading={isLoading} error={error} onRetry={() => refetch()} />
      </Card>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={invalidate} />
    </>
  );
}

const inviteSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.email("Enter a valid email"),
  phone: z.string().regex(/^01[3-9]\d{8}$/, "Enter a valid mobile number"),
  role: z.enum(["shop_manager", "shop_staff"]),
});

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const form = useForm<TeamInviteInput>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", phone: "", role: "shop_staff" } });
  const invite = useMutation({
    mutationFn: sellerService.inviteMember,
    meta: { inlineValidation: true },
    onSuccess: (u) => {
      toast.success(`Invitation sent to ${u.email}`);
      form.reset();
      onOpenChange(false);
      onDone();
    },
    onError: (e) => {
      const fe = isApiError(e) ? (e.details as { fieldErrors?: Record<string, string> })?.fieldErrors : null;
      if (fe) for (const [k, m] of Object.entries(fe)) form.setError(k as keyof TeamInviteInput, { message: m });
    },
  });
  const e = form.formState.errors;
  const role = useWatch({ control: form.control, name: "role" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Invite a team member" description="They'll receive an SMS and email to set their password.">
        <form onSubmit={form.handleSubmit((v) => invite.mutate(v))} className="space-y-4" noValidate>
          <Field label="Full name" error={e.name?.message} required>
            <Input {...form.register("name")} />
          </Field>
          <Field label="Email" error={e.email?.message} required>
            <Input type="email" {...form.register("email")} />
          </Field>
          <Field label="Mobile number" error={e.phone?.message} required>
            <Input inputMode="tel" placeholder="01XXXXXXXXX" {...form.register("phone")} />
          </Field>
          <Field label="Role" hint={ROLE_HELP[role]} required>
            <NativeSelect {...form.register("role")}>
              <option value="shop_manager">Shop Manager</option>
              <option value="shop_staff">Shop Staff</option>
            </NativeSelect>
          </Field>
          <Button type="submit" loading={invite.isPending} className="w-full">
            Send invitation
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

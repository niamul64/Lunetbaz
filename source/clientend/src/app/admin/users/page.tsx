"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/common/data-table";
import { Can, RequirePermission, usePermissions } from "@/components/common/guards";
import { FilterPills, PageHeader, SearchInput } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Avatar, Card } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { useUrlState } from "@/hooks/use-url-state";
import { isApiError } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { adminQueries, adminService, type RoleWithCount } from "@/services/admin.service";
import type { SessionUser } from "@/types";

const PORTALS = [
  { value: "", label: "Everyone" },
  { value: "admin", label: "Lunetbuz staff" },
  { value: "seller", label: "Shop teams" },
  { value: "store", label: "Customers" },
];

export default function AdminUsersPage() {
  return (
    <RequirePermission permission={P.usersView}>
      <Users />
    </RequirePermission>
  );
}

function Users() {
  const qc = useQueryClient();
  const { user: me, can } = usePermissions();
  const { values, set, page } = useUrlState(["portal", "q", "role"] as const);
  const query = useQuery({ ...adminQueries.users({ portal: values.portal, q: values.q, role: values.role, page }), placeholderData: keepPreviousData });
  const roles = useQuery({ ...adminQueries.roles(), enabled: can(P.rolesView) || can(P.usersManage) });
  const [inviteOpen, setInviteOpen] = useState(false);
  const myLevel = roles.data?.find((r) => r.key === me?.role)?.level ?? 0;
  const assignable = (roles.data ?? []).filter((r) => r.portal === "admin" && (me?.role === "super_admin" || r.level < myLevel));

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { role?: string; status?: string } }) => adminService.updateUser(id, input),
    onSuccess: () => {
      toast.success("User updated");
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const columns: Column<SessionUser>[] = [
    {
      key: "user",
      header: "User",
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
        can(P.usersManage) && u.portal === "admin" && u.id !== me?.id && assignable.some((r) => r.key === u.role) ? (
          <NativeSelect value={u.role} onChange={(e) => update.mutate({ id: u.id, input: { role: e.target.value } })} className="h-8 w-48 text-xs" aria-label={`Role of ${u.name}`}>
            {assignable.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <span>
            {u.roleLabel}
            {u.shop && <span className="block text-xs text-muted-foreground">{u.shop.name}</span>}
          </span>
        ),
    },
    { key: "joined", header: "Joined", hideOnMobile: true, cell: (u) => formatDate(u.createdAt) },
    { key: "status", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (u) =>
        u.id !== me?.id &&
        u.role !== "super_admin" && (
          <Can permission={P.usersManage}>
            {u.status === "active" ? (
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => update.mutate({ id: u.id, input: { status: "suspended" } })}>
                Suspend
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: u.id, input: { status: "active" } })}>
                Activate
              </Button>
            )}
          </Can>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users & staff"
        description="Everyone with a Lunetbuz account. Invite staff and assign roles below your own level."
        actions={
          <Can permission={P.usersManage}>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus /> Invite staff
            </Button>
          </Can>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <FilterPills options={PORTALS} value={values.portal ?? ""} onChange={(v) => set({ portal: v, role: null })} />
          <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Name, email or phone" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(u) => u.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
        />
      </Card>
      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={assignable} />
    </>
  );
}

function InviteStaffDialog({ open, onOpenChange, roles }: { open: boolean; onOpenChange: (o: boolean) => void; roles: RoleWithCount[] }) {
  const qc = useQueryClient();
  const form = useForm({ defaultValues: { name: "", email: "", phone: "", role: "" } });
  const invite = useMutation({
    mutationFn: adminService.inviteUser,
    meta: { inlineValidation: true },
    onSuccess: (u) => {
      toast.success(`Invitation sent to ${u.email}`);
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e) => {
      const fe = isApiError(e) ? (e.details as { fieldErrors?: Record<string, string> })?.fieldErrors : null;
      if (fe) for (const [k, m] of Object.entries(fe)) form.setError(k as "email", { message: m });
    },
  });
  const roleKey = useWatch({ control: form.control, name: "role" });
  const role = roles.find((r) => r.key === roleKey);
  const e = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Invite a staff member" description="They receive an email to set their password. Their access depends on the role.">
        <form onSubmit={form.handleSubmit((v) => invite.mutate(v))} className="space-y-4">
          <Field label="Full name" required error={e.name && "Required"}>
            <Input {...form.register("name", { required: true })} />
          </Field>
          <Field label="Work email" required error={e.email?.message ?? (e.email && "Required")}>
            <Input type="email" {...form.register("email", { required: true })} />
          </Field>
          <Field label="Mobile" required error={e.phone?.message ?? (e.phone && "Required")}>
            <Input inputMode="tel" {...form.register("phone", { required: true })} />
          </Field>
          <Field label="Role" required hint={role ? role.description : "You can only assign roles below your own level."} error={e.role?.message ?? (e.role && "Required")}>
            <NativeSelect {...form.register("role", { required: true })}>
              <option value="">Choose a role</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="submit" className="w-full" loading={invite.isPending}>
            Send invitation
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Lock, Minus } from "lucide-react";
import { RequirePermission, usePermissions } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, CardHeader, Skeleton } from "@/components/ui/display";
import { Checkbox } from "@/components/ui/primitives";
import { P, PERMISSION_GROUPS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { adminQueries, adminService, type RoleWithCount } from "@/services/admin.service";

export default function AdminRolesPage() {
  return (
    <RequirePermission permission={P.rolesView}>
      <Roles />
    </RequirePermission>
  );
}

function Roles() {
  const { data, isLoading } = useQuery(adminQueries.roles());
  const [selected, setSelected] = useState<string>("admin");
  const role = data?.find((r) => r.key === selected);

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="The UI checks permissions, never role names. Changing a role's permissions takes effect at the user's next request."
      />
      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <Card className="h-fit">
            <nav aria-label="Roles" className="divide-y divide-border">
              {(["admin", "seller", "store"] as const).map((portal) => (
                <div key={portal} className="py-2">
                  <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {portal === "admin" ? "Lunetbuz staff" : portal === "seller" ? "Shop team" : "Customer"}
                  </p>
                  {data
                    .filter((r) => r.portal === portal)
                    .sort((a, b) => b.level - a.level)
                    .map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setSelected(r.key)}
                        className={cn("flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-muted", selected === r.key && "bg-primary-soft font-medium text-primary")}
                        aria-current={selected === r.key}
                      >
                        {r.label}
                        <span className="text-xs text-muted-foreground">{r.userCount}</span>
                      </button>
                    ))}
                </div>
              ))}
            </nav>
          </Card>
          {role && <RoleEditor key={role.key + role.permissions.join()} role={role} />}
        </div>
      )}
    </>
  );
}

function RoleEditor({ role }: { role: RoleWithCount }) {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [perms, setPerms] = useState<string[]>(role.permissions);
  const isAll = role.permissions.includes("*");
  const editable = can(P.rolesManage) && !isAll;
  const dirty = perms.slice().sort().join() !== role.permissions.slice().sort().join();
  const groups = PERMISSION_GROUPS.filter((g) => g.portal === role.portal);

  const save = useMutation({
    mutationFn: () => adminService.updateRole(role.key, perms),
    onSuccess: () => {
      toast.success(`${role.label} updated`);
      void qc.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {role.label} <Badge>level {role.level}</Badge>
          </span>
        }
        description={role.description}
        action={
          editable && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!dirty} onClick={() => setPerms(role.permissions)}>
                Reset
              </Button>
              <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                Save permissions
              </Button>
            </div>
          )
        }
      />
      <CardBody className="space-y-6">
        {isAll && (
          <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
            <Lock className="size-4" aria-hidden /> Super Admin has every permission and can&apos;t be modified.
          </p>
        )}
        {role.portal === "store" ? (
          <p className="text-sm text-muted-foreground">Customers use the storefront and their own account only. No portal permissions.</p>
        ) : (
          groups.map((g) => (
            <fieldset key={g.label}>
              <legend className="mb-2 text-sm font-semibold">{g.label}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.permissions.map((p) => {
                  const on = isAll || perms.includes(p);
                  return (
                    <label key={p} className={cn("flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm", editable && "cursor-pointer hover:bg-muted/50")}>
                      {editable ? (
                        <Checkbox checked={on} onCheckedChange={(c) => setPerms((s) => (c ? [...s, p] : s.filter((x) => x !== p)))} />
                      ) : on ? (
                        <Check className="size-4 text-success" aria-label="Granted" />
                      ) : (
                        <Minus className="size-4 text-muted-foreground" aria-label="Not granted" />
                      )}
                      <code className="text-xs">{p}</code>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))
        )}
      </CardBody>
    </Card>
  );
}

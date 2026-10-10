"use client";

import { RequireSession } from "@/components/common/guards";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Package, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { accountQueries, accountService } from "@/services/account.service";
import { useSession, useSessionStore } from "@/stores/session.store";

function AccountPageContent() {
  const { user } = useSession();
  const orders = useQuery(accountQueries.orders("all"));
  const toShip = useQuery(accountQueries.orders("to_ship"));
  const toReceive = useQuery(accountQueries.orders("to_receive"));
  const form = useForm({ values: { name: user?.name ?? "", email: user?.email ?? "" } });
  const save = useMutation({
    mutationFn: accountService.updateProfile,
    onSuccess: (_d, v) => {
      useSessionStore.getState().updateUser(v);
      toast.success("Profile updated");
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My profile</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "All orders", value: orders.data?.meta.total, href: "/account/orders", icon: Package },
          { label: "To ship", value: toShip.data?.meta.total, href: "/account/orders?status=to_ship", icon: Wallet },
          { label: "To receive", value: toReceive.data?.meta.total, href: "/account/orders?status=to_receive", icon: Truck },
        ].map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="flex items-center gap-3 p-4 hover:border-primary">
              <s.icon className="size-5 text-primary" aria-hidden />
              <div>
                <p className="text-xl font-semibold">{s.value ?? "–"}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader title="Personal information" description="Your phone number is used to log in and for delivery updates." />
        <CardBody>
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid max-w-xl gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input {...form.register("name", { required: true })} />
            </Field>
            <Field label="Email">
              <Input type="email" {...form.register("email")} />
            </Field>
            <Field label="Mobile number" hint="Contact support to change your number.">
              <Input value={user.phone} disabled readOnly />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
                Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireSession portal="store">
      <AccountPageContent />
    </RequireSession>
  );
}

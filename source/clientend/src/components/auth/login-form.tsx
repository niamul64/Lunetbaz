"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, LogIn, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { isMockApi } from "@/config/env";
import { errorMessage } from "@/lib/api/errors";
import { queryPolicy } from "@/lib/cache/query-policy";
import { authService, type LoginInput } from "@/services/auth.service";
import { portalHome, useSession, useSessionStore } from "@/stores/session.store";
import type { AuthSession, DemoAccount, Portal } from "@/types";

const schema = z.object({
  identifier: z.string().min(3, "Enter your email or mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** Only allow redirecting back to an internal path the user's portal can open. */
function safeNext(next: string | null, portal: Portal) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return portalHome(portal);
  const area = next.startsWith("/admin") ? "admin" : next.startsWith("/seller") ? "seller" : "store";
  return area === portal ? next : portalHome(portal);
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { user, status } = useSession();
  const form = useForm<LoginInput>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  const login = useMutation({
    mutationFn: authService.login,
    meta: { silent: true },
    onSuccess: (session: AuthSession) => {
      useSessionStore.getState().setSession(session);
      router.replace(safeNext(next, session.user.portal));
    },
  });

  // Already signed in → go to the right portal.
  useEffect(() => {
    if (status === "authenticated" && user && !login.isPending && !login.isSuccess) router.replace(safeNext(next, user.portal));
  }, [status, user, next, router, login.isPending, login.isSuccess]);

  function loginAs(account: DemoAccount) {
    form.setValue("identifier", account.email);
    form.setValue("password", "Password@123");
    login.mutate({ identifier: account.email, password: "Password@123" });
  }

  return (
    <div className="grid w-full max-w-5xl items-start gap-6 lg:grid-cols-[26rem_1fr]">
      <Card>
        <CardBody className="space-y-5 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">One login for customers, sellers and Lunetbuz staff.</p>
          </div>
          {login.error && <Alert tone="danger">{errorMessage(login.error)}</Alert>}
          <form onSubmit={form.handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
            <Field label="Email or mobile number" error={form.formState.errors.identifier?.message} required>
              <Input autoComplete="username" autoFocus {...form.register("identifier")} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message} required>
              <Input type="password" autoComplete="current-password" {...form.register("password")} />
            </Field>
            <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
              <LogIn /> Log in
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            New to Lunetbuz?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardBody>
      </Card>
      {isMockApi && <DemoAccounts onPick={loginAs} disabled={login.isPending} />}
    </div>
  );
}

const PORTAL_META: Record<Portal, { title: string; icon: typeof Store; description: string }> = {
  admin: { title: "Lunetbuz staff (Admin portal)", icon: Building2, description: "Each role sees only the menus and actions it is allowed." },
  seller: { title: "Shop team (Seller Center)", icon: Store, description: "Shop admin, manager and staff of a shop." },
  store: { title: "Customers (Storefront)", icon: ShoppingBag, description: "Shoppers with orders, addresses and wishlists." },
};

function DemoAccounts({ onPick, disabled }: { onPick: (a: DemoAccount) => void; disabled: boolean }) {
  const { data } = useQuery({ queryKey: ["auth", "demo-accounts"], queryFn: authService.demoAccounts, ...queryPolicy.static });
  if (!data) return null;
  return (
    <Card>
      <CardBody className="space-y-5 p-6">
        <div>
          <h2 className="font-semibold">Demo accounts</h2>
          <p className="text-sm text-muted-foreground">
            Mock mode: click any account to sign in (password <code className="rounded bg-muted px-1">Password@123</code>). Accounts come from{" "}
            <code className="rounded bg-muted px-1">dummy_data/auth.json</code>.
          </p>
        </div>
        {(["admin", "seller", "store"] as Portal[]).map((portal) => {
          const meta = PORTAL_META[portal];
          const accounts = data.filter((a) => a.portal === portal);
          return (
            <section key={portal} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <meta.icon className="size-4 text-primary" aria-hidden /> {meta.title}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(a)}
                    className="rounded-lg border border-border p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary-soft/40 disabled:opacity-50"
                    title={a.description}
                  >
                    <span className="block font-medium">{a.roleLabel}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.name} · {a.email}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </CardBody>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { authService } from "@/services/auth.service";
import { useSessionStore } from "@/stores/session.store";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    phone: z.string().regex(/^01[3-9]\d{8}$/, "Enter a valid 11-digit mobile number (01XXXXXXXXX)"),
    email: z.union([z.literal(""), z.email("Enter a valid email")]),
    password: z.string().min(8, "Use at least 8 characters").regex(/[A-Z]/, "Include an uppercase letter").regex(/\d/, "Include a number"),
    confirm: z.string(),
    terms: z.literal(true, { error: "You must accept the terms" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

type FormValues = z.input<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", email: "", password: "", confirm: "", terms: false as unknown as true } });
  const e = form.formState.errors;

  const register = useMutation({
    mutationFn: (v: FormValues) => authService.register({ name: v.name, phone: v.phone, email: v.email || undefined, password: v.password }),
    meta: { silent: true },
    onSuccess: (session) => {
      useSessionStore.getState().setSession(session);
      router.replace("/");
    },
    onError: (error) => {
      const fieldErrors = isApiError(error) ? (error.details as { fieldErrors?: Record<string, string> })?.fieldErrors : undefined;
      if (fieldErrors) for (const [k, msg] of Object.entries(fieldErrors)) form.setError(k as keyof FormValues, { message: msg });
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardBody className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">Shop genuine products with Cash on Delivery.</p>
        </div>
        {register.error && !isApiError(register.error) && <Alert tone="danger">{errorMessage(register.error)}</Alert>}
        <form onSubmit={form.handleSubmit((v) => register.mutate(v))} className="space-y-4" noValidate>
          <Field label="Full name" error={e.name?.message} required>
            <Input autoComplete="name" {...form.register("name")} />
          </Field>
          <Field label="Mobile number" error={e.phone?.message} hint="We'll send an OTP to verify this number." required>
            <Input inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" {...form.register("phone")} />
          </Field>
          <Field label="Email (optional)" error={e.email?.message}>
            <Input type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field label="Password" error={e.password?.message} required>
            <Input type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <Field label="Confirm password" error={e.confirm?.message} required>
            <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
          <div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register("terms")} />
              <span>I agree to Lunetbuz&apos;s Terms of Use and Privacy Policy.</span>
            </label>
            {e.terms && <p className="mt-1 text-xs text-danger">{e.terms.message}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg" loading={register.isPending}>
            Sign up
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}

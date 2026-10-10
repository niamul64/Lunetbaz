"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/common/data-table";
import { Can, RequirePermission, usePermissions } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import { isApiError } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { formatDate, formatPrice, humanize } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { Voucher } from "@/types";

type Row = Voucher & { shopName: string | null };

export default function AdminVouchersPage() {
  return (
    <RequirePermission permission={P.campaignsView}>
      <Vouchers />
    </RequirePermission>
  );
}

function Vouchers() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data, isLoading, error, refetch } = useQuery(adminQueries.vouchers());
  const [open, setOpen] = useState(false);
  const toggle = useMutation({
    mutationFn: (v: Row) => adminService.updateVoucher(v.id, { active: !v.active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "vouchers"] }),
  });

  const columns: Column<Row>[] = [
    {
      key: "code",
      header: "Code",
      cell: (v) => (
        <div>
          <p className="font-mono font-semibold">{v.code}</p>
          <p className="text-xs text-muted-foreground">{v.title}</p>
        </div>
      ),
    },
    { key: "value", header: "Discount", cell: (v) => (v.type === "fixed" ? formatPrice(v.value) : `${v.value}%${v.maxDiscount ? ` (max ${formatPrice(v.maxDiscount)})` : ""}`) },
    { key: "min", header: "Min spend", hideOnMobile: true, cell: (v) => formatPrice(v.minSpend) },
    { key: "scope", header: "Scope", hideOnMobile: true, cell: (v) => v.shopName ?? "All shops" },
    { key: "funded", header: "Funded by", hideOnMobile: true, cell: (v) => humanize(v.fundedBy) },
    { key: "usage", header: "Used", cell: (v) => `${v.used}${v.usageLimit ? ` / ${v.usageLimit}` : ""}` },
    { key: "dates", header: "Valid", hideOnMobile: true, cell: (v) => `${formatDate(v.startAt)} – ${formatDate(v.endAt)}` },
    {
      key: "active",
      header: "Active",
      cell: (v) => <Switch checked={v.active} disabled={!can(P.campaignsManage)} onCheckedChange={() => toggle.mutate(v)} aria-label={`Toggle ${v.code}`} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Platform and shop vouchers redeemable at checkout."
        actions={
          <Can permission={P.campaignsManage}>
            <Button onClick={() => setOpen(true)}>
              <Plus /> New voucher
            </Button>
          </Can>
        }
      />
      <Card>
        <DataTable columns={columns} rows={data} rowKey={(v) => v.id} loading={isLoading} error={error} onRetry={() => refetch()} />
      </Card>
      <VoucherDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

type VoucherValues = { code: string; title: string; type: "fixed" | "percent"; value: number; minSpend: number; maxDiscount: string; usageLimit: string; startAt: string; endAt: string };

function VoucherDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const form = useForm<VoucherValues>({ defaultValues: { code: "", title: "", type: "fixed", value: 100, minSpend: 500, maxDiscount: "", usageLimit: "", startAt: "", endAt: "" } });
  const create = useMutation({
    mutationFn: (v: VoucherValues) =>
      adminService.createVoucher({
        code: v.code.toUpperCase(),
        title: v.title,
        type: v.type,
        value: Number(v.value),
        minSpend: Number(v.minSpend),
        maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : null,
        usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
        startAt: new Date(v.startAt).toISOString(),
        endAt: new Date(v.endAt).toISOString(),
      }),
    meta: { inlineValidation: true },
    onSuccess: () => {
      toast.success("Voucher created");
      void qc.invalidateQueries({ queryKey: ["admin", "vouchers"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e) => {
      const fe = isApiError(e) ? (e.details as { fieldErrors?: Record<string, string> })?.fieldErrors : null;
      if (fe?.code) form.setError("code", { message: fe.code });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New voucher" size="lg">
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required error={form.formState.errors.code?.message} hint="4–16 uppercase letters/digits">
            <Input className="font-mono uppercase" {...form.register("code", { required: "Required" })} />
          </Field>
          <Field label="Title" required>
            <Input {...form.register("title", { required: true })} placeholder="৳200 off on ৳2,000+" />
          </Field>
          <Field label="Type">
            <NativeSelect {...form.register("type")}>
              <option value="fixed">Fixed amount (৳)</option>
              <option value="percent">Percentage (%)</option>
            </NativeSelect>
          </Field>
          <Field label="Value">
            <Input inputMode="numeric" {...form.register("value")} />
          </Field>
          <Field label="Minimum spend (৳)">
            <Input inputMode="numeric" {...form.register("minSpend")} />
          </Field>
          <Field label="Max discount (৳)" hint="For % vouchers">
            <Input inputMode="numeric" {...form.register("maxDiscount")} />
          </Field>
          <Field label="Valid from" required>
            <Input type="datetime-local" {...form.register("startAt", { required: true })} />
          </Field>
          <Field label="Valid until" required>
            <Input type="datetime-local" {...form.register("endAt", { required: true })} />
          </Field>
          <Field label="Usage limit" hint="Empty = unlimited">
            <Input inputMode="numeric" {...form.register("usageLimit")} />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" loading={create.isPending}>
              Create voucher
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

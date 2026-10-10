"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RequirePermission } from "@/components/common/guards";
import { ICONS } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import { P } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { Banner } from "@/types";

export default function AdminContentPage() {
  return (
    <RequirePermission permission={P.cmsManage}>
      <Banners />
    </RequirePermission>
  );
}

function Banners() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueries.banners());
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "banners"] });
  const toggle = useMutation({ mutationFn: (b: Banner) => adminService.updateBanner(b.id, { active: !b.active }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: adminService.deleteBanner, onSuccess: () => (toast.success("Banner deleted"), invalidate()) });

  return (
    <>
      <PageHeader
        title="Home banners"
        description="Hero carousel on the storefront home page. Active banners within their date window are shown, ordered by sort."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus /> New banner
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.length ? (
        <EmptyState title="No banners" />
      ) : (
        <div className="space-y-3">
          {data.map((b) => {
            const Icon = ICONS[b.icon] ?? ICONS.sparkles!;
            return (
              <Card key={b.id} className="flex flex-wrap items-center gap-4 p-3">
                <div
                  className="flex h-20 w-40 shrink-0 items-center justify-between overflow-hidden rounded-lg px-3 text-white"
                  style={{ background: `linear-gradient(120deg, oklch(0.42 0.17 ${b.hue}), oklch(0.62 0.18 ${(b.hue + 40) % 360}))` }}
                >
                  <span className="line-clamp-2 text-xs font-semibold">{b.title}</span>
                  <Icon className="size-8 opacity-40" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{b.title}</p>
                  <p className="truncate text-muted-foreground">{b.subtitle}</p>
                  <p className="text-xs text-muted-foreground">
                    → {b.href} · sort {b.sort} · {b.startAt ? `${formatDate(b.startAt)} – ${formatDate(b.endAt)}` : "Always"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={b.active} onCheckedChange={() => toggle.mutate(b)} aria-label={`Toggle ${b.title}`} />
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(b)} aria-label="Edit">
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Delete">
                        <Trash2 className="text-danger" />
                      </Button>
                    }
                    title={`Delete “${b.title}”?`}
                    variant="destructive"
                    confirmLabel="Delete"
                    onConfirm={() => remove.mutateAsync(b.id)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <BannerDialog banner={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

type BannerValues = { title: string; subtitle: string; cta: string; href: string; icon: string; hue: number; sort: number; active: boolean };

function BannerDialog({ banner, onClose }: { banner: Partial<Banner>; onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm<BannerValues>({
    defaultValues: { title: banner.title ?? "", subtitle: banner.subtitle ?? "", cta: banner.cta ?? "Shop now", href: banner.href ?? "/", icon: banner.icon ?? "sparkles", hue: banner.hue ?? 275, sort: banner.sort ?? 10, active: banner.active ?? false },
  });
  const active = useWatch({ control: form.control, name: "active" });
  const save = useMutation({
    mutationFn: (v: BannerValues) => {
      const input = { ...v, hue: Number(v.hue), sort: Number(v.sort) };
      return banner.id ? adminService.updateBanner(banner.id, input) : adminService.createBanner(input);
    },
    onSuccess: () => {
      toast.success("Banner saved. The storefront updates within a few minutes (cache).");
      void qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={banner.id ? "Edit banner" : "New banner"} size="lg">
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <Input {...form.register("title", { required: true })} />
          </Field>
          <Field label="Subtitle" className="sm:col-span-2">
            <Input {...form.register("subtitle")} />
          </Field>
          <Field label="Button label">
            <Input {...form.register("cta")} />
          </Field>
          <Field label="Link" hint="e.g. /campaigns/11-11-mega-sale-2026">
            <Input {...form.register("href")} />
          </Field>
          <Field label="Icon">
            <NativeSelect {...form.register("icon")}>
              {Object.keys(ICONS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Color hue (0–360)">
            <Input inputMode="numeric" {...form.register("hue")} />
          </Field>
          <Field label="Sort">
            <Input inputMode="numeric" {...form.register("sort")} />
          </Field>
          <label className="flex items-center gap-3 self-end pb-2 text-sm">
            <Switch checked={active} onCheckedChange={(c) => form.setValue("active", c)} /> Active
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" loading={save.isPending}>
              Save banner
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

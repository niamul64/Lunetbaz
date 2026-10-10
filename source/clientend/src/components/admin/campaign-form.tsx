"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Checkbox, Switch } from "@/components/ui/primitives";
import { CAMPAIGN_TYPE_LABEL } from "@/components/common/campaign-parts";
import { adminQueries } from "@/services/admin.service";
import type { Campaign } from "@/types";

const schema = z
  .object({
    name: z.string().min(3, "Enter a name"),
    type: z.enum(["mega", "festival", "flash", "category_day", "brand_day", "clearance", "special"]),
    tagline: z.string().max(80),
    description: z.string(),
    hue: z.coerce.number<number>().min(0).max(360),
    registrationStart: z.string().min(1, "Required"),
    registrationEnd: z.string().min(1, "Required"),
    startAt: z.string().min(1, "Required"),
    endAt: z.string().min(1, "Required"),
    minDiscountPct: z.coerce.number<number>().min(0).max(90),
    minStock: z.coerce.number<number>().int().min(1),
    maxProductsPerShop: z.coerce.number<number>().int().min(1),
    minShopRating: z.coerce.number<number>().min(0).max(5),
    verifiedOnly: z.boolean(),
    categoryIds: z.array(z.string()),
    extraCommissionPct: z.coerce.number<number>().min(0).max(20),
    voucherFundedBy: z.enum(["platform", "seller", "shared"]),
  })
  .refine((v) => v.registrationEnd > v.registrationStart, { path: ["registrationEnd"], message: "Must be after registration opens" })
  .refine((v) => v.startAt >= v.registrationEnd, { path: ["startAt"], message: "Must start after registration closes" })
  .refine((v) => v.endAt > v.startAt, { path: ["endAt"], message: "Must end after it starts" });

type Values = z.infer<typeof schema>;

/** ISO (UTC) → value for <input type="datetime-local"> in the browser's timezone. */
function toLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const toIso = (local: string) => new Date(local).toISOString();

export function CampaignForm({ campaign, onSubmit, submitting }: { campaign?: Campaign; onSubmit: (c: Partial<Campaign>) => void; submitting?: boolean }) {
  const { data: categories } = useQuery(adminQueries.categories());
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: campaign?.name ?? "",
      type: campaign?.type ?? "festival",
      tagline: campaign?.tagline ?? "",
      description: campaign?.description ?? "",
      hue: campaign?.hue ?? 25,
      registrationStart: toLocal(campaign?.registrationStart),
      registrationEnd: toLocal(campaign?.registrationEnd),
      startAt: toLocal(campaign?.startAt),
      endAt: toLocal(campaign?.endAt),
      minDiscountPct: campaign?.rules.minDiscountPct ?? 10,
      minStock: campaign?.rules.minStock ?? 5,
      maxProductsPerShop: campaign?.rules.maxProductsPerShop ?? 20,
      minShopRating: campaign?.rules.minShopRating ?? 4,
      verifiedOnly: campaign?.rules.verifiedOnly ?? false,
      categoryIds: campaign?.rules.categoryIds ?? [],
      extraCommissionPct: campaign?.extraCommissionPct ?? 0,
      voucherFundedBy: campaign?.voucherFundedBy ?? "platform",
    },
  });
  const e = form.formState.errors;
  const selectedCats = useWatch({ control: form.control, name: "categoryIds" });
  const hue = useWatch({ control: form.control, name: "hue" });
  const verifiedOnly = useWatch({ control: form.control, name: "verifiedOnly" });

  function submit(v: Values) {
    onSubmit({
      name: v.name,
      type: v.type,
      tagline: v.tagline,
      description: v.description,
      hue: v.hue,
      registrationStart: toIso(v.registrationStart),
      registrationEnd: toIso(v.registrationEnd),
      startAt: toIso(v.startAt),
      endAt: toIso(v.endAt),
      rules: { minDiscountPct: v.minDiscountPct, minStock: v.minStock, maxProductsPerShop: v.maxProductsPerShop, minShopRating: v.minShopRating, verifiedOnly: v.verifiedOnly, categoryIds: v.categoryIds },
      extraCommissionPct: v.extraCommissionPct,
      voucherFundedBy: v.voucherFundedBy,
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader title="Campaign" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={e.name?.message} required>
            <Input {...form.register("name")} placeholder="e.g. Eid-ul-Adha Fest" />
          </Field>
          <Field label="Type" required>
            <NativeSelect {...form.register("type")}>
              {Object.entries(CAMPAIGN_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Tagline" error={e.tagline?.message} className="sm:col-span-2">
            <Input {...form.register("tagline")} placeholder="Shown on banners and campaign pages" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={3} {...form.register("description")} />
          </Field>
          <Field label="Theme color (hue 0–360)" hint="Used for banners and landing page">
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={360} {...form.register("hue")} className="flex-1 accent-[var(--primary)]" aria-label="Hue" />
              <span className="size-8 rounded-md" style={{ background: `oklch(0.6 0.17 ${hue})` }} aria-hidden />
            </div>
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Schedule" description="Times are in your local timezone (Asia/Dhaka)." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration opens" error={e.registrationStart?.message} required>
            <Input type="datetime-local" {...form.register("registrationStart")} />
          </Field>
          <Field label="Registration closes" error={e.registrationEnd?.message} required>
            <Input type="datetime-local" {...form.register("registrationEnd")} />
          </Field>
          <Field label="Campaign starts" error={e.startAt?.message} required>
            <Input type="datetime-local" {...form.register("startAt")} />
          </Field>
          <Field label="Campaign ends" error={e.endAt?.message} required>
            <Input type="datetime-local" {...form.register("endAt")} />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Rules for shops" description="Applications are checked against these automatically." />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum discount %" error={e.minDiscountPct?.message} hint="vs. 30-day lowest price">
            <Input inputMode="numeric" {...form.register("minDiscountPct")} />
          </Field>
          <Field label="Minimum campaign stock" error={e.minStock?.message}>
            <Input inputMode="numeric" {...form.register("minStock")} />
          </Field>
          <Field label="Max products per shop" error={e.maxProductsPerShop?.message}>
            <Input inputMode="numeric" {...form.register("maxProductsPerShop")} />
          </Field>
          <Field label="Minimum shop rating" error={e.minShopRating?.message}>
            <Input inputMode="decimal" {...form.register("minShopRating")} />
          </Field>
          <Field label="Extra commission %" error={e.extraCommissionPct?.message}>
            <Input inputMode="decimal" {...form.register("extraCommissionPct")} />
          </Field>
          <Field label="Vouchers funded by">
            <NativeSelect {...form.register("voucherFundedBy")}>
              <option value="platform">Lunetbuz</option>
              <option value="seller">Seller</option>
              <option value="shared">Shared</option>
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-3">
            <Switch checked={verifiedOnly} onCheckedChange={(c) => form.setValue("verifiedOnly", c)} />
            Only Lunetbuz Verified products may join
          </label>
          <fieldset className="sm:col-span-3">
            <legend className="mb-2 text-sm font-medium">Eligible categories (none selected = all)</legend>
            <div className="flex flex-wrap gap-3">
              {categories
                ?.filter((c) => !c.parentId)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedCats.includes(c.id)}
                      onCheckedChange={(on) => form.setValue("categoryIds", on ? [...selectedCats, c.id] : selectedCats.filter((x) => x !== c.id))}
                    />
                    {c.name}
                  </label>
                ))}
            </div>
          </fieldset>
        </CardBody>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          {campaign ? "Save changes" : "Create campaign (draft)"}
        </Button>
      </div>
    </form>
  );
}

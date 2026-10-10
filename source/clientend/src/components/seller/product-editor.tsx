"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert, ImagePlus, Lock, Plus, Trash2, X } from "lucide-react";
import { usePermissions } from "@/components/common/guards";
import { Media } from "@/components/common/media";
import { StatusBadge, VerificationStatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import { isApiError } from "@/lib/api/errors";
import { P } from "@/lib/auth/permissions";
import { sellerQueries, sellerService, type ProductInput } from "@/services/seller.service";
import { uploadService } from "@/services/upload.service";
import type { Product } from "@/types";
import { ChangeRequestDialog } from "./change-request-dialog";
import { InventoryDialog } from "./inventory-dialog";

const variantSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string(),
    values: z.array(z.string().min(1, "Required")),
    price: z.coerce.number<number>().positive("Price must be > 0"),
    salePrice: z.union([z.literal(""), z.coerce.number<number>().positive()]),
    stock: z.coerce.number<number>().int().min(0, "Must be ≥ 0"),
  })
  .refine((v) => v.salePrice === "" || v.salePrice < v.price, { path: ["salePrice"], message: "Must be lower than price" });

const schema = z.object({
  name: z.string().min(10, "Use at least 10 characters").max(150),
  brand: z.string().min(1, "Enter the brand or 'No brand'"),
  categoryId: z.string().min(1, "Choose a category"),
  images: z.array(z.string()).min(1, "Add at least one image").max(8),
  video: z.string().url("Enter a valid URL").or(z.literal("")),
  description: z.string().min(30, "Describe the product in at least 30 characters"),
  highlights: z.array(z.object({ value: z.string().min(1, "Required") })).max(8),
  specs: z.array(z.object({ label: z.string().min(1, "Required"), value: z.string().min(1, "Required") })),
  optionNames: z.array(z.string().min(1, "Required")).max(2),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
  weightKg: z.coerce.number<number>().positive("Enter the package weight"),
  freeShipping: z.boolean(),
  warranty: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(p?: Product): FormValues {
  const optionNames = p ? [...new Set(p.variants.flatMap((v) => Object.keys(v.attributes)))] : ["Color"];
  return {
    name: p?.name ?? "",
    brand: p?.brand ?? "",
    categoryId: p?.categoryId ?? "",
    images: p?.images ?? [],
    video: p?.video ?? "",
    description: p?.description ?? "",
    highlights: (p?.highlights ?? [""]).map((value) => ({ value })),
    specs: p?.specs ?? [],
    optionNames,
    variants: p?.variants.map((v) => ({ id: v.id, sku: v.sku, values: optionNames.map((n) => v.attributes[n] ?? ""), price: v.price, salePrice: v.salePrice ?? "", stock: v.stock })) ?? [
      { sku: "", values: [""], price: 0, salePrice: "", stock: 0 },
    ],
    weightKg: p?.weightKg ?? 0.5,
    freeShipping: p?.freeShipping ?? false,
    warranty: p?.warranty ?? "",
  };
}

function toInput(v: FormValues): ProductInput {
  return {
    name: v.name,
    brand: v.brand,
    categoryId: v.categoryId,
    images: v.images,
    video: v.video || null,
    description: v.description,
    highlights: v.highlights.map((h) => h.value),
    specs: v.specs,
    variants: v.variants.map((x) => ({
      id: x.id,
      sku: x.sku,
      attributes: Object.fromEntries(v.optionNames.map((n, i) => [n, x.values[i] ?? ""])),
      price: x.price,
      salePrice: x.salePrice === "" ? null : x.salePrice,
      stock: x.stock,
    })),
    weightKg: v.weightKg,
    freeShipping: v.freeShipping,
    warranty: v.warranty || null,
    tags: [],
  };
}

export function ProductEditor({ product }: { product?: Product }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [changeOpen, setChangeOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const { data: categories } = useQuery(sellerQueries.categories());

  const locked = Boolean(product && ["verified", "suspended", "pending"].includes(product.verification.status));
  const readOnly = locked || !can(P.sellerProductsManage);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(product) });
  const freeShipping = useWatch({ control: form.control, name: "freeShipping" });

  const save = useMutation({
    mutationFn: ({ values, submit }: { values: FormValues; submit: boolean }) =>
      product ? sellerService.updateProduct(product.id, { ...toInput(values), submit }) : sellerService.createProduct({ ...toInput(values), submit }),
    meta: { inlineValidation: true },
    onSuccess: (p, { submit }) => {
      toast.success(submit ? "Submitted for quality review" : "Saved");
      void qc.invalidateQueries({ queryKey: ["seller"] });
      if (!product) router.replace(`/seller/products/${p.id}`);
      else form.reset(toFormValues(p));
    },
    onError: (error) => {
      const fe = isApiError(error) ? (error.details as { fieldErrors?: Record<string, string> })?.fieldErrors : null;
      if (fe) for (const [k, msg] of Object.entries(fe)) form.setError(k as keyof FormValues, { message: msg });
    },
  });

  const submit = (submitForReview: boolean) => form.handleSubmit((values) => save.mutate({ values, submit: submitForReview }))();
  const e = form.formState.errors;

  return (
    <form onSubmit={(ev) => ev.preventDefault()} className="space-y-6" noValidate>
      {product && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={product.status} />
          <VerificationStatusBadge status={product.verification.status} />
        </div>
      )}
      {product?.status === "rejected" && product.rejectionReason && (
        <Alert tone="danger" icon={CircleAlert} title="Rejected by quality control">
          {product.rejectionReason} Fix the issue and submit again.
        </Alert>
      )}
      {locked && (
        <Alert
          tone="verified"
          icon={Lock}
          title={product!.verification.status === "pending" ? "Content frozen during verification" : "Lunetbuz Verified: content locked"}
          action={
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              {can(P.sellerInventoryManage) && (
                <Button type="button" size="sm" variant="outline" onClick={() => setInventoryOpen(true)}>
                  Edit price & stock
                </Button>
              )}
              {product!.verification.status === "verified" && can(P.sellerProductsManage) && (
                <Button type="button" size="sm" variant="verified" onClick={() => setChangeOpen(true)}>
                  Request change
                </Button>
              )}
            </div>
          }
        >
          Photos, videos, title, description, specifications and category can&apos;t be edited. Price and stock stay editable. To change locked content, submit a change request. It will be
          re-verified.
        </Alert>
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        <Card>
          <CardHeader title="Basic information" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" error={e.name?.message} required className="sm:col-span-2" hint="Brand + model + key spec, e.g. “Samsung Galaxy A56 5G (8GB/256GB)”">
              <Input {...form.register("name")} />
            </Field>
            <Field label="Brand" error={e.brand?.message} required>
              <Input {...form.register("brand")} />
            </Field>
            <Field label="Category" error={e.categoryId?.message} required>
              <NativeSelect {...form.register("categoryId")}>
                <option value="">Select category</option>
                {categories
                  ?.filter((c) => !c.parentId)
                  .map((parent) => (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (general)</option>
                      {categories
                        .filter((c) => c.parentId === parent.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </NativeSelect>
            </Field>
          </CardBody>
        </Card>

        <MediaSection form={form} readOnly={readOnly} />

        <Card>
          <CardHeader title="Description" />
          <CardBody className="space-y-4">
            <Field label="Description" error={e.description?.message} required>
              <Textarea rows={6} {...form.register("description")} />
            </Field>
            <ListEditor form={form} name="highlights" label="Key highlights" readOnly={readOnly} />
            <SpecsEditor form={form} readOnly={readOnly} />
          </CardBody>
        </Card>

        <VariantsSection form={form} readOnly={readOnly} lockedStructure={locked} />

        <Card>
          <CardHeader title="Delivery & warranty" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field label="Package weight (kg)" error={e.weightKg?.message} required>
              <Input inputMode="decimal" {...form.register("weightKg")} />
            </Field>
            <Field label="Warranty" hint="Leave empty if none">
              <Input placeholder="e.g. 1 year official" {...form.register("warranty")} />
            </Field>
            <label className="flex items-center gap-3 self-end pb-2 text-sm">
              <Switch checked={freeShipping} onCheckedChange={(c) => form.setValue("freeShipping", c, { shouldDirty: true })} disabled={readOnly} />
              Offer free delivery
            </label>
          </CardBody>
        </Card>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
          <Button type="button" variant="outline" onClick={() => router.push("/seller/products")}>
            Cancel
          </Button>
          {(!product || product.status === "draft") && (
            <Button type="button" variant="secondary" onClick={() => submit(false)} loading={save.isPending && !save.variables?.submit}>
              Save draft
            </Button>
          )}
          <Button type="button" onClick={() => submit(true)} loading={save.isPending && save.variables?.submit}>
            {product && product.status !== "draft" && product.status !== "rejected" ? "Save & resubmit for QC" : "Submit for review"}
          </Button>
        </div>
      )}

      {product && locked && <ChangeRequestDialog product={product} open={changeOpen} onOpenChange={setChangeOpen} />}
      {product && inventoryOpen && <InventoryDialog product={product} open onOpenChange={setInventoryOpen} />}
    </form>
  );
}

/* ---------------------------------------------------------------- sections */

function MediaSection({ form, readOnly }: { form: UseFormReturn<FormValues>; readOnly: boolean }) {
  const images = useWatch({ control: form.control, name: "images" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 8 - images.length)) urls.push(await uploadService.uploadImage(f));
      form.setValue("images", [...images, ...urls], { shouldDirty: true, shouldValidate: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader title="Photos & video" description="Use real photos of the actual item. Up to 8 images, JPG/PNG/WebP, max 5 MB each." />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative">
              <Media src={src} alt={`Image ${i + 1}`} className="size-24 rounded-lg border border-border" iconClassName="size-8" />
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1 text-[10px] text-background">Cover</span>}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => form.setValue("images", images.filter((_, j) => j !== i), { shouldDirty: true })}
                  className="absolute -right-2 -top-2 rounded-full bg-card p-0.5 shadow ring-1 ring-border hover:text-danger"
                  aria-label={`Remove image ${i + 1}`}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && images.length < 8 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <ImagePlus className="size-6" aria-hidden />
              {uploading ? "Uploading…" : "Add photo"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        {form.formState.errors.images && <p className="text-xs text-danger">{form.formState.errors.images.message}</p>}
        <Field label="Video URL (optional)" error={form.formState.errors.video?.message}>
          <Input placeholder="https://" {...form.register("video")} />
        </Field>
      </CardBody>
    </Card>
  );
}

function ListEditor({ form, name, label, readOnly }: { form: UseFormReturn<FormValues>; name: "highlights"; label: string; readOnly: boolean }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {fields.map((f, i) => (
        <div key={f.id} className="flex gap-2">
          <Input {...form.register(`${name}.${i}.value`)} aria-label={`${label} ${i + 1}`} aria-invalid={Boolean(form.formState.errors[name]?.[i])} />
          {!readOnly && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
              <Trash2 />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && fields.length < 8 && (
        <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
          <Plus /> Add highlight
        </Button>
      )}
    </div>
  );
}

function SpecsEditor({ form, readOnly }: { form: UseFormReturn<FormValues>; readOnly: boolean }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "specs" });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Specifications</p>
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2">
          <Input placeholder="e.g. RAM" {...form.register(`specs.${i}.label`)} aria-label="Specification name" />
          <Input placeholder="e.g. 8GB" {...form.register(`specs.${i}.value`)} aria-label="Specification value" />
          {!readOnly && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
              <Trash2 />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => append({ label: "", value: "" })}>
          <Plus /> Add specification
        </Button>
      )}
    </div>
  );
}

function VariantsSection({ form, readOnly, lockedStructure }: { form: UseFormReturn<FormValues>; readOnly: boolean; lockedStructure: boolean }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });
  const optionNames = useWatch({ control: form.control, name: "optionNames" });
  const e = form.formState.errors;

  function setOptions(next: string[]) {
    form.setValue("optionNames", next, { shouldDirty: true });
    form.getValues("variants").forEach((v, i) => form.setValue(`variants.${i}.values`, next.map((_, j) => v.values[j] ?? "")));
  }

  return (
    <Card>
      <CardHeader
        title="Variants, price & stock"
        description={lockedStructure ? "Variant structure is locked. Use “Edit price & stock” above." : "Define options like Color or Size, then a row per combination."}
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {optionNames.map((_, i) => (
            <Field key={i} label={`Option ${i + 1} name`} className="w-40">
              <Input {...form.register(`optionNames.${i}`)} />
            </Field>
          ))}
          {!readOnly && optionNames.length < 2 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...optionNames, "Size"])}>
              <Plus /> Add option
            </Button>
          )}
          {!readOnly && optionNames.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOptions(optionNames.slice(0, 1))}>
              Remove last option
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                {optionNames.map((n, i) => (
                  <th key={i} className="pb-2 pr-2 font-medium">
                    {n || `Option ${i + 1}`}
                  </th>
                ))}
                <th className="pb-2 pr-2 font-medium">SKU</th>
                <th className="pb-2 pr-2 font-medium">Price ৳</th>
                <th className="pb-2 pr-2 font-medium">Sale price ৳</th>
                <th className="pb-2 pr-2 font-medium">Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id} className="align-top">
                  {optionNames.map((_, j) => (
                    <td key={j} className="py-1 pr-2">
                      <Input className="h-9" {...form.register(`variants.${i}.values.${j}`)} aria-label={`Variant ${i + 1} ${optionNames[j]}`} aria-invalid={Boolean(e.variants?.[i]?.values?.[j])} />
                    </td>
                  ))}
                  <td className="py-1 pr-2">
                    <Input className="h-9 font-mono text-xs" placeholder="Auto" {...form.register(`variants.${i}.sku`)} aria-label="SKU" />
                  </td>
                  <td className="py-1 pr-2">
                    <Input className="h-9 w-28" inputMode="numeric" {...form.register(`variants.${i}.price`)} aria-label="Price" aria-invalid={Boolean(e.variants?.[i]?.price)} />
                    {e.variants?.[i]?.price && <p className="text-xs text-danger">{e.variants[i]!.price!.message}</p>}
                  </td>
                  <td className="py-1 pr-2">
                    <Input className="h-9 w-28" inputMode="numeric" {...form.register(`variants.${i}.salePrice`)} aria-label="Sale price" aria-invalid={Boolean(e.variants?.[i]?.salePrice)} />
                    {e.variants?.[i]?.salePrice && <p className="text-xs text-danger">{e.variants[i]!.salePrice!.message}</p>}
                  </td>
                  <td className="py-1 pr-2">
                    <Input className="h-9 w-20" inputMode="numeric" {...form.register(`variants.${i}.stock`)} aria-label="Stock" />
                  </td>
                  <td className="py-1">
                    {!readOnly && fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={`Remove variant ${i + 1}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={() => append({ sku: "", values: optionNames.map(() => ""), price: 0, salePrice: "", stock: 0 })}>
            <Plus /> Add variant
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

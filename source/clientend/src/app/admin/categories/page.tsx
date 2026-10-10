"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { RequirePermission } from "@/components/common/guards";
import { CategoryIcon, ICONS } from "@/components/common/media";
import { PageHeader } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { P } from "@/lib/auth/permissions";
import { adminQueries, adminService } from "@/services/admin.service";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  return (
    <RequirePermission permission={P.categoriesManage}>
      <Categories />
    </RequirePermission>
  );
}

function Categories() {
  const { data, isLoading } = useQuery(adminQueries.categories());
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const roots = data?.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort) ?? [];

  return (
    <>
      <PageHeader
        title="Categories"
        description="The category tree shown in the storefront and used for campaign eligibility."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus /> New category
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roots.map((root) => (
            <Card key={root.id} className="p-4">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={root.icon} hue={root.hue} className="size-10" />
                <div className="flex-1">
                  <p className="font-medium">{root.name}</p>
                  <p className="text-xs text-muted-foreground" lang="bn">
                    {root.nameBn} · /{root.slug} · {root.productCount} products
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(root)} aria-label={`Edit ${root.name}`}>
                  <Pencil />
                </Button>
              </div>
              <ul className="mt-3 space-y-1 border-l border-border pl-4">
                {data!
                  .filter((c) => c.parentId === root.id)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <span>
                        {c.name} <span className="text-xs text-muted-foreground">({c.productCount})</span>
                      </span>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                        <Pencil />
                      </Button>
                    </li>
                  ))}
                <li>
                  <Button variant="link" size="sm" className="h-7 px-0" onClick={() => setEditing({ parentId: root.id, icon: root.icon, hue: root.hue })}>
                    <Plus /> Add subcategory
                  </Button>
                </li>
              </ul>
            </Card>
          ))}
        </div>
      )}
      {editing && <CategoryDialog category={editing} roots={roots} onClose={() => setEditing(null)} />}
    </>
  );
}

type CategoryValues = { name: string; nameBn: string; slug: string; parentId: string; icon: string; hue: number; sort: number };

function CategoryDialog({ category, roots, onClose }: { category: Partial<Category>; roots: Category[]; onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm<CategoryValues>({
    defaultValues: { name: category.name ?? "", nameBn: category.nameBn ?? "", slug: category.slug ?? "", parentId: category.parentId ?? "", icon: category.icon ?? "package", hue: category.hue ?? 220, sort: category.sort ?? 99 },
  });
  const save = useMutation({
    mutationFn: (v: CategoryValues) => {
      const input = { ...v, parentId: v.parentId || null, hue: Number(v.hue), sort: Number(v.sort) };
      return category.id ? adminService.updateCategory(category.id, input) : adminService.createCategory(input);
    },
    onSuccess: () => {
      toast.success("Category saved");
      void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      void qc.invalidateQueries({ queryKey: ["store", "categories"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={category.id ? `Edit ${category.name}` : "New category"} size="lg">
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name (English)" required>
            <Input {...form.register("name", { required: true })} />
          </Field>
          <Field label="Name (বাংলা)">
            <Input lang="bn" {...form.register("nameBn")} />
          </Field>
          <Field label="URL slug" hint="Leave empty to generate from the name">
            <Input {...form.register("slug")} />
          </Field>
          <Field label="Parent">
            <NativeSelect {...form.register("parentId")}>
              <option value="">— Top level —</option>
              {roots
                .filter((r) => r.id !== category.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </NativeSelect>
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
          <Field label="Sort order">
            <Input inputMode="numeric" {...form.register("sort")} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" loading={save.isPending}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

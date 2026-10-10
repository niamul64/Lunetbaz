"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { storeQueries } from "@/services/store.service";
import type { AddressInput } from "@/services/account.service";

const BD_PHONE = /^01[3-9]\d{8}$/;

const schema = z.object({
  label: z.string().min(1, "Give this address a name, e.g. Home"),
  name: z.string().min(2, "Enter the receiver's name"),
  phone: z.string().regex(BD_PHONE, "Enter a valid 11-digit mobile number (01XXXXXXXXX)"),
  division: z.string().min(1, "Select a division"),
  district: z.string().min(1, "Select a district"),
  area: z.string().min(1, "Select an area"),
  line: z.string().min(4, "Enter house, road and building details"),
  isDefault: z.boolean(),
});

export function AddressForm({ initial, onSubmit, submitting, submitLabel = "Save address" }: { initial?: Partial<AddressInput>; onSubmit: (v: AddressInput) => void; submitting?: boolean; submitLabel?: string }) {
  const { data } = useQuery(storeQueries.locations());
  const form = useForm<AddressInput>({
    resolver: zodResolver(schema),
    defaultValues: { label: "Home", name: "", phone: "", division: "", district: "", area: "", line: "", isDefault: false, ...initial },
  });
  const { register, setValue, formState } = form;
  const division = useWatch({ control: form.control, name: "division" });
  const district = useWatch({ control: form.control, name: "district" });
  const districts = data?.divisions.find((d) => d.name === division)?.districts ?? [];
  const areas = districts.find((d) => d.name === district)?.areas ?? [];
  const e = formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Full name" error={e.name?.message} required>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Mobile number" error={e.phone?.message} required>
        <Input inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" {...register("phone")} />
      </Field>
      <Field label="Division" error={e.division?.message} required>
        <NativeSelect
          {...register("division", {
            onChange: () => {
              setValue("district", "");
              setValue("area", "");
            },
          })}
        >
          <option value="">Select division</option>
          {data?.divisions.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="District / City" error={e.district?.message} required>
        <NativeSelect disabled={!division} {...register("district", { onChange: () => setValue("area", "") })}>
          <option value="">Select district</option>
          {districts.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Area / Thana" error={e.area?.message} required>
        <NativeSelect disabled={!district} {...register("area")}>
          <option value="">Select area</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Label" error={e.label?.message} required>
        <NativeSelect {...register("label")}>
          <option>Home</option>
          <option>Office</option>
          <option>Parents</option>
          <option>Other</option>
        </NativeSelect>
      </Field>
      <Field label="Address" error={e.line?.message} required className="sm:col-span-2">
        <Input autoComplete="street-address" placeholder="House 12, Road 7A, Block C" {...register("line")} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register("isDefault")} /> Make this my default address
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

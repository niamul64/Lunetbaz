"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RequirePermission } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DescriptionList, Skeleton } from "@/components/ui/display";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { P } from "@/lib/auth/permissions";
import { formatDate, humanize } from "@/lib/utils";
import { sellerQueries, sellerService } from "@/services/seller.service";
import { useSessionStore } from "@/stores/session.store";

export default function SellerSettingsPage() {
  return (
    <RequirePermission permission={P.sellerSettingsManage}>
      <Settings />
    </RequirePermission>
  );
}

function Settings() {
  const qc = useQueryClient();
  const { data: shop, isLoading } = useQuery(sellerQueries.shop());
  const form = useForm({ values: { name: shop?.name ?? "", description: shop?.description ?? "", area: shop?.location.area ?? "" } });
  const save = useMutation({
    mutationFn: (v: { name: string; description: string; area: string }) => sellerService.updateShop({ name: v.name, description: v.description, location: { ...shop!.location, area: v.area } }),
    onSuccess: (s) => {
      qc.setQueryData(sellerQueries.shop().queryKey, s);
      const session = useSessionStore.getState().session;
      if (session?.user.shop) useSessionStore.getState().updateUser({ shop: { ...session.user.shop, name: s.name } });
      toast.success("Shop profile saved");
    },
  });

  if (isLoading || !shop) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <PageHeader title="Shop settings" description="Your public shop profile and business details." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader title="Public profile" />
          <CardBody>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
              <Field label="Shop name" required>
                <Input {...form.register("name", { required: true })} />
              </Field>
              <Field label="About the shop">
                <Textarea rows={4} {...form.register("description")} />
              </Field>
              <Field label="Area" hint={`${shop.location.district}, ${shop.location.division}`}>
                <Input {...form.register("area")} />
              </Field>
              <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
                Save changes
              </Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Business & KYC" />
          <CardBody>
            <DescriptionList
              className="sm:grid-cols-1"
              items={[
                { label: "Shop status", value: <StatusBadge status={shop.status} /> },
                { label: "KYC", value: <StatusBadge status={shop.kyc.status} /> },
                { label: "Trade license", value: shop.kyc.tradeLicense },
                { label: "NID", value: shop.kyc.nid },
                { label: "Tier", value: shop.tier === "mall" ? "LunetMall" : "Standard" },
                { label: "Commission", value: `${shop.commissionRatePct}%` },
                { label: "Payout", value: `${humanize(shop.payout.method)} · ${shop.payout.accountNo}` },
                { label: "Strikes", value: shop.strikes },
                { label: "Joined", value: formatDate(shop.joinedAt) },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

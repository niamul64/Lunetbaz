"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CampaignForm } from "@/components/admin/campaign-form";
import { RequirePermission } from "@/components/common/guards";
import { PageHeader } from "@/components/common/page";
import { P } from "@/lib/auth/permissions";
import { adminService } from "@/services/admin.service";

export default function NewCampaignPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: adminService.createCampaign,
    onSuccess: (c) => {
      toast.success("Campaign created as draft");
      void qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
      router.replace(`/admin/campaigns/${c.id}`);
    },
  });

  return (
    <RequirePermission permission={P.campaignsManage}>
      <PageHeader back={{ href: "/admin/campaigns", label: "Campaigns" }} title="New campaign" description="Create a sale or fest. Shops can apply once you open registration." />
      <CampaignForm onSubmit={(c) => create.mutate(c)} submitting={create.isPending} />
    </RequirePermission>
  );
}

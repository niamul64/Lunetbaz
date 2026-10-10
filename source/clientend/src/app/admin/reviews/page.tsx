"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Rating } from "@/components/common/commerce";
import { DataTable, type Column } from "@/components/common/data-table";
import { RequirePermission } from "@/components/common/guards";
import { FilterPills, PageHeader } from "@/components/common/page";
import { StatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { useUrlState } from "@/hooks/use-url-state";
import { P } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { adminQueries, adminService } from "@/services/admin.service";
import type { Review } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "flagged", label: "Flagged" },
  { value: "published", label: "Published" },
  { value: "removed", label: "Removed" },
];

export default function AdminReviewsPage() {
  return (
    <RequirePermission permission={P.productsModerate}>
      <Reviews />
    </RequirePermission>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const { values, set, page } = useUrlState(["status"] as const);
  const query = useQuery({ ...adminQueries.reviews({ status: values.status, page }), placeholderData: keepPreviousData });
  const moderate = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "publish" | "remove" }) => adminService.moderateReview(id, decision),
    onSuccess: () => {
      toast.success("Review updated");
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });

  const columns: Column<Review & { productName: string }>[] = [
    {
      key: "review",
      header: "Review",
      cell: (r) => (
        <div className="max-w-xl space-y-1">
          <Rating value={r.rating} />
          <p className="font-medium">{r.title}</p>
          <p className="text-sm text-muted-foreground">{r.body}</p>
          <p className="text-xs text-muted-foreground">
            {r.userName} on <span className="text-foreground">{r.productName}</span> · {formatDate(r.createdAt)}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          {r.status !== "published" && (
            <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, decision: "publish" })}>
              Publish
            </Button>
          )}
          {r.status !== "removed" && (
            <Button size="sm" variant="outline" className="text-danger" onClick={() => moderate.mutate({ id: r.id, decision: "remove" })}>
              Remove
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Reviews" description="Remove spam, links and abusive content. Genuine negative reviews must stay published." />
      <Card>
        <div className="border-b border-border p-4">
          <FilterPills options={TABS} value={values.status ?? ""} onChange={(v) => set({ status: v })} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          error={query.error}
          meta={query.data?.meta}
          onPageChange={(p) => set({ page: p })}
          empty={{ title: "No reviews here" }}
        />
      </Card>
    </>
  );
}

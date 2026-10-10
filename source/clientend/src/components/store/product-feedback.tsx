"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { Rating } from "@/components/common/commerce";
import { Media } from "@/components/common/media";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, Skeleton } from "@/components/ui/display";
import { Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { storeQueries, storeService } from "@/services/store.service";
import { useSession } from "@/stores/session.store";

export function ProductReviews({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const [withMedia, setWithMedia] = useState(false);
  const { data, isLoading } = useQuery(storeQueries.reviews(productId, page, withMedia));

  if (isLoading || !data)
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  const { summary } = data;
  const max = Math.max(...Object.values(summary.distribution), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-8">
        <div className="text-center">
          <p className="text-4xl font-semibold">{summary.average.toFixed(1)}</p>
          <Rating value={summary.average} size="md" />
          <p className="mt-1 text-xs text-muted-foreground">{summary.total} ratings</p>
        </div>
        <ul className="min-w-56 flex-1 space-y-1">
          {([5, 4, 3, 2, 1] as const).map((r) => (
            <li key={r} className="flex items-center gap-2 text-xs">
              <span className="inline-flex w-6 items-center gap-0.5">
                {r} <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(summary.distribution[r] / max) * 100}%` }} />
              </span>
              <span className="w-6 text-right text-muted-foreground">{summary.distribution[r]}</span>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withMedia} onChange={(e) => (setWithMedia(e.target.checked), setPage(1))} className="accent-[var(--primary)]" />
          With photos only
        </label>
      </div>

      {data.data.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews from customers who bought this product will appear here." />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.map((r) => (
            <li key={r.id} className="space-y-2 py-4">
              <div className="flex items-center gap-2">
                <Avatar name={r.userName} className="size-7" />
                <span className="text-sm font-medium">{r.userName}</span>
                {r.verifiedPurchase && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-success">
                    <BadgeCheck className="size-3.5" aria-hidden /> Verified purchase
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              <Rating value={r.rating} />
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.body}</p>
              {r.images.length > 0 && (
                <div className="flex gap-2">
                  {r.images.map((img, i) => (
                    <Media key={i} src={img} alt={`Review photo ${i + 1}`} className="size-16 rounded-md" iconClassName="size-6" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Variant: {r.variant}</p>
              {r.sellerReply && (
                <p className="rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">Seller response: </span>
                  {r.sellerReply}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProductQuestions({ productId }: { productId: string }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(storeQueries.questions(productId));
  const [text, setText] = useState("");
  const ask = useMutation({
    mutationFn: () => storeService.askQuestion(productId, text),
    onSuccess: () => {
      setText("");
      toast.success("Question submitted. The seller will answer soon.");
      void qc.invalidateQueries({ queryKey: storeQueries.questions(productId).queryKey });
    },
  });

  return (
    <div className="space-y-4">
      {user ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length >= 5) ask.mutate();
          }}
        >
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the seller about this product" aria-label="Your question" className="min-h-16" maxLength={300} />
          <Button type="submit" size="sm" loading={ask.isPending} disabled={text.trim().length < 5}>
            Ask question
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>{" "}
          to ask the seller a question.
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : !data?.length ? (
        <EmptyState icon={MessageSquare} title="No questions yet" />
      ) : (
        <ul className="divide-y divide-border">
          {data.map((q) => (
            <li key={q.id} className="space-y-1.5 py-3 text-sm">
              <p>
                <span className="mr-2 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">Q</span>
                {q.question}
                <span className="ml-2 text-xs text-muted-foreground">
                  {q.userName} · {formatDate(q.createdAt)}
                </span>
              </p>
              {q.answer ? (
                <p className="text-muted-foreground">
                  <span className="mr-2 rounded bg-success-soft px-1.5 py-0.5 text-xs font-semibold text-success">A</span>
                  {q.answer} <span className="text-xs">— {q.answeredBy}</span>
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground">Awaiting seller response</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

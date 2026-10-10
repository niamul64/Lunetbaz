import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Camera, ClipboardCheck, FileText, Lock, RotateCcw, Users } from "lucide-react";
import { VerifiedBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";

export const metadata: Metadata = {
  title: "Lunetbuz Verified – 100% genuine, exactly as shown",
  description: "Verified products are physically inspected by Lunetbuz. Their photos and descriptions are locked, and you get your money back if anything is not genuine.",
};

const steps = [
  { icon: FileText, title: "Seller applies", text: "The shop submits proof: brand authorization, invoices, import documents." },
  { icon: ClipboardCheck, title: "Physical inspection", text: "A Lunetbuz officer examines the real item at our hub or the seller's warehouse." },
  { icon: Users, title: "Second approval", text: "A different officer must approve, so no one can grant a badge alone." },
  { icon: Lock, title: "Listing locked", text: "Photos, videos and description are frozen. Only price and stock can change." },
];

export default function VerifiedPage() {
  return (
    <div className="container-page max-w-4xl space-y-10 py-10">
      <section className="space-y-4 text-center">
        <VerifiedBadge size="md" className="mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shop with complete confidence</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          When a product shows the Lunetbuz Verified badge, our team has checked the real item and confirms it is 100% original and exactly as shown in its photos and
          description.
        </p>
        <Button asChild variant="verified" size="lg">
          <Link href="/search?verified=1">
            <BadgeCheck /> Shop Verified products
          </Link>
        </Button>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-xl font-semibold">
          How a product gets verified
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((s, i) => (
            <Card key={s.title} className="flex gap-4 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-verified-soft text-verified">
                <s.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">
                  {i + 1}. {s.title}
                </p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </Card>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: RotateCcw, title: "Money-back guarantee", text: "Not genuine or not as shown? Get a full refund." },
          { icon: Camera, title: "Random audits", text: "Mystery purchases and re-checks keep sellers honest." },
          { icon: BadgeCheck, title: "Renewed yearly", text: "Badges expire after 12 months unless re-verified." },
        ].map((f) => (
          <Card key={f.title} className="p-5">
            <f.icon className="mb-2 size-6 text-verified" aria-hidden />
            <p className="font-medium">{f.title}</p>
            <p className="text-sm text-muted-foreground">{f.text}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

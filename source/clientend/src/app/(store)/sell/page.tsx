import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Megaphone, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";

export const metadata: Metadata = { title: "Sell on Lunetbuz", description: "Reach customers in all 64 districts. Weekly payouts to bKash or bank." };

export default function SellPage() {
  return (
    <div className="container-page space-y-10 py-10">
      <section className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Grow your business with Lunetbuz</h1>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">Open your shop in minutes, reach customers in all 64 districts and get paid weekly.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="outline" className="border-white bg-white text-primary hover:bg-white/90">
            <Link href="/login?next=/seller">Open Seller Center</Link>
          </Button>
        </div>
      </section>
      <section id="campaigns" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Megaphone, title: "Join campaigns", text: "Apply your products to 11.11, Eid, Puja fests and flash sales." },
          { icon: BadgeCheck, title: "Get Verified", text: "Earn the Lunetbuz Verified badge and rank higher in search." },
          { icon: Truck, title: "We handle delivery", text: "Pathao, RedX, Steadfast & Paperfly integrated." },
          { icon: Wallet, title: "Weekly payouts", text: "To bKash, Nagad or your bank account, with clear statements." },
        ].map((f) => (
          <Card key={f.title} className="p-5">
            <f.icon className="mb-2 size-6 text-primary" aria-hidden />
            <p className="font-medium">{f.title}</p>
            <p className="text-sm text-muted-foreground">{f.text}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

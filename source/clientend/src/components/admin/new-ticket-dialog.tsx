"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { adminService } from "@/services/admin.service";

interface Values {
  subject: string;
  category: string;
  priority: string;
  channel: string;
  orderId: string;
  message: string;
}

/** Call-center flow: log a call or complaint against a customer (and optionally an order). */
export function NewTicketDialog({
  open,
  onOpenChange,
  customerId,
  orders,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string;
  orders: { id: string; orderNo: string }[];
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const form = useForm<Values>({ defaultValues: { subject: "", category: "order_status", priority: "normal", channel: "phone", orderId: "", message: "" } });
  const create = useMutation({
    mutationFn: (v: Values) => adminService.createTicket({ ...v, customerId, orderId: v.orderId || undefined }),
    onSuccess: (t) => {
      toast.success(`Ticket ${t.ticketNo} created`);
      void qc.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
      form.reset();
      router.push(`/admin/tickets/${t.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New support ticket" size="lg">
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject" required className="sm:col-span-2" error={form.formState.errors.subject && "Required"}>
            <Input {...form.register("subject", { required: true })} />
          </Field>
          <Field label="Category">
            <NativeSelect {...form.register("category")}>
              <option value="order_status">Order status</option>
              <option value="delivery">Delivery</option>
              <option value="refund">Refund</option>
              <option value="authenticity">Authenticity / fake product</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
          <Field label="Priority">
            <NativeSelect {...form.register("priority")}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </NativeSelect>
          </Field>
          <Field label="Channel">
            <NativeSelect {...form.register("channel")}>
              <option value="phone">Phone</option>
              <option value="chat">Chat</option>
              <option value="email">Email</option>
            </NativeSelect>
          </Field>
          <Field label="Related order">
            <NativeSelect {...form.register("orderId")}>
              <option value="">None</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNo}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Notes" required className="sm:col-span-2" error={form.formState.errors.message && "Required"}>
            <Textarea rows={4} placeholder="What did the customer report? What did you do?" {...form.register("message", { required: true })} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending}>
              Create ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

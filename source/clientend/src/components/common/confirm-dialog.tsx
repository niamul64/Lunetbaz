"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  /** Ask for a reason (required unless `reasonOptional`). */
  reason?: { label: string; placeholder?: string; optional?: boolean };
  onConfirm: (reason: string) => Promise<unknown> | unknown;
}

/** Confirmation for consequential actions, optionally capturing a reason for the audit log. */
export function ConfirmDialog({ trigger, title, description, confirmLabel = "Confirm", variant = "default", reason, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const invalid = reason && !reason.optional && text.trim().length < 3;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(text.trim());
      setOpen(false);
      setText("");
    } catch {
      // Error toast is shown by the mutation cache; keep the dialog open.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={variant} onClick={confirm} loading={busy} disabled={Boolean(invalid)}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {reason ? (
          <Field label={reason.label} required={!reason.optional}>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} autoFocus />
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">This action will be recorded in the audit log.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

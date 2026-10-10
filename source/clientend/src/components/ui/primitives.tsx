"use client";

/**
 * Thin, styled wrappers around Radix primitives (accessible by default).
 */
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive, Tabs as TabsPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Checkbox */

export const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer size-4.5 shrink-0 rounded-[5px] border border-input bg-card shadow-xs transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = "Checkbox";

/* ---------------------------------------------------------------- Switch */

export const Switch = forwardRef<ElementRef<typeof SwitchPrimitive.Root>, ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5.5 w-10 shrink-0 items-center rounded-full border-2 border-transparent bg-input transition-colors data-[state=checked]:bg-primary disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/* ---------------------------------------------------------------- RadioGroup */

export const RadioGroup = forwardRef<ElementRef<typeof RadioPrimitive.Root>, ComponentPropsWithoutRef<typeof RadioPrimitive.Root>>(({ className, ...props }, ref) => (
  <RadioPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

/** A card-style radio option. */
export function RadioCard({ value, children, className, disabled }: { value: string; children: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <RadioPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft/50 data-[state=checked]:ring-1 data-[state=checked]:ring-primary disabled:opacity-50",
        className,
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card">
        <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary" />
      </span>
      {children}
    </RadioPrimitive.Item>
  );
}

/* ---------------------------------------------------------------- Tabs */

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("scrollbar-none flex gap-1 overflow-x-auto border-b border-border", className)} {...props} />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary",
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<ElementRef<typeof TabsPrimitive.Content>, ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("pt-4 focus-visible:outline-none", className)} {...props} />,
);
TabsContent.displayName = "TabsContent";

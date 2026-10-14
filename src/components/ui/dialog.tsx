"use client";

import type { ComponentProps, ReactNode } from "react";
import { AlertDialog, Dialog as RadixDialog } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Spinner } from "./spinner";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;

export function DialogContent({
  className,
  overlayClassName,
  children,
  ...props
}: ComponentProps<typeof RadixDialog.Content> & { overlayClassName?: string }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn("fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-[3px] data-[state=open]:animate-fade-in", overlayClassName)}
      />
      <RadixDialog.Content
        className={cn("fixed z-50 outline-none data-[state=open]:animate-scale-in", className)}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

type ConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  tone?: "danger" | "default";
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, busy, tone = "danger" }: ConfirmProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-ink-950/60 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-float outline-none data-[state=open]:animate-scale-in">
          <AlertDialog.Title className="font-display text-xl font-semibold text-stone-900">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-stone-600">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={busy}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
              {busy && <Spinner />}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

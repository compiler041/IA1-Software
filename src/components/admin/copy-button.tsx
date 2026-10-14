"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copy",
  successMessage = "Copied to clipboard",
  variant = "secondary",
  size = "sm",
}: {
  value: string;
  label?: string;
  successMessage?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy isn't available here. Please select the text and copy it manually.");
    }
  };

  return (
    <Button variant={variant} size={size} onClick={copy}>
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
      {label}
    </Button>
  );
}

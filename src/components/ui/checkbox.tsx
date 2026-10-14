"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
  id?: string;
};

export function Checkbox({ checked, onCheckedChange, className, ...props }: Props) {
  return (
    <RadixCheckbox.Root
      {...props}
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-stone-300 bg-white shadow-[0_1px_1px_rgb(0_0_0/0.04)] outline-none transition-colors hover:border-stone-400 focus-visible:ring-4 focus-visible:ring-brand-500/20 data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-700 data-[state=indeterminate]:border-brand-700 data-[state=indeterminate]:bg-brand-700",
        className,
      )}
    >
      <RadixCheckbox.Indicator className="text-white">
        {checked === "indeterminate" ? (
          <Minus className="size-3" strokeWidth={3.5} />
        ) : (
          <Check className="size-3" strokeWidth={3.5} />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}

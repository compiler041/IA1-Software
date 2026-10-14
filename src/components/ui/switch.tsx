"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Switch({ className, ...props }: Props) {
  return (
    <RadixSwitch.Root
      {...props}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-stone-300 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 data-[state=checked]:bg-brand-700 disabled:opacity-60",
        className,
      )}
    >
      <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 data-[state=checked]:translate-x-[22px]" />
    </RadixSwitch.Root>
  );
}

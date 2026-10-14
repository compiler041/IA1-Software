import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary:
    "bg-brand-700 text-white shadow-brand hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-700/60 disabled:shadow-none",
  dark: "bg-ink-900 text-white shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_8px_20px_-10px_rgb(15_11_17/0.6)] hover:bg-ink-800 active:bg-ink-950",
  secondary:
    "bg-white text-stone-800 ring-1 ring-stone-900/10 shadow-[0_1px_2px_rgb(28_25_23/0.05)] hover:bg-stone-50 hover:ring-stone-900/15 active:bg-stone-100",
  ghost: "text-stone-600 hover:bg-stone-900/5 hover:text-stone-900 active:bg-stone-900/10",
  danger: "bg-red-600 text-white shadow-[0_8px_20px_-10px_rgb(220_38_38/0.7)] hover:bg-red-700 active:bg-red-800",
  "danger-ghost": "text-red-600 hover:bg-red-50 active:bg-red-100",
  gold: "bg-gold-300 text-ink-950 shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_10px_24px_-12px_rgb(196_146_52/0.9)] hover:bg-gold-200",
} as const;

const SIZES = {
  xs: "h-7 gap-1 rounded-lg px-2.5 text-xs",
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-xl px-6 text-[15px]",
  icon: "size-9 rounded-xl",
  "icon-sm": "size-8 rounded-lg",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,box-shadow,color,transform] duration-150 outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.985] [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

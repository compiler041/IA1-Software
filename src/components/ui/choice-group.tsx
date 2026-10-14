"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Choice = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
};

type Props = {
  id: string;
  value: string;
  options: readonly Choice[];
  onChange: (value: string) => void;
  invalid?: boolean;
  columns?: string;
  variant?: "pill" | "card";
  disabled?: boolean;
};

/** Accessible radio group rendered as selectable pills or cards (arrow keys move the selection). */
export function ChoiceGroup({ id, value, options, onChange, invalid, columns, variant = "pill", disabled }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !backward) return;
    event.preventDefault();
    const next = (index + (forward ? 1 : -1) + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      aria-invalid={invalid || undefined}
      id={id}
      className={cn("grid gap-2.5", columns ?? "grid-cols-2 sm:grid-cols-4")}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const focusable = selected || (selectedIndex === -1 && index === 0);
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={focusable ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "group relative flex min-w-0 rounded-xl border bg-white text-left outline-none transition-all duration-150 focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:opacity-60",
              variant === "pill"
                ? "h-[3.25rem] flex-col items-center justify-center px-3 text-center"
                : "items-start gap-3 p-3.5",
              selected
                ? "border-brand-600 bg-brand-50/60 text-brand-900 shadow-[0_0_0_1px_var(--color-brand-600),0_8px_20px_-12px_rgb(130_38_59/0.45)]"
                : invalid
                  ? "border-red-300 hover:border-red-400"
                  : "border-stone-300/90 hover:border-stone-400 hover:bg-stone-50/60",
            )}
          >
            {option.icon && (
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg transition-colors [&_svg]:size-[18px]",
                  selected ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-500 group-hover:bg-stone-200/70",
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="min-w-0">
              <span className={cn("block font-semibold tracking-tight", variant === "pill" ? "text-[15px]" : "text-[14px]")}>
                {option.label}
              </span>
              {option.description && (
                <span
                  className={cn(
                    "block text-xs leading-4",
                    selected ? "text-brand-700/80" : "text-stone-500",
                    variant === "pill" ? "mt-0.5" : "mt-1",
                  )}
                >
                  {option.description}
                </span>
              )}
            </span>
            {selected && (
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-brand-700 text-white animate-pop">
                <Check className="size-2.5" strokeWidth={4} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

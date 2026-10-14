import type { ComponentProps, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputBase =
  "block w-full rounded-xl border bg-white text-[15px] text-stone-900 placeholder:text-stone-400 shadow-[0_1px_2px_rgb(28_25_23/0.04)] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-70";

export const inputTone = (invalid?: boolean) =>
  invalid
    ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
    : "border-stone-300/90 hover:border-stone-400";

type FieldProps = {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  /** Use for groups (radio buttons) where a <label for> makes no sense. */
  asGroup?: boolean;
};

export function Field({ id, label, required, hint, error, aside, className, children, asGroup }: FieldProps) {
  const LabelTag = asGroup ? "span" : "label";
  return (
    <div className={cn("min-w-0 space-y-2", className)} data-field={id}>
      <div className="flex items-baseline justify-between gap-3">
        <LabelTag
          id={`${id}-label`}
          {...(asGroup ? {} : { htmlFor: id })}
          className="text-[14px] font-medium leading-5 text-stone-800"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-brand-600" aria-hidden="true">
              *
            </span>
          )}
        </LabelTag>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-[13px] leading-5 text-red-600 animate-fade-in">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-5 text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = ComponentProps<"input"> & {
  invalid?: boolean;
  icon?: ReactNode;
  prefix?: string;
  suffix?: ReactNode;
};

export function TextInput({ invalid, icon, prefix, suffix, className, ...props }: TextInputProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-400 [&_svg]:size-[18px]">
          {icon}
        </span>
      )}
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-10 flex items-center text-[15px] font-medium text-stone-500">
          {prefix}
        </span>
      )}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          inputTone(invalid),
          "h-12 px-3.5",
          icon && "pl-10",
          prefix && "pl-[4.6rem]",
          suffix && "pr-11",
          className,
        )}
        {...props}
      />
      {suffix && <span className="absolute inset-y-0 right-2 flex items-center">{suffix}</span>}
    </div>
  );
}

export function TextArea({ invalid, className, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(inputBase, inputTone(invalid), "min-h-32 resize-y px-3.5 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9;
  return (
    <span className={cn("text-xs tabular", near ? "text-amber-600" : "text-stone-400")}>
      {value.length.toLocaleString("en-IN")} / {max.toLocaleString("en-IN")}
    </span>
  );
}

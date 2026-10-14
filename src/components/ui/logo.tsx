import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_8px_20px_-8px_rgb(130_38_59/0.8)] ring-1 ring-white/10",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="size-[70%]">
        <path
          d="M32 13l4.9 9.9 10.9 1.6-7.9 7.7 1.9 10.9L32 38l-9.8 5.1 1.9-10.9-7.9-7.7 10.9-1.6z"
          fill="#f5edd6"
        />
        <path d="M22 49h20" stroke="#dfc178" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

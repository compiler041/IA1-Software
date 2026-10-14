import type { ReactNode } from "react";
import type { ActivityLevel, Branch } from "@/lib/form-config";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        "bg-stone-100 text-stone-700 ring-stone-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const LEVEL_STYLES: Record<ActivityLevel, { badge: string; dot: string; bar: string }> = {
  University: { badge: "bg-stone-100 text-stone-700 ring-stone-200", dot: "bg-stone-400", bar: "bg-stone-400" },
  State: { badge: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500", bar: "bg-teal-500" },
  National: { badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500", bar: "bg-indigo-500" },
  International: { badge: "bg-gold-50 text-gold-800 ring-gold-300", dot: "bg-gold-500", bar: "bg-gold-500" },
};

export function LevelBadge({ level, className }: { level: ActivityLevel; className?: string }) {
  const style = LEVEL_STYLES[level];
  return (
    <Badge className={cn(style.badge, className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {level}
    </Badge>
  );
}

const BRANCH_DOTS: Record<Branch, string> = {
  EXCP: "bg-brand-500",
  CSBS: "bg-sky-500",
  VLSI: "bg-emerald-500",
};

export function ClassBadges({ year, branch }: { year: string; branch: Branch }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge className="bg-white tabular">{year}</Badge>
      <Badge className="bg-white">
        <span className={cn("size-1.5 rounded-full", BRANCH_DOTS[branch])} />
        {branch}
      </Badge>
    </span>
  );
}

export function branchDot(branch: Branch) {
  return BRANCH_DOTS[branch];
}

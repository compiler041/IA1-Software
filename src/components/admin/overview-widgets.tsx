import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleCheck, CirclePause, TriangleAlert } from "lucide-react";
import { LEVEL_STYLES, LevelBadge, branchDot } from "@/components/ui/badge";
import { formatLongDate, formatShortDate, formatTimestamp } from "@/lib/dates";
import { BRANCHES, describeCategory, type ActivityLevel, type Branch } from "@/lib/form-config";
import type { CountItem, Overview } from "@/lib/stats";
import type { Submission } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

export function StatCard({
  label,
  value,
  hint,
  icon,
  featured,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 shadow-card ring-1",
        featured ? "bg-ink-900 text-white ring-white/5" : "bg-white ring-stone-900/5",
      )}
    >
      {featured && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-brand-600/40 blur-3xl" />
        </>
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p className={cn("text-sm font-medium", featured ? "text-white/65" : "text-stone-500")}>{label}</p>
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl ring-1 [&_svg]:size-[18px]",
            featured ? "bg-gold-300/10 text-gold-200 ring-gold-300/20" : "bg-brand-50 text-brand-700 ring-brand-100",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="relative mt-3 font-display text-[40px] font-semibold leading-none tracking-tight tabular">{value}</p>
      <div className={cn("relative mt-3 text-xs", featured ? "text-white/55" : "text-stone-500")}>{hint}</div>
    </div>
  );
}

export function Trend({ current, previous, dark }: { current: number; previous: number; dark?: boolean }) {
  const diff = current - previous;
  if (diff === 0) return <span>Same as the previous 7 days</span>;
  return (
    <span>
      <span className={cn("font-semibold", diff > 0 ? (dark ? "text-emerald-300" : "text-emerald-600") : dark ? "text-red-300" : "text-red-600")}>
        {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}
      </span>{" "}
      vs the previous 7 days
    </span>
  );
}

export function StatusBanner({
  accepting,
  deadline,
  today,
}: {
  accepting: boolean;
  deadline: string;
  today: string;
}) {
  const daysLeft = Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
  let tone: "ok" | "warn" | "closed" = "ok";
  let icon = <CircleCheck className="size-5" />;
  let title = "Accepting responses";
  let text: ReactNode = `${daysLeft === 0 ? "Today is the last day" : `${daysLeft} days left`} · Deadline ${formatLongDate(deadline)}`;

  if (!accepting) {
    tone = "closed";
    icon = <CirclePause className="size-5" />;
    title = "The form is closed";
    text = "Students see your closed message instead of the form.";
  } else if (daysLeft < 0) {
    tone = "warn";
    icon = <TriangleAlert className="size-5" />;
    title = "The deadline has passed, but the form is still open";
    text = `The deadline was ${formatLongDate(deadline)}. Close the form or set a new deadline in Settings.`;
  } else if (daysLeft <= 7) {
    tone = "warn";
    icon = <CalendarClock className="size-5" />;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center",
        tone === "ok" && "border-emerald-200 bg-emerald-50/70 text-emerald-900",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "closed" && "border-stone-200 bg-stone-100/80 text-stone-800",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0">{icon}</span>
        <p className="min-w-0 text-sm">
          <span className="font-semibold">{title}</span>
          <span className="opacity-80"> · {text}</span>
        </p>
      </div>
      <Link
        href="/admin/settings"
        className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg px-2 py-1 text-sm font-medium underline-offset-4 hover:underline sm:self-auto"
      >
        Form settings
        <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}

export function MonthChart({ data }: { data: Overview["byMonth"] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex h-60 items-stretch gap-1.5 sm:gap-2.5">
      {data.map((d, index) => {
        const height = d.value ? Math.max(4, (d.value / max) * 100) : 0;
        return (
          <div key={d.key} className="group flex min-w-0 flex-1 flex-col items-center gap-2" title={`${d.label} ${d.year}: ${d.value}`}>
            <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-lg bg-stone-100/70">
              <div
                className={cn(
                  "relative w-full rounded-lg transition-[filter] duration-200 group-hover:brightness-110",
                  d.value === peak && peak > 0
                    ? "bg-gradient-to-t from-brand-800 to-brand-500"
                    : "bg-gradient-to-t from-brand-700/85 to-brand-400/85",
                )}
                style={{ height: `${height}%` }}
              />
              {d.value > 0 && (
                <span
                  className="absolute inset-x-0 text-center text-[11px] font-semibold tabular text-stone-700"
                  style={{ bottom: `calc(${height}% + 4px)` }}
                >
                  {height < 86 ? d.value : ""}
                </span>
              )}
              {d.value > 0 && height >= 86 && (
                <span className="absolute inset-x-0 top-1.5 text-center text-[11px] font-semibold tabular text-white">
                  {d.value}
                </span>
              )}
            </div>
            <div className="text-center leading-tight">
              <p className="text-[11px] font-medium text-stone-600">{d.label}</p>
              <p className={cn("text-[10px] text-stone-400", !(index === 0 || d.label === "Jan") && "invisible")}>{d.year}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LevelBreakdown({ items, total }: { items: CountItem[]; total: number }) {
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-stone-100">
        {items.map((item) =>
          item.value ? (
            <div
              key={item.key}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", LEVEL_STYLES[item.key as ActivityLevel].bar)}
              style={{ width: `${pct(item.value, total)}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-6 space-y-4">
        {[...items].reverse().map((item) => (
          <li key={item.key}>
            <Link
              href={`/admin/responses?level=${encodeURIComponent(item.key)}`}
              className="group flex items-center gap-3 text-sm"
            >
              <span className={cn("size-2.5 rounded-full", LEVEL_STYLES[item.key as ActivityLevel].dot)} />
              <span className="flex-1 font-medium text-stone-700 group-hover:text-brand-700">{item.label}</span>
              <span className="font-semibold tabular text-stone-900">{item.value}</span>
              <span className="w-10 text-right text-xs tabular text-stone-400">{pct(item.value, total)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({
  items,
  total,
  hrefFor,
  colorFor,
  describe,
}: {
  items: CountItem[];
  total: number;
  hrefFor?: (item: CountItem) => string;
  colorFor?: (item: CountItem) => string;
  describe?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const { title, hint } = describe ? describeCategory(item.label) : { title: item.label, hint: null };
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-stone-700 group-hover:text-brand-700" title={item.label}>
                {title}
                {hint && <span className="ml-1.5 font-normal text-stone-400">{hint}</span>}
              </span>
              <span className="shrink-0 tabular">
                <span className="font-semibold text-stone-900">{item.value}</span>
                <span className="ml-2 inline-block w-9 text-right text-xs text-stone-400">{pct(item.value, total)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className={cn("h-full rounded-full transition-[width] duration-700", colorFor?.(item) ?? "bg-brand-600")}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={item.key}>
            {hrefFor ? (
              <Link href={hrefFor(item)} className="group block">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ClassMatrix({ matrix, branchTotals, total }: Pick<Overview, "matrix" | "branchTotals"> & { total: number }) {
  const max = Math.max(1, ...matrix.flatMap((row) => BRANCHES.map((b) => row.counts[b])));
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[26rem] border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th className="w-20 text-left text-xs font-medium text-stone-400">Year</th>
            {BRANCHES.map((b) => (
              <th key={b} className="text-center text-xs font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", branchDot(b))} />
                  {b}
                </span>
              </th>
            ))}
            <th className="w-20 text-center text-xs font-medium text-stone-400">Total</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.year}>
              <th className="text-left font-semibold text-stone-700">{row.year}</th>
              {BRANCHES.map((b: Branch) => {
                const value = row.counts[b];
                const intensity = value / max;
                return (
                  <td key={b} className="p-0">
                    <Link
                      href={`/admin/responses?year=${row.year}&branch=${b}`}
                      title={`${row.year} ${b}: ${value} submissions`}
                      className={cn(
                        "grid h-12 place-items-center rounded-xl font-semibold tabular ring-1 ring-inset transition-transform hover:scale-[1.04]",
                        value === 0 ? "text-stone-300 ring-stone-100" : intensity > 0.45 ? "text-white ring-transparent" : "text-brand-900 ring-brand-100",
                      )}
                      style={{ backgroundColor: value ? `rgb(130 38 59 / ${0.08 + intensity * 0.82})` : "#fafaf9" }}
                    >
                      {value}
                    </Link>
                  </td>
                );
              })}
              <td className="text-center font-semibold tabular text-stone-900">{row.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="pt-1 text-left text-xs font-medium text-stone-400">Total</th>
            {BRANCHES.map((b) => (
              <td key={b} className="pt-1 text-center font-semibold tabular text-stone-900">
                {branchTotals[b]}
              </td>
            ))}
            <td className="pt-1 text-center">
              <span className="rounded-lg bg-ink-900 px-2.5 py-1 font-semibold tabular text-white">{total}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function LatestList({ items }: { items: Submission[] }) {
  return (
    <ul className="-mx-2 divide-y divide-stone-100">
      {items.map((s) => (
        <li key={s.id}>
          <Link
            href={`/admin/responses?open=${s.id}`}
            className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-stone-50"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-semibold text-brand-800">
              {initials(s.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-stone-900">{s.activityName}</span>
              <span className="block truncate text-xs text-stone-500">
                {s.name} · {s.year} {s.branch} · {formatShortDate(s.startDate)}
              </span>
            </span>
            <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              <LevelBadge level={s.activityLevel} />
              <span className="text-[11px] text-stone-400">{formatTimestamp(s.createdAt)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

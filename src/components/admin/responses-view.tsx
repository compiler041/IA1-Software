"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileArchive,
  FileSpreadsheet,
  Inbox,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Popover } from "radix-ui";
import { toast } from "sonner";
import { Badge, ClassBadges, LevelBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateField } from "@/components/ui/date-field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { anyToIso, formatDateRange, formatTimestamp, isoToDmy } from "@/lib/dates";
import { BRANCHES, LEVELS, YEARS, describeCategory } from "@/lib/form-config";
import { EMPTY_FILTERS, activeFilterCount, applyFilters, sortSubmissions, type ResponseFilters, type SortDir, type SortKey } from "@/lib/filters";
import { findDuplicateIds } from "@/lib/stats";
import type { Submission } from "@/lib/types";
import { cn, formatRef, initials, plural } from "@/lib/utils";
import { ExportMenu, exportExcel, exportZip } from "./export-menu";
import { PageHeader } from "./page-header";
import { SubmissionViewer } from "./submission-viewer";

type Props = {
  submissions: Submission[];
  categories: string[];
  initialFilters: ResponseFilters;
  initialOpenId: string | null;
};

const SORTS: { key: SortKey; dir: SortDir; label: string }[] = [
  { key: "submitted", dir: "desc", label: "Newest first" },
  { key: "submitted", dir: "asc", label: "Oldest first" },
  { key: "class", dir: "asc", label: "Class (Year, Branch)" },
  { key: "rollNo", dir: "asc", label: "Roll No" },
  { key: "name", dir: "asc", label: "Name A–Z" },
  { key: "level", dir: "desc", label: "Level (highest first)" },
  { key: "date", dir: "desc", label: "Activity date (latest)" },
];

const PAGE_SIZES = [25, 50, 100];

export async function deleteResponses(ids: string[]): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/submissions/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not delete.");
      return false;
    }
    toast.success(`${plural(data?.deleted ?? ids.length, "response")} deleted`);
    return true;
  } catch {
    toast.error("Network error while deleting.");
    return false;
  }
}

function MultiFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  wide,
}: {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  render?: (o: T) => React.ReactNode;
  wide?: boolean;
}) {
  const active = value.length > 0;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
            active ? "border-brand-300 bg-brand-50 text-brand-800" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
          )}
        >
          {label}
          {active && (
            <span className="grid min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[11px] text-white">{value.length}</span>
          )}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "z-50 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-float outline-none data-[state=open]:animate-scale-in",
            wide ? "w-[24rem] max-w-[calc(100vw-1.5rem)]" : "w-56",
          )}
        >
          <div className="scrollbar-thin max-h-80 overflow-y-auto">
            {options.map((o) => {
              const checked = value.includes(o);
              return (
                <label key={o} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-sm hover:bg-stone-50">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => onChange(c ? [...value, o] : value.filter((v) => v !== o))}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-stone-800">{render ? render(o) : o}</span>
                </label>
              );
            })}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-stone-500 hover:bg-stone-50"
            >
              Clear selection
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ResponsesView({ submissions, categories, initialFilters, initialOpenId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<ResponseFilters>(initialFilters);
  const [sortIndex, setSortIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const allCategories = useMemo(() => {
    const list = [...categories];
    for (const s of submissions) if (!list.includes(s.activityCategory)) list.push(s.activityCategory);
    return list;
  }, [categories, submissions]);

  const sort = SORTS[sortIndex];
  const visible = useMemo(
    () => sortSubmissions(applyFilters(submissions, filters), sort.key, sort.dir),
    [submissions, filters, sort],
  );
  const duplicates = useMemo(() => findDuplicateIds(submissions), [submissions]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = visible.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const filterCount = activeFilterCount(filters);
  const existingSelected = useMemo(() => {
    const ids = new Set(submissions.map((s) => s.id));
    return [...selected].filter((id) => ids.has(id));
  }, [selected, submissions]);

  const update = (patch: Partial<ResponseFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t?.tagName !== "INPUT" && t?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openViewer = useCallback(
    (id: string | null) => {
      setOpenId(id);
      const url = id ? `${pathname}?open=${id}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [pathname],
  );

  const onDelete = async (ids: string[]) => {
    const ok = await deleteResponses(ids);
    if (ok) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      router.refresh();
    }
    return ok;
  };

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));
  const someSelected = existingSelected.length > 0;
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((s) => s.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const students = useMemo(() => new Set(visible.map((s) => s.rollNo.toUpperCase())).size, [visible]);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.years.length) chips.push({ key: "y", label: `Year: ${filters.years.join(", ")}`, clear: () => update({ years: [] }) });
  if (filters.branches.length)
    chips.push({ key: "b", label: `Branch: ${filters.branches.join(", ")}`, clear: () => update({ branches: [] }) });
  if (filters.levels.length) chips.push({ key: "l", label: `Level: ${filters.levels.join(", ")}`, clear: () => update({ levels: [] }) });
  if (filters.categories.length)
    chips.push({
      key: "c",
      label: `Type: ${filters.categories.map((c) => describeCategory(c).title).join(", ")}`,
      clear: () => update({ categories: [] }),
    });
  if (filters.lyExcp !== "all")
    chips.push({ key: "x", label: `LY EXCP: ${filters.lyExcp === "yes" ? "Yes" : "No"}`, clear: () => update({ lyExcp: "all" }) });
  if (filters.from || filters.to)
    chips.push({
      key: "d",
      label: `Dates: ${filters.from ? isoToDmy(filters.from) : "…"} to ${filters.to ? isoToDmy(filters.to) : "…"}`,
      clear: () => update({ from: "", to: "" }),
    });

  const viewLabel = someSelected ? null : filterCount > 0 ? { ids: visible.map((s) => s.id), label: "Current view" } : null;

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        eyebrow="Responses"
        title="All submissions"
        description={`${plural(visible.length, "response")} from ${plural(students, "student")}${filterCount ? " match your filters" : ""}.`}
        actions={<ExportMenu total={submissions.length} view={viewLabel} />}
      />

      <div className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-stone-900/5 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search name, roll no, email, activity, ref no…"
              className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-10 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
            {filters.q ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => update({ q: "" })}
                className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-stone-400 hover:bg-stone-100"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-stone-200 bg-white px-1.5 text-[11px] text-stone-400 sm:block">
                /
              </kbd>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MultiFilter label="Year" options={YEARS} value={filters.years} onChange={(years) => update({ years })} />
            <MultiFilter label="Branch" options={BRANCHES} value={filters.branches} onChange={(branches) => update({ branches })} />
            <MultiFilter label="Level" options={LEVELS} value={filters.levels} onChange={(levels) => update({ levels })} />
            <MultiFilter
              label="Activity type"
              wide
              options={allCategories}
              value={filters.categories}
              onChange={(c) => update({ categories: c })}
              render={(o) => {
                const d = describeCategory(o);
                return (
                  <>
                    <span className="block font-medium">{d.title}</span>
                    {d.hint && <span className="block text-xs text-stone-500">{d.hint}</span>}
                  </>
                );
              }}
            />
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
                    filters.lyExcp !== "all" || filters.from || filters.to
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
                  )}
                >
                  <SlidersHorizontal className="size-3.5" />
                  More
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={6}
                  collisionPadding={12}
                  className="z-50 w-80 space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-float outline-none data-[state=open]:animate-scale-in"
                >
                  <div>
                    <p className="mb-2 text-xs font-semibold text-stone-500">LY EXCP student</p>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
                      {(["all", "yes", "no"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => update({ lyExcp: v })}
                          className={cn(
                            "rounded-lg py-1.5 text-sm font-medium capitalize",
                            filters.lyExcp === v ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-stone-500">Activity held between</p>
                    <div className="space-y-2">
                      <DateField
                        id="filter-from"
                        value={filters.from ? isoToDmy(filters.from) : ""}
                        onChange={(v) => {
                          const iso = anyToIso(v);
                          if (iso || !v) update({ from: iso ?? "" });
                        }}
                      />
                      <DateField
                        id="filter-to"
                        value={filters.to ? isoToDmy(filters.to) : ""}
                        onChange={(v) => {
                          const iso = anyToIso(v);
                          if (iso || !v) update({ to: iso ?? "" });
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-400">Pick dates from the calendar.</p>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <select
              value={sortIndex}
              onChange={(e) => setSortIndex(Number(e.target.value))}
              aria-label="Sort responses"
              className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 outline-none focus:ring-4 focus:ring-brand-500/10"
            >
              {SORTS.map((s, i) => (
                <option key={s.label} value={i}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-xs font-medium text-stone-700"
              >
                <span className="truncate">{c.label}</span>
                <button type="button" onClick={c.clear} aria-label="Remove filter" className="grid size-5 place-items-center rounded-full hover:bg-stone-200">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => update(EMPTY_FILTERS)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white py-16 text-center shadow-card ring-1 ring-stone-900/5">
          <span className="grid size-12 place-items-center rounded-2xl bg-stone-100 text-stone-500">
            <Inbox className="size-5" />
          </span>
          <p className="mt-4 font-semibold text-stone-900">
            {submissions.length === 0 ? "No submissions yet" : "No responses match these filters"}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {submissions.length === 0 ? "They'll appear here as students submit the form." : "Try removing a filter or changing the search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-900/5">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/80 text-left text-xs font-semibold text-stone-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={allVisibleSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all matching responses"
                    />
                  </th>
                  <th className="px-3 py-3">Ref / Submitted</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Activity</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="px-3 py-3">Dates</th>
                  <th className="px-3 py-3 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((s) => {
                  const cat = describeCategory(s.activityCategory);
                  const isSel = selected.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openViewer(s.id)}
                      className={cn("cursor-pointer transition-colors hover:bg-stone-50/80", isSel && "bg-brand-50/50 hover:bg-brand-50/70")}
                    >
                      <td className="px-4 py-3.5">
                        <Checkbox checked={isSel} onCheckedChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <p className="font-mono text-xs font-semibold text-stone-800">{formatRef(s.seq)}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{formatTimestamp(s.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[11px] font-semibold text-brand-800">
                            {initials(s.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[14rem] truncate font-medium text-stone-900">{s.name}</p>
                            <p className="text-xs tabular text-stone-500">{s.rollNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <ClassBadges year={s.year} branch={s.branch} />
                      </td>
                      <td className="max-w-[22rem] px-3 py-3.5">
                        <p className="truncate font-medium text-stone-900" title={s.activityName}>
                          {s.activityName}
                        </p>
                        <p className="truncate text-xs text-stone-500" title={s.activityCategory}>
                          {cat.title}
                        </p>
                        {duplicates.has(s.id) && (
                          <Badge className="mt-1 h-5 bg-amber-50 text-[11px] text-amber-800 ring-amber-200">
                            <TriangleAlert className="size-3" />
                            Possible duplicate
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <LevelBadge level={s.activityLevel} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-stone-700">{formatDateRange(s.startDate, s.endDate)}</td>
                      <td className="px-3 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openViewer(s.id);
                          }}
                        >
                          <Eye />
                          View PDF
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-stone-100 lg:hidden">
            {rows.map((s) => (
              <li key={s.id} className={cn("flex gap-3 p-4", selected.has(s.id) && "bg-brand-50/50")}>
                <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} className="mt-1" aria-label={`Select ${s.name}`} />
                <button type="button" onClick={() => openViewer(s.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-stone-900">{s.name}</p>
                    <span className="font-mono text-[11px] text-stone-500">{formatRef(s.seq)}</span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {s.rollNo} · {s.year} {s.branch}
                  </p>
                  <p className="mt-1.5 truncate text-sm text-stone-800">{s.activityName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <LevelBadge level={s.activityLevel} />
                    <span className="text-xs text-stone-500">{formatDateRange(s.startDate, s.endDate)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing <span className="font-semibold tabular text-stone-900">{currentPage * pageSize + 1}</span>–
              <span className="font-semibold tabular text-stone-900">{Math.min(visible.length, (currentPage + 1) * pageSize)}</span> of{" "}
              <span className="font-semibold tabular text-stone-900">{visible.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                aria-label="Rows per page"
                className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="icon-sm" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft />
              </Button>
              <span className="tabular">
                {currentPage + 1} / {pageCount}
              </span>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Next page"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {someSelected && (
        <div className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl bg-ink-900 p-2 pl-4 text-white shadow-float animate-slide-up lg:left-[calc(50%+8rem)]">
          <p className="mr-auto text-sm font-medium">
            <span className="tabular">{existingSelected.length}</span> selected
          </p>
          <Button variant="gold" size="sm" onClick={() => void exportExcel(existingSelected)}>
            <FileSpreadsheet />
            Excel
          </Button>
          <Button variant="dark" size="sm" className="bg-white/10 hover:bg-white/15" onClick={() => exportZip(existingSelected)}>
            <FileArchive />
            ZIP + PDFs
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmBulk(true)}>
            <Trash2 />
            Delete
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white/70 hover:bg-white/10 hover:text-white" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
            <X />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={`Delete ${plural(existingSelected.length, "response")}?`}
        description="The selected responses and their proof PDFs will be permanently deleted. Consider exporting them first. This can't be undone."
        confirmLabel="Delete permanently"
        busy={deleting}
        onConfirm={async () => {
          setDeleting(true);
          await onDelete(existingSelected);
          setDeleting(false);
          setConfirmBulk(false);
        }}
      />

      <SubmissionViewer items={visible} openId={openId} onOpenChange={openViewer} onDelete={onDelete} duplicates={duplicates} />
    </div>
  );
}
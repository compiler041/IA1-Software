"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, Eye, Search, Users } from "lucide-react";
import { LEVEL_STYLES, LevelBadge, branchDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateRange, formatTimestamp } from "@/lib/dates";
import { BRANCHES, LEVELS, YEARS, YEAR_LABELS, describeCategory, type Branch, type Year } from "@/lib/form-config";
import { groupByStudent, type StudentSummary } from "@/lib/stats";
import type { Submission } from "@/lib/types";
import { cn, initials, plural } from "@/lib/utils";
import { exportExcel } from "./export-menu";
import { PageHeader } from "./page-header";
import { deleteResponses } from "./responses-view";
import { SubmissionViewer } from "./submission-viewer";

type SortMode = "class" | "most" | "name" | "recent";

const SORT_LABELS: Record<SortMode, string> = {
  class: "Class & roll number",
  most: "Most activities",
  name: "Name A–Z",
  recent: "Recently active",
};

export function StudentsView({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [year, setYear] = useState<Year | "all">("all");
  const [branch, setBranch] = useState<Branch | "all">("all");
  const [sort, setSort] = useState<SortMode>("class");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewerItems, setViewerItems] = useState<Submission[]>([]);

  const students = useMemo(() => groupByStudent(submissions), [submissions]);

  const filtered = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = students.filter((s) => {
      if (year !== "all" && s.year !== year) return false;
      if (branch !== "all" && s.branch !== branch) return false;
      if (terms.length) {
        const hay = `${s.name} ${s.rollNo} ${s.email} ${s.mobile}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const yearIdx = (y: Year) => YEARS.indexOf(y);
    const byRoll = (a: StudentSummary, b: StudentSummary) => a.rollNo.localeCompare(b.rollNo, "en", { numeric: true });
    return list.sort((a, b) => {
      if (sort === "most") return b.total - a.total || byRoll(a, b);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") return b.latest.localeCompare(a.latest);
      return yearIdx(a.year) - yearIdx(b.year) || a.branch.localeCompare(b.branch) || byRoll(a, b);
    });
  }, [students, q, year, branch, sort]);

  const groups = useMemo(() => {
    if (sort !== "class") return [{ key: "all", label: null as string | null, items: filtered }];
    const map = new Map<string, StudentSummary[]>();
    for (const s of filtered) {
      const key = `${s.year}|${s.branch}`;
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return [...map.entries()].map(([key, items]) => ({ key, label: key, items }));
  }, [filtered, sort]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const open = (student: StudentSummary, id: string) => {
    setViewerItems(student.submissions);
    setOpenId(id);
  };

  const onDelete = async (ids: string[]) => {
    const ok = await deleteResponses(ids);
    if (ok) {
      setViewerItems((items) => items.filter((s) => !ids.includes(s.id)));
      router.refresh();
    }
    return ok;
  };

  const activityCount = filtered.reduce((n, s) => n + s.total, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Students"
        title="Students"
        description={`${plural(filtered.length, "student")} · ${plural(activityCount, "activity", "activities")}. Each student is grouped by roll number.`}
        actions={
          <Button
            variant="primary"
            disabled={activityCount === 0}
            onClick={() => void exportExcel(filtered.flatMap((s) => s.submissions.map((x) => x.id)))}
          >
            <Download />
            Export these students
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-stone-900/5 sm:p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, roll no, email or mobile…"
            className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value as Year | "all")}
            aria-label="Year"
            className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700"
          >
            <option value="all">All years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y} · {YEAR_LABELS[y]}
              </option>
            ))}
          </select>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value as Branch | "all")}
            aria-label="Branch"
            className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700"
          >
            <option value="all">All branches</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort"
            className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((k) => (
              <option key={k} value={k}>
                Sort: {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white py-16 text-center shadow-card ring-1 ring-stone-900/5">
          <span className="grid size-12 place-items-center rounded-2xl bg-stone-100 text-stone-500">
            <Users className="size-5" />
          </span>
          <p className="mt-4 font-semibold text-stone-900">No students found</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const [gy, gb] = (g.label ?? "").split("|") as [Year, Branch];
            return (
              <section key={g.key} className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-900/5">
                {g.label && (
                  <header className="flex items-center gap-3 border-b border-stone-200 bg-stone-50/80 px-5 py-3">
                    <span className={cn("size-2 rounded-full", branchDot(gb))} />
                    <h2 className="font-semibold text-stone-900">
                      {gy} {gb}
                    </h2>
                    <span className="text-sm text-stone-500">{YEAR_LABELS[gy]}</span>
                    <span className="ml-auto text-xs text-stone-500">
                      {plural(g.items.length, "student")} · {plural(g.items.reduce((n, s) => n + s.total, 0), "activity", "activities")}
                    </span>
                  </header>
                )}
                <ul className="divide-y divide-stone-100">
                  {g.items.map((s) => {
                    const isOpen = expanded.has(s.key);
                    return (
                      <Fragment key={s.key}>
                        <li>
                          <button
                            type="button"
                            onClick={() => toggle(s.key)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-stone-50/80"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-semibold text-brand-800">
                              {initials(s.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-stone-900">{s.name}</span>
                              <span className="block truncate text-xs text-stone-500">
                                {s.rollNo} · {s.email}
                                {g.label ? "" : ` · ${s.year} ${s.branch}`}
                              </span>
                            </span>
                            <span className="hidden items-center gap-1 md:flex" title="By level">
                              {LEVELS.map((l) =>
                                s.levels[l] ? (
                                  <span
                                    key={l}
                                    className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ring-1 ring-inset", LEVEL_STYLES[l].badge)}
                                  >
                                    {l.slice(0, 4)} {s.levels[l]}
                                  </span>
                                ) : null,
                              )}
                            </span>
                            <span className="w-24 shrink-0 text-right">
                              <span className="block font-display text-xl font-semibold tabular text-stone-900">{s.total}</span>
                              <span className="block text-[11px] text-stone-400">{s.total === 1 ? "activity" : "activities"}</span>
                            </span>
                            <ChevronDown className={cn("size-4 shrink-0 text-stone-400 transition-transform", isOpen && "rotate-180")} />
                          </button>
                        </li>
                        {isOpen && (
                          <li className="bg-stone-50/60 px-5 py-3 animate-fade-in">
                            <ul className="space-y-2">
                              {s.submissions.map((x) => (
                                <li
                                  key={x.id}
                                  className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-stone-200/70 sm:flex-row sm:items-center sm:gap-4"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-stone-900">{x.activityName}</p>
                                    <p className="truncate text-xs text-stone-500">
                                      {describeCategory(x.activityCategory).title} · {formatDateRange(x.startDate, x.endDate)} · submitted{" "}
                                      {formatTimestamp(x.createdAt)}
                                    </p>
                                  </div>
                                  <LevelBadge level={x.activityLevel} />
                                  <Button variant="secondary" size="xs" onClick={() => open(s, x.id)}>
                                    <Eye />
                                    View
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </li>
                        )}
                      </Fragment>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <SubmissionViewer items={viewerItems} openId={openId} onOpenChange={setOpenId} onDelete={onDelete} />
    </div>
  );
}

import { istDateKey, monthsBetween } from "./dates";
import { BRANCHES, LEVELS, YEARS, type ActivityLevel, type Branch, type Year } from "./form-config";
import type { Submission } from "./types";
import { rollKey } from "./utils";

export type CountItem = { key: string; label: string; value: number };

export function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function uniqueStudentCount(subs: Submission[]): number {
  return new Set(subs.map((s) => rollKey(s.rollNo))).size;
}

export type Overview = {
  total: number;
  students: number;
  nationalPlus: number;
  lastSevenDays: number;
  previousSevenDays: number;
  byLevel: CountItem[];
  byBranch: CountItem[];
  byYear: CountItem[];
  byCategory: CountItem[];
  matrix: { year: Year; counts: Record<Branch, number>; total: number }[];
  branchTotals: Record<Branch, number>;
  byMonth: { key: string; label: string; year: number; value: number }[];
};

export function computeOverview(
  subs: Submission[],
  opts: { categories: string[]; periodStart: string; periodEnd: string; now: string },
): Overview {
  const nowMs = new Date(opts.now).getTime();
  const weekMs = 7 * 86_400_000;
  let lastSevenDays = 0;
  let previousSevenDays = 0;
  for (const s of subs) {
    const age = nowMs - new Date(s.createdAt).getTime();
    if (age < weekMs) lastSevenDays += 1;
    else if (age < 2 * weekMs) previousSevenDays += 1;
  }

  const levelCounts = countBy(subs, (s) => s.activityLevel);
  const branchCounts = countBy(subs, (s) => s.branch);
  const yearCounts = countBy(subs, (s) => s.year);
  const categoryCounts = countBy(subs, (s) => s.activityCategory);

  const categoryKeys = [...opts.categories];
  for (const key of categoryCounts.keys()) if (!categoryKeys.includes(key)) categoryKeys.push(key);

  const matrix = YEARS.map((year) => {
    const counts = Object.fromEntries(BRANCHES.map((b) => [b, 0])) as Record<Branch, number>;
    for (const s of subs) if (s.year === year) counts[s.branch] += 1;
    return { year, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  });
  const branchTotals = Object.fromEntries(BRANCHES.map((b) => [b, branchCounts.get(b) ?? 0])) as Record<Branch, number>;

  const monthCounts = countBy(subs, (s) => s.startDate.slice(0, 7));
  const byMonth = monthsBetween(opts.periodStart, opts.periodEnd).map((m) => ({
    ...m,
    value: monthCounts.get(m.key) ?? 0,
  }));

  return {
    total: subs.length,
    students: uniqueStudentCount(subs),
    nationalPlus: (levelCounts.get("National") ?? 0) + (levelCounts.get("International") ?? 0),
    lastSevenDays,
    previousSevenDays,
    byLevel: LEVELS.map((l) => ({ key: l, label: l, value: levelCounts.get(l) ?? 0 })),
    byBranch: BRANCHES.map((b) => ({ key: b, label: b, value: branchCounts.get(b) ?? 0 })),
    byYear: YEARS.map((y) => ({ key: y, label: y, value: yearCounts.get(y) ?? 0 })),
    byCategory: categoryKeys
      .map((c) => ({ key: c, label: c, value: categoryCounts.get(c) ?? 0 }))
      .sort((a, b) => b.value - a.value),
    matrix,
    branchTotals,
    byMonth,
  };
}

export type StudentSummary = {
  key: string;
  rollNo: string;
  name: string;
  email: string;
  mobile: string;
  year: Year;
  branch: Branch;
  isLyExcp: boolean;
  total: number;
  levels: Record<ActivityLevel, number>;
  latest: string;
  submissions: Submission[];
};

/** Groups submissions by roll number; identity fields come from the most recent submission. */
export function groupByStudent(subs: Submission[]): StudentSummary[] {
  const groups = new Map<string, Submission[]>();
  for (const s of subs) {
    const key = rollKey(s.rollNo);
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }
  const out: StudentSummary[] = [];
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = sorted[0];
    const levels = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<ActivityLevel, number>;
    for (const s of sorted) levels[s.activityLevel] += 1;
    out.push({
      key,
      rollNo: latest.rollNo,
      name: latest.name,
      email: latest.email,
      mobile: latest.mobile,
      year: latest.year,
      branch: latest.branch,
      isLyExcp: latest.isLyExcp,
      total: sorted.length,
      levels,
      latest: latest.createdAt,
      submissions: sorted,
    });
  }
  return out;
}

/** Keys of submissions that look like repeats (same student, activity name and start date). */
export function findDuplicateIds(subs: Submission[]): Set<string> {
  const seen = new Map<string, string[]>();
  for (const s of subs) {
    const key = [rollKey(s.rollNo), s.activityName.toLowerCase().replace(/\s+/g, " ").trim(), s.startDate].join("|");
    const list = seen.get(key);
    if (list) list.push(s.id);
    else seen.set(key, [s.id]);
  }
  const dupes = new Set<string>();
  for (const ids of seen.values()) if (ids.length > 1) ids.forEach((id) => dupes.add(id));
  return dupes;
}

export function todayKey(now: string): string {
  return istDateKey(now);
}

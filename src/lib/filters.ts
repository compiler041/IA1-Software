import { LEVEL_RANK, type ActivityLevel, type Branch, type Year } from "./form-config";
import type { Submission } from "./types";
import { formatRef } from "./utils";

export type ResponseFilters = {
  q: string;
  years: Year[];
  branches: Branch[];
  levels: ActivityLevel[];
  categories: string[];
  lyExcp: "all" | "yes" | "no";
  from: string;
  to: string;
};

export const EMPTY_FILTERS: ResponseFilters = {
  q: "",
  years: [],
  branches: [],
  levels: [],
  categories: [],
  lyExcp: "all",
  from: "",
  to: "",
};

export function activeFilterCount(f: ResponseFilters): number {
  return (
    (f.q.trim() ? 1 : 0) +
    (f.years.length ? 1 : 0) +
    (f.branches.length ? 1 : 0) +
    (f.levels.length ? 1 : 0) +
    (f.categories.length ? 1 : 0) +
    (f.lyExcp !== "all" ? 1 : 0) +
    (f.from || f.to ? 1 : 0)
  );
}

export function searchText(s: Submission): string {
  return [
    formatRef(s.seq),
    s.name,
    s.rollNo,
    s.email,
    s.mobile,
    s.activityName,
    s.organiserParticipantName,
    s.activityCategory,
    s.activityDetails,
  ]
    .join(" \u0001 ")
    .toLowerCase();
}

export function applyFilters(subs: Submission[], f: ResponseFilters): Submission[] {
  const terms = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return subs.filter((s) => {
    if (f.years.length && !f.years.includes(s.year)) return false;
    if (f.branches.length && !f.branches.includes(s.branch)) return false;
    if (f.levels.length && !f.levels.includes(s.activityLevel)) return false;
    if (f.categories.length && !f.categories.includes(s.activityCategory)) return false;
    if (f.lyExcp === "yes" && !s.isLyExcp) return false;
    if (f.lyExcp === "no" && s.isLyExcp) return false;
    // Activity overlaps the chosen window.
    if (f.from && s.endDate < f.from) return false;
    if (f.to && s.startDate > f.to) return false;
    if (terms.length) {
      const haystack = searchText(s);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

export type SortKey = "submitted" | "name" | "rollNo" | "activity" | "level" | "date" | "class";
export type SortDir = "asc" | "desc";

const YEAR_ORDER: Record<Year, number> = { FY: 1, SY: 2, TY: 3, LY: 4 };

export function sortSubmissions(subs: Submission[], key: SortKey, dir: SortDir): Submission[] {
  const factor = dir === "asc" ? 1 : -1;
  const compare = (a: Submission, b: Submission): number => {
    switch (key) {
      case "submitted":
        return a.seq - b.seq;
      case "name":
        return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      case "rollNo":
        return a.rollNo.localeCompare(b.rollNo, "en", { numeric: true });
      case "activity":
        return a.activityName.localeCompare(b.activityName, "en", { sensitivity: "base" });
      case "level":
        return LEVEL_RANK[a.activityLevel] - LEVEL_RANK[b.activityLevel];
      case "date":
        return a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate);
      case "class":
        return YEAR_ORDER[a.year] - YEAR_ORDER[b.year] || a.branch.localeCompare(b.branch);
    }
  };
  return [...subs].sort((a, b) => compare(a, b) * factor || (b.seq - a.seq));
}

export const YEAR_OPTIONS = [
  { value: "FY", label: "First Year" },
  { value: "SY", label: "Second Year" },
  { value: "TY", label: "Third Year" },
  { value: "LY", label: "Final Year" },
] as const;

export const BRANCH_OPTIONS = [{ value: "EXCP" }, { value: "CSBS" }, { value: "VLSI" }] as const;

export const LEVEL_OPTIONS = [
  { value: "University", hint: "Within the university" },
  { value: "State", hint: "State-level event" },
  { value: "National", hint: "National-level event" },
  { value: "International", hint: "International event" },
] as const;

export type Year = (typeof YEAR_OPTIONS)[number]["value"];
export type Branch = (typeof BRANCH_OPTIONS)[number]["value"];
export type ActivityLevel = (typeof LEVEL_OPTIONS)[number]["value"];

export const YEARS: readonly Year[] = YEAR_OPTIONS.map((o) => o.value);
export const BRANCHES: readonly Branch[] = BRANCH_OPTIONS.map((o) => o.value);
export const LEVELS: readonly ActivityLevel[] = LEVEL_OPTIONS.map((o) => o.value);

export const LEVEL_RANK: Record<ActivityLevel, number> = {
  University: 1,
  State: 2,
  National: 3,
  International: 4,
};

export const YEAR_LABELS: Record<Year, string> = Object.fromEntries(
  YEAR_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Year, string>;

/** Options of the "Select Activity and Achievement" dropdown from the original Google Form. */
export const DEFAULT_ACTIVITY_CATEGORIES: string[] = [
  "Sports Activity Participation",
  "Cultural Activity Participation",
  "Technical Event Organised (Project Competition/Workshop/Hackathon/Seminar/Any other)",
  "Technical Event Participation (Project Competition/Workshop/Seminar/Hackathon/Any other)",
  "Social Activity Participation",
  "Scholarship Received",
  "Students Paper Publications in Conferences",
  "Students Paper Publications in Journal (specify Scopus/UGC Care)",
  "Online Courses Certificates (NPTEL/Coursera/Any other)",
  "Participation in KJSSE Students Councils (IETE, e-CESA, Bloombox etc)",
  "Copyright/Patents",
  "Awards/Prize/Recognition",
  "Not applicable",
];

/** Splits "Title (examples)" into a title and a softer hint line for display. */
export function describeCategory(label: string): { title: string; hint: string | null } {
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(label);
  if (!match) return { title: label.trim(), hint: null };
  return {
    title: match[1].trim(),
    hint: match[2].replace(/\s*\/\s*/g, " / ").trim(),
  };
}

export const isYear = (v: unknown): v is Year => typeof v === "string" && (YEARS as string[]).includes(v);
export const isBranch = (v: unknown): v is Branch =>
  typeof v === "string" && (BRANCHES as string[]).includes(v);
export const isLevel = (v: unknown): v is ActivityLevel =>
  typeof v === "string" && (LEVELS as string[]).includes(v);

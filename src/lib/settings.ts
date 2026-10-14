import { isValidIsoDate } from "./dates";
import { DEFAULT_ACTIVITY_CATEGORIES } from "./form-config";

export type FormSettings = {
  institutionName: string;
  institutionSubtitle: string;
  formTitle: string;
  periodStart: string;
  periodEnd: string;
  deadline: string;
  acceptingResponses: boolean;
  closedMessage: string;
  activityCategories: string[];
  /** Students must use an email on this domain. Empty string allows any email. */
  emailDomain: string;
};

export const DEFAULT_SETTINGS: FormSettings = {
  institutionName: "K J Somaiya School of Engineering",
  institutionSubtitle: "Somaiya Vidyavihar University",
  formTitle: "Student Activity and Achievement Data",
  periodStart: "2025-07-01",
  periodEnd: "2026-06-30",
  deadline: "2026-05-30",
  acceptingResponses: true,
  closedMessage:
    "This form is not accepting responses right now. Please contact your class coordinator if you still need to submit an activity.",
  activityCategories: DEFAULT_ACTIVITY_CATEGORIES,
  emailDomain: "somaiya.edu",
};

export const SETTINGS_LIMITS = {
  text: 160,
  closedMessage: 600,
  category: 200,
  categories: 60,
};

const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function cleanCategories(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const label = item.replace(/\s+/g, " ").trim().slice(0, SETTINGS_LIMITS.category);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= SETTINGS_LIMITS.categories) break;
  }
  return out;
}

/** Merges stored (possibly partial or stale) settings with defaults. Never throws. */
export function normalizeSettings(raw: unknown): FormSettings {
  const base: FormSettings = { ...DEFAULT_SETTINGS, activityCategories: [...DEFAULT_SETTINGS.activityCategories] };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const text = (key: keyof FormSettings, max = SETTINGS_LIMITS.text) => {
    const v = r[key];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : (base[key] as string);
  };
  const date = (key: "periodStart" | "periodEnd" | "deadline") => {
    const v = r[key];
    return typeof v === "string" && isValidIsoDate(v) ? v : base[key];
  };

  const categories = cleanCategories(r.activityCategories);
  const domain = typeof r.emailDomain === "string" ? normalizeDomain(r.emailDomain) : base.emailDomain;

  return {
    institutionName: text("institutionName"),
    institutionSubtitle: typeof r.institutionSubtitle === "string" ? r.institutionSubtitle.trim().slice(0, SETTINGS_LIMITS.text) : base.institutionSubtitle,
    formTitle: text("formTitle"),
    periodStart: date("periodStart"),
    periodEnd: date("periodEnd"),
    deadline: date("deadline"),
    acceptingResponses: typeof r.acceptingResponses === "boolean" ? r.acceptingResponses : base.acceptingResponses,
    closedMessage: text("closedMessage", SETTINGS_LIMITS.closedMessage),
    activityCategories: categories.length ? categories : base.activityCategories,
    emailDomain: domain === "" || DOMAIN_RE.test(domain) ? domain : base.emailDomain,
  };
}

export type SettingsErrors = Partial<Record<keyof FormSettings, string>>;

/** Strict validation used when an admin saves settings. */
export function validateSettings(raw: unknown): { ok: true; settings: FormSettings } | { ok: false; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (k: keyof FormSettings) => (typeof r[k] === "string" ? (r[k] as string).trim() : "");

  if (!str("institutionName")) errors.institutionName = "Institution name is required";
  if (!str("formTitle")) errors.formTitle = "Form title is required";
  if (!isValidIsoDate(str("periodStart"))) errors.periodStart = "Enter a valid start date";
  if (!isValidIsoDate(str("periodEnd"))) errors.periodEnd = "Enter a valid end date";
  if (!errors.periodStart && !errors.periodEnd && str("periodEnd") < str("periodStart")) {
    errors.periodEnd = "The period must end after it starts";
  }
  if (!isValidIsoDate(str("deadline"))) errors.deadline = "Enter a valid deadline";
  if (cleanCategories(r.activityCategories).length === 0) {
    errors.activityCategories = "Add at least one activity option";
  }
  const domain = normalizeDomain(str("emailDomain"));
  if (domain && !DOMAIN_RE.test(domain)) errors.emailDomain = "Enter a domain like somaiya.edu, or leave it empty";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, settings: normalizeSettings(raw) };
}

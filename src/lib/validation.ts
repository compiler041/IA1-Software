import { anyToIso } from "./dates";
import { isBranch, isLevel, isYear } from "./form-config";
import type { SubmissionInput } from "./types";

export type StudentFormValues = {
  name: string;
  rollNo: string;
  email: string;
  mobile: string;
  year: string;
  branch: string;
  isLyExcp: string;
  activityCategory: string;
  organiserParticipantName: string;
  activityName: string;
  activityDetails: string;
  activityLevel: string;
  /** DD-MM-YYYY while editing; ISO is also accepted. */
  startDate: string;
  endDate: string;
};

export type FieldName = keyof StudentFormValues;
export type FieldErrors = Partial<Record<FieldName | "proof", string>>;

export const FIELD_ORDER: FieldName[] = [
  "name",
  "rollNo",
  "email",
  "mobile",
  "year",
  "branch",
  "isLyExcp",
  "activityCategory",
  "organiserParticipantName",
  "activityName",
  "activityDetails",
  "activityLevel",
  "startDate",
  "endDate",
];

export const EMPTY_FORM: StudentFormValues = {
  name: "",
  rollNo: "",
  email: "",
  mobile: "",
  year: "",
  branch: "",
  isLyExcp: "",
  activityCategory: "",
  organiserParticipantName: "",
  activityName: "",
  activityDetails: "",
  activityLevel: "",
  startDate: "",
  endDate: "",
};

export const FIELD_LIMITS = {
  name: 120,
  rollNo: 30,
  email: 120,
  organiserParticipantName: 200,
  activityName: 250,
  activityDetails: 5000,
} as const;

export type ValidationContext = {
  categories: string[];
  emailDomain: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLL_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]*$/;

const singleLine = (v: string) => v.replace(/\s+/g, " ").trim();
const multiLine = (v: string) => v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

export function normalizeMobile(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function validateField(field: FieldName, values: StudentFormValues, ctx: ValidationContext): string | undefined {
  const raw = values[field] ?? "";
  switch (field) {
    case "name": {
      const v = singleLine(raw);
      if (!v) return "Please enter your full name";
      if (v.length < 2) return "Name looks too short";
      if (v.length > FIELD_LIMITS.name) return "Name is too long";
      if (/\d/.test(v)) return "Name shouldn't contain numbers";
      return;
    }
    case "rollNo": {
      const v = raw.trim();
      if (!v) return "Please enter your roll number";
      if (v.length > FIELD_LIMITS.rollNo) return "Roll number is too long";
      if (!ROLL_RE.test(v)) return "Use letters and numbers only, without spaces";
      return;
    }
    case "email": {
      const v = raw.trim().toLowerCase();
      if (!v) return "Please enter your email ID";
      if (v.length > FIELD_LIMITS.email || !EMAIL_RE.test(v)) return "Enter a valid email address";
      if (ctx.emailDomain && !v.endsWith(`@${ctx.emailDomain}`)) return `Please use your @${ctx.emailDomain} email ID`;
      return;
    }
    case "mobile": {
      if (!raw.trim()) return "Please enter your mobile number";
      if (!/^[6-9]\d{9}$/.test(normalizeMobile(raw))) return "Enter a valid 10-digit mobile number";
      return;
    }
    case "year":
      return isYear(raw) ? undefined : "Please select your year";
    case "branch":
      return isBranch(raw) ? undefined : "Please select your branch";
    case "isLyExcp":
      return raw === "Yes" || raw === "No" ? undefined : "Please choose Yes or No";
    case "activityCategory": {
      if (!raw) return "Please select the activity / achievement type";
      return ctx.categories.includes(raw) ? undefined : "Please choose an option from the list";
    }
    case "organiserParticipantName": {
      const v = singleLine(raw);
      if (!v) return "Please enter the organiser / participant name";
      if (v.length > FIELD_LIMITS.organiserParticipantName) return "This is too long";
      return;
    }
    case "activityName": {
      const v = singleLine(raw);
      if (!v) return "Please enter the name of the activity";
      if (v.length > FIELD_LIMITS.activityName) return "Activity name is too long";
      return;
    }
    case "activityDetails": {
      const v = multiLine(raw);
      if (!v) return "Please describe the activity";
      if (v.length > FIELD_LIMITS.activityDetails) return `Keep it under ${FIELD_LIMITS.activityDetails} characters`;
      return;
    }
    case "activityLevel":
      return isLevel(raw) ? undefined : "Please select the activity level";
    case "startDate": {
      if (!raw.trim()) return "Please enter the start date";
      return anyToIso(raw) ? undefined : "Enter a valid date as DD-MM-YYYY";
    }
    case "endDate": {
      if (!raw.trim()) return "Please enter the end date";
      const end = anyToIso(raw);
      if (!end) return "Enter a valid date as DD-MM-YYYY";
      const start = anyToIso(values.startDate);
      if (start && end < start) return "End date can't be before the start date";
      return;
    }
  }
}

export function validateAll(values: StudentFormValues, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    const error = validateField(field, values, ctx);
    if (error) errors[field] = error;
  }
  return errors;
}

/** Shared by the browser (before upload) and the server (source of truth). */
export function validateSubmission(
  input: unknown,
  ctx: ValidationContext,
): { ok: true; data: SubmissionInput } | { ok: false; errors: FieldErrors } {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const values = { ...EMPTY_FORM };
  for (const field of FIELD_ORDER) {
    const v = source[field];
    values[field] = typeof v === "string" ? v : "";
  }

  const errors = validateAll(values, ctx);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: singleLine(values.name),
      rollNo: values.rollNo.trim().toUpperCase(),
      email: values.email.trim().toLowerCase(),
      mobile: normalizeMobile(values.mobile),
      year: values.year as SubmissionInput["year"],
      branch: values.branch as SubmissionInput["branch"],
      activityCategory: values.activityCategory,
      organiserParticipantName: singleLine(values.organiserParticipantName),
      activityName: singleLine(values.activityName),
      activityDetails: multiLine(values.activityDetails),
      activityLevel: values.activityLevel as SubmissionInput["activityLevel"],
      startDate: anyToIso(values.startDate)!,
      endDate: anyToIso(values.endDate)!,
      isLyExcp: values.isLyExcp === "Yes",
    },
  };
}

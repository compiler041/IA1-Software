"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  AtSign,
  Building2,
  CalendarRange,
  Check,
  Flag,
  Globe2,
  Hash,
  Landmark,
  Phone,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ActivitySelect } from "@/components/ui/activity-select";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { DateField } from "@/components/ui/date-field";
import { CharCount, Field, TextArea, TextInput } from "@/components/ui/field";
import { PdfDrop, type ProofFile } from "@/components/ui/pdf-drop";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { anyToIso, daysInclusive, formatLongDate, formatShortDate } from "@/lib/dates";
import { BRANCH_OPTIONS, LEVEL_OPTIONS, YEAR_OPTIONS, type ActivityLevel } from "@/lib/form-config";
import type { FormSettings } from "@/lib/settings";
import { cn, formatBytes, plural } from "@/lib/utils";
import {
  EMPTY_FORM,
  FIELD_LIMITS,
  FIELD_ORDER,
  validateAll,
  type FieldErrors,
  type FieldName,
  type StudentFormValues,
} from "@/lib/validation";
import { SubmissionSuccess, type SuccessInfo } from "./submission-success";

type Props = { settings: FormSettings; maxUploadMb: number };
type Stage = { kind: "idle" } | { kind: "uploading"; progress: number } | { kind: "saving" };
type UploadTicket = { key: string; url: string; method: "PUT"; headers: Record<string, string> };

const STUDENT_FIELDS: FieldName[] = ["name", "rollNo", "email", "mobile", "year", "branch", "isLyExcp"];
const ACTIVITY_FIELDS: FieldName[] = [
  "activityCategory",
  "organiserParticipantName",
  "activityName",
  "activityDetails",
  "activityLevel",
  "startDate",
  "endDate",
];
const DETAILS_KEY = "sa.student-details.v1";
const REMEMBER_KEY = "sa.remember-details";

const fid = (field: FieldName | "proof") => `sa-${field}`;

const YEAR_CHOICES = YEAR_OPTIONS.map((o) => ({ value: o.value, label: o.value, description: o.label }));
const BRANCH_CHOICES = BRANCH_OPTIONS.map((o) => ({ value: o.value, label: o.value }));
const YES_NO = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];
const LEVEL_ICONS: Record<ActivityLevel, ReactNode> = {
  University: <Building2 />,
  State: <Landmark />,
  National: <Flag />,
  International: <Globe2 />,
};
const LEVEL_CHOICES = LEVEL_OPTIONS.map((o) => ({
  value: o.value,
  label: o.value,
  description: o.hint,
  icon: LEVEL_ICONS[o.value],
}));

/* ------------------------------------------------------------------ */
/* Remembered student details (localStorage, read once per page load)  */
/* ------------------------------------------------------------------ */

type Remembered = { remember: boolean; details: Partial<StudentFormValues> | null };
const SERVER_REMEMBERED: Remembered = { remember: true, details: null };
let clientRemembered: Remembered | null = null;

function readRemembered(): Remembered {
  if (clientRemembered) return clientRemembered;
  let result: Remembered = { remember: true, details: null };
  try {
    const remember = localStorage.getItem(REMEMBER_KEY) !== "0";
    const raw = remember ? localStorage.getItem(DETAILS_KEY) : null;
    let details: Partial<StudentFormValues> | null = null;
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      const picked: Partial<StudentFormValues> = {};
      for (const field of STUDENT_FIELDS) {
        const value = saved[field];
        if (typeof value === "string") picked[field] = value;
      }
      if (picked.name) details = picked;
    }
    result = { remember, details };
  } catch {
    // Storage can be blocked (private mode, strict settings); the form simply starts empty.
  }
  clientRemembered = result;
  return result;
}

const subscribeNever = () => () => {};

function storeDetails(values: StudentFormValues | null) {
  try {
    if (!values) localStorage.removeItem(DETAILS_KEY);
    else localStorage.setItem(DETAILS_KEY, JSON.stringify(Object.fromEntries(STUDENT_FIELDS.map((f) => [f, values[f]]))));
  } catch {
    // Ignore storage failures.
  }
}

/* ------------------------------------------------------------------ */
/* Network helpers                                                      */
/* ------------------------------------------------------------------ */

class SubmitError extends Error {
  errors?: FieldErrors;
  constructor(message: string, errors?: FieldErrors) {
    super(message);
    this.errors = errors;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SubmitError("Network error. Please check your internet connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SubmitError(
      typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.",
      data?.errors && typeof data.errors === "object" ? data.errors : undefined,
    );
  }
  return data as T;
}

function uploadWithProgress(ticket: UploadTicket, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.url);
    for (const [name, value] of Object.entries(ticket.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "The upload failed. Please try again.";
      try {
        const data = JSON.parse(xhr.responseText);
        if (typeof data?.message === "string") message = data.message;
        else if (typeof data?.error === "string") message = data.error;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      reject(new SubmitError(message, { proof: message }));
    };
    xhr.onerror = () => reject(new SubmitError("The upload was interrupted. Please check your connection and try again."));
    xhr.onabort = () => reject(new SubmitError("The upload was cancelled."));
    xhr.send(file);
  });
}

function focusField(field: FieldName | "proof") {
  const wrapper = document.querySelector<HTMLElement>(`[data-field="${fid(field)}"]`);
  wrapper?.scrollIntoView({ behavior: "smooth", block: "center" });
  const element = document.getElementById(fid(field));
  const target = element?.getAttribute("role") === "radiogroup" ? element.querySelector<HTMLElement>('[tabindex="0"]') : element;
  target?.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                        */
/* ------------------------------------------------------------------ */

function Section({
  id,
  step,
  title,
  description,
  done,
  total,
  children,
}: {
  id: string;
  step: number;
  title: string;
  description: string;
  done: number;
  total: number;
  children: ReactNode;
}) {
  const complete = done === total;
  return (
    <section id={id} className="scroll-mt-6 rounded-[28px] bg-white shadow-card ring-1 ring-stone-900/5">
      <header className="flex items-start gap-4 border-b border-stone-100 px-5 py-5 sm:px-8">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tabular transition-colors duration-300",
            complete ? "bg-emerald-600 text-white" : "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
          )}
        >
          {complete ? <Check className="size-4 animate-pop" strokeWidth={3} /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold tracking-tight text-stone-900 sm:text-[22px]">{title}</h2>
          <p className="mt-0.5 text-sm text-stone-500">{description}</p>
        </div>
        <span
          className={cn(
            "mt-1 hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular sm:inline-block",
            complete ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500",
          )}
        >
          {complete ? "Complete" : `${done}/${total}`}
        </span>
      </header>
      <div className="px-5 py-6 sm:px-8 sm:py-7">{children}</div>
    </section>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 52 52" className="size-14 -rotate-90">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="var(--color-stone-200)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke={percent === 100 ? "var(--color-emerald-600)" : "var(--color-brand-700)"}
          strokeWidth="5"
          strokeLinecap={percent > 0 ? "round" : "butt"}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="transition-[stroke-dashoffset,stroke] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold tabular text-stone-900">
        {percent}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                 */
/* ------------------------------------------------------------------ */

export function StudentForm(props: Props) {
  const remembered = useSyncExternalStore(subscribeNever, readRemembered, () => SERVER_REMEMBERED);
  return (
    <StudentFormBody
      key={`${remembered.remember}-${remembered.details ? "restored" : "blank"}`}
      remembered={remembered}
      {...props}
    />
  );
}

function StudentFormBody({ settings, maxUploadMb, remembered }: Props & { remembered: Remembered }) {
  const ctx = useMemo(
    () => ({ categories: settings.activityCategories, emailDomain: settings.emailDomain }),
    [settings.activityCategories, settings.emailDomain],
  );
  const [values, setValues] = useState<StudentFormValues>(() => ({ ...EMPTY_FORM, ...remembered.details }));
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [proof, setProof] = useState<ProofFile | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [lyChosen, setLyChosen] = useState(Boolean(remembered.details?.isLyExcp));
  const [remember, setRemember] = useState(remembered.remember);
  const [welcomeName, setWelcomeName] = useState(remembered.details?.name?.trim().split(/\s+/)[0] ?? null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const busy = stage.kind !== "idle";

  useEffect(() => {
    if (!proof) return;
    return () => URL.revokeObjectURL(proof.url);
  }, [proof]);

  const liveErrors = useMemo(() => validateAll(values, ctx), [values, ctx]);
  const errorOf = (field: FieldName) =>
    serverErrors[field] ?? (touched[field] || attempted ? liveErrors[field] : undefined);
  const proofMessage =
    proofError ?? serverErrors.proof ?? (attempted && !proof ? "Please upload the proof of activity as a PDF" : undefined);

  const touch = (field: FieldName) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  const clearServerError = (field: FieldName | "proof") => {
    if (!serverErrors[field]) return;
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const update = (field: FieldName, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if ((field === "year" || field === "branch") && !lyChosen && next.year && next.branch) {
        next.isLyExcp = next.year === "LY" && next.branch === "EXCP" ? "Yes" : "No";
      }
      return next;
    });
    clearServerError(field);
  };

  const choose = (field: FieldName) => (value: string) => {
    if (field === "isLyExcp") setLyChosen(true);
    update(field, value);
    touch(field);
  };

  const text = (field: FieldName) => ({
    id: fid(field),
    value: values[field],
    onChange: (e: { target: { value: string } }) => update(field, e.target.value),
    onBlur: () => touch(field),
    invalid: Boolean(errorOf(field)),
    "aria-describedby": errorOf(field) ? `${fid(field)}-error` : undefined,
  });

  const selectProof = (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setProofError("Only PDF files are accepted. Please save or scan your proof as a PDF.");
    if (file.size === 0) return setProofError("This file is empty. Please choose another PDF.");
    if (file.size > maxUploadMb * 1024 * 1024) {
      return setProofError(`This PDF is ${formatBytes(file.size)}. The maximum allowed size is ${maxUploadMb} MB.`);
    }
    setProofError(null);
    clearServerError("proof");
    setProof({ file, url: URL.createObjectURL(file) });
  };

  const removeProof = () => {
    setProof(null);
    setProofError(null);
  };

  const changeRemember = (on: boolean) => {
    setRemember(on);
    try {
      localStorage.setItem(REMEMBER_KEY, on ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
    if (!on) storeDetails(null);
  };

  const forgetDetails = () => {
    storeDetails(null);
    setValues((prev) => {
      const next = { ...prev };
      for (const field of STUDENT_FIELDS) next[field] = "";
      return next;
    });
    setLyChosen(false);
    setWelcomeName(null);
    setTouched({});
  };

  const scrollToTop = () =>
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const resetForm = (keepStudent: boolean) => {
    setValues((prev) => {
      if (!keepStudent) return EMPTY_FORM;
      const next = { ...EMPTY_FORM };
      for (const field of STUDENT_FIELDS) next[field] = prev[field];
      return next;
    });
    if (!keepStudent) {
      setLyChosen(false);
      setWelcomeName(null);
    }
    setProof(null);
    setProofError(null);
    setTouched({});
    setAttempted(false);
    setServerErrors({});
    setSuccess(null);
    scrollToTop();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setAttempted(true);
    setServerErrors({});

    const errors = validateAll(values, ctx);
    const errorCount = Object.keys(errors).length + (proof && !proofError ? 0 : 1);
    if (errorCount > 0 || !proof) {
      focusField(FIELD_ORDER.find((f) => errors[f]) ?? "proof");
      toast.error(errorCount === 1 ? "One answer needs your attention" : `${errorCount} answers need your attention`, {
        description: "Please check the highlighted fields.",
      });
      return;
    }

    const { file } = proof;
    try {
      setStage({ kind: "uploading", progress: 0 });
      const ticket = await postJson<UploadTicket>("/api/uploads", {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "application/pdf",
      });
      await uploadWithProgress(ticket, file, (progress) => setStage({ kind: "uploading", progress }));

      setStage({ kind: "saving" });
      const saved = await postJson<{ id: string; ref: string; createdAt: string }>("/api/submissions", {
        values,
        file: { key: ticket.key, name: file.name },
      });

      if (remember) storeDetails(values);
      setStage({ kind: "idle" });
      setSuccess({ ref: saved.ref, createdAt: saved.createdAt, values, fileName: file.name, fileSize: file.size });
      scrollToTop();
    } catch (error) {
      setStage({ kind: "idle" });
      const err = error instanceof SubmitError ? error : new SubmitError("Something went wrong. Please try again.");
      if (err.errors && Object.keys(err.errors).length > 0) {
        setServerErrors(err.errors);
        const first = FIELD_ORDER.find((f) => err.errors?.[f]) ?? (err.errors.proof ? "proof" : null);
        if (first) focusField(first);
      }
      toast.error(err.message);
    }
  };

  if (success) {
    return (
      <div ref={topRef} className="scroll-mt-6">
        <SubmissionSuccess info={success} onSubmitAnother={() => resetForm(true)} onStartFresh={() => resetForm(false)} />
      </div>
    );
  }

  const studentDone = STUDENT_FIELDS.filter((f) => !liveErrors[f]).length;
  const activityDone = ACTIVITY_FIELDS.filter((f) => !liveErrors[f]).length;
  const proofDone = proof ? 1 : 0;
  const total = STUDENT_FIELDS.length + ACTIVITY_FIELDS.length + 1;
  const done = studentDone + activityDone + proofDone;
  const percent = Math.round((done / total) * 100);

  const steps = [
    { anchor: "section-student", title: "Student details", done: studentDone, total: STUDENT_FIELDS.length },
    { anchor: "section-activity", title: "Activity details", done: activityDone, total: ACTIVITY_FIELDS.length },
    { anchor: "section-proof", title: "Proof of activity", done: proofDone, total: 1 },
  ];

  const startIso = anyToIso(values.startDate);
  const endIso = anyToIso(values.endDate);
  const duration = startIso && endIso ? daysInclusive(startIso, endIso) : null;
  const outsidePeriod = [startIso, endIso].some(
    (iso) => iso !== null && (iso < settings.periodStart || iso > settings.periodEnd),
  );
  const lyAuto = !lyChosen && Boolean(values.isLyExcp);
  const domain = settings.emailDomain;

  const tips = [
    "Submit the form once for each activity.",
    domain ? `Use your official @${domain} email ID.` : "Use your official college email ID.",
    "Enter dates as DD-MM-YYYY, or pick them from the calendar.",
    `Upload the proof as one PDF, up to ${maxUploadMb} MB.`,
    `Last date to submit: ${formatLongDate(settings.deadline)}.`,
  ];

  return (
    <div ref={topRef} className="grid scroll-mt-6 gap-6 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-8">
      <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-6">
        <div className="sticky top-3 z-20 rounded-2xl bg-white/90 px-4 py-3 shadow-card ring-1 ring-stone-900/5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-stone-600">
              {done} of {total} answers
            </span>
            <span className="tabular text-brand-700">{percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", percent === 100 ? "bg-emerald-600" : "bg-brand-700")}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <Section
            id="section-student"
            step={1}
            title="Student details"
            description="Tell us who you are."
            done={studentDone}
            total={STUDENT_FIELDS.length}
          >
            {welcomeName && (
              <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-gold-200 bg-gold-50/70 px-4 py-3 text-sm animate-fade-in">
                <Sparkles className="size-4 shrink-0 text-gold-600" />
                <p className="min-w-0 flex-1 text-stone-700">
                  <span className="font-semibold text-stone-900">Welcome back, {welcomeName}.</span> Your details are
                  filled in from last time. Just add the new activity.
                </p>
                <Button variant="ghost" size="xs" onClick={forgetDetails}>
                  Not you? Clear
                </Button>
              </div>
            )}
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              <Field id={fid("name")} label="Name" required error={errorOf("name")} className="sm:col-span-2">
                <TextInput
                  {...text("name")}
                  icon={<User />}
                  placeholder="Your full name"
                  autoComplete="name"
                  maxLength={FIELD_LIMITS.name}
                />
              </Field>
              <Field id={fid("rollNo")} label="Roll No" required error={errorOf("rollNo")}>
                <TextInput
                  {...text("rollNo")}
                  icon={<Hash />}
                  placeholder="e.g. 16010122001"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={FIELD_LIMITS.rollNo}
                />
              </Field>
              <Field id={fid("mobile")} label="Mobile No" required error={errorOf("mobile")}>
                <TextInput
                  {...text("mobile")}
                  onChange={(e) => update("mobile", e.target.value.replace(/[^\d+\s-]/g, ""))}
                  icon={<Phone />}
                  prefix="+91"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  autoComplete="tel-national"
                  maxLength={15}
                />
              </Field>
              <Field
                id={fid("email")}
                label="Email ID"
                required
                error={errorOf("email")}
                hint={domain ? `Use your official @${domain} email ID` : undefined}
                className="sm:col-span-2"
              >
                <TextInput
                  {...text("email")}
                  icon={<AtSign />}
                  type="email"
                  inputMode="email"
                  placeholder={domain ? `yourname@${domain}` : "yourname@example.com"}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={FIELD_LIMITS.email}
                />
              </Field>
              <Field id={fid("year")} label="Year" required asGroup error={errorOf("year")} className="sm:col-span-2">
                <ChoiceGroup
                  id={fid("year")}
                  value={values.year}
                  options={YEAR_CHOICES}
                  onChange={choose("year")}
                  invalid={Boolean(errorOf("year"))}
                  columns="grid-cols-2 sm:grid-cols-4"
                />
              </Field>
              <Field id={fid("branch")} label="Branch" required asGroup error={errorOf("branch")}>
                <ChoiceGroup
                  id={fid("branch")}
                  value={values.branch}
                  options={BRANCH_CHOICES}
                  onChange={choose("branch")}
                  invalid={Boolean(errorOf("branch"))}
                  columns="grid-cols-3"
                />
              </Field>
              <Field
                id={fid("isLyExcp")}
                label="Are you LY EXCP student?"
                required
                asGroup
                error={errorOf("isLyExcp")}
                hint={lyAuto ? "Selected from your year and branch. Change it if needed." : undefined}
              >
                <ChoiceGroup
                  id={fid("isLyExcp")}
                  value={values.isLyExcp}
                  options={YES_NO}
                  onChange={choose("isLyExcp")}
                  invalid={Boolean(errorOf("isLyExcp"))}
                  columns="grid-cols-2"
                />
              </Field>
            </div>
          </Section>

          <Section
            id="section-activity"
            step={2}
            title="Activity details"
            description="One activity or achievement per submission."
            done={activityDone}
            total={ACTIVITY_FIELDS.length}
          >
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              <Field
                id={fid("activityCategory")}
                label="Select Activity and Achievement"
                required
                error={errorOf("activityCategory")}
                className="sm:col-span-2"
              >
                <ActivitySelect
                  id={fid("activityCategory")}
                  value={values.activityCategory}
                  options={settings.activityCategories}
                  onChange={choose("activityCategory")}
                  onBlur={() => touch("activityCategory")}
                  invalid={Boolean(errorOf("activityCategory"))}
                />
              </Field>
              <Field
                id={fid("organiserParticipantName")}
                label="Organiser/Participant Name"
                required
                error={errorOf("organiserParticipantName")}
                hint="As mentioned on the certificate or proof"
                className="sm:col-span-2"
              >
                <TextInput
                  {...text("organiserParticipantName")}
                  placeholder="Name of the organiser or participant"
                  maxLength={FIELD_LIMITS.organiserParticipantName}
                />
              </Field>
              <Field
                id={fid("activityName")}
                label="Name of Activity"
                required
                error={errorOf("activityName")}
                className="sm:col-span-2"
              >
                <TextInput
                  {...text("activityName")}
                  placeholder="e.g. Smart India Hackathon 2025"
                  maxLength={FIELD_LIMITS.activityName}
                />
              </Field>
              <Field
                id={fid("activityDetails")}
                label="Details of Activity"
                required
                error={errorOf("activityDetails")}
                aside={<CharCount value={values.activityDetails} max={FIELD_LIMITS.activityDetails} />}
                className="sm:col-span-2"
              >
                <TextArea
                  {...text("activityDetails")}
                  rows={4}
                  placeholder="Describe the activity: your role, team, position or prize won, and the outcome."
                  maxLength={FIELD_LIMITS.activityDetails}
                />
              </Field>
              <Field
                id={fid("activityLevel")}
                label="Activity Level"
                required
                asGroup
                error={errorOf("activityLevel")}
                className="sm:col-span-2"
              >
                <ChoiceGroup
                  id={fid("activityLevel")}
                  value={values.activityLevel}
                  options={LEVEL_CHOICES}
                  onChange={choose("activityLevel")}
                  invalid={Boolean(errorOf("activityLevel"))}
                  variant="card"
                  columns="grid-cols-1 sm:grid-cols-2"
                />
              </Field>
              <Field id={fid("startDate")} label="Start Date of activity" required error={errorOf("startDate")}>
                <DateField
                  id={fid("startDate")}
                  value={values.startDate}
                  onChange={(v) => update("startDate", v)}
                  onBlur={() => touch("startDate")}
                  invalid={Boolean(errorOf("startDate"))}
                  defaultMonth={settings.periodStart}
                  describedBy={errorOf("startDate") ? `${fid("startDate")}-error` : undefined}
                />
              </Field>
              <Field id={fid("endDate")} label="End Date of activity" required error={errorOf("endDate")}>
                <DateField
                  id={fid("endDate")}
                  value={values.endDate}
                  onChange={(v) => update("endDate", v)}
                  onBlur={() => touch("endDate")}
                  invalid={Boolean(errorOf("endDate"))}
                  defaultMonth={startIso ?? settings.periodStart}
                  describedBy={errorOf("endDate") ? `${fid("endDate")}-error` : undefined}
                />
              </Field>
              {(duration || outsidePeriod) && (
                <div className="space-y-2 sm:col-span-2">
                  {duration && (
                    <p className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 animate-fade-in">
                      <CalendarRange className="size-3.5" />
                      {startIso === endIso
                        ? `Single-day activity on ${formatShortDate(startIso!)}`
                        : `${plural(duration, "day")} · ${formatShortDate(startIso!)} to ${formatShortDate(endIso!)}`}
                    </p>
                  )}
                  {outsidePeriod && (
                    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-5 text-amber-800 animate-fade-in">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      These dates fall outside the reporting period ({formatShortDate(settings.periodStart)} to{" "}
                      {formatShortDate(settings.periodEnd)}). Please double-check them.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section
            id="section-proof"
            step={3}
            title="Proof of Activity"
            description="Upload a single PDF: certificate, letter or any other proof."
            done={proofDone}
            total={1}
          >
            <Field
              id={fid("proof")}
              label="Proof of Activity (Upload Single PDF)"
              required
              asGroup
              error={proofMessage}
              hint="Have more than one page or certificate? Combine them into a single PDF before uploading."
            >
              <PdfDrop
                id={fid("proof")}
                proof={proof}
                onSelect={selectProof}
                onRemove={removeProof}
                invalid={Boolean(proofMessage)}
                maxMb={maxUploadMb}
                disabled={busy}
              />
            </Field>
          </Section>
        </fieldset>

        <div className="rounded-[28px] bg-white p-5 shadow-card ring-1 ring-stone-900/5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-start gap-3">
              <Switch checked={remember} onCheckedChange={changeRemember} disabled={busy} className="mt-0.5" />
              <span className="text-sm">
                <span className="block font-medium text-stone-800">Remember my details</span>
                <span className="block text-xs leading-5 text-stone-500">
                  Fills in your student details next time, on this device only.
                </span>
              </span>
            </label>
            <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto sm:min-w-56">
              {busy ? (
                <>
                  <Spinner />
                  {stage.kind === "uploading" ? `Uploading… ${stage.progress}%` : "Saving your response…"}
                </>
              ) : (
                <>
                  Submit activity
                  <ArrowRight />
                </>
              )}
            </Button>
          </div>
          {busy && proof && (
            <div className="mt-5 animate-fade-in">
              <div className="flex justify-between gap-4 text-xs font-medium text-stone-600">
                <span className="truncate">
                  {stage.kind === "uploading" ? `Uploading ${proof.file.name}` : "Upload complete. Saving your answers…"}
                </span>
                <span className="tabular">{stage.kind === "uploading" ? `${stage.progress}%` : "100%"}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-800 transition-[width] duration-300"
                  style={{ width: `${stage.kind === "uploading" ? Math.max(3, stage.progress) : 100}%` }}
                />
              </div>
            </div>
          )}
          <p className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-5 text-xs text-stone-500">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            Your response is stored securely and is visible only to authorised faculty.
          </p>
        </div>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-900/5">
            <div className="flex items-center gap-4 px-1">
              <ProgressRing percent={percent} />
              <div>
                <p className="font-semibold text-stone-900">{percent === 100 ? "Ready to submit" : "Your progress"}</p>
                <p className="text-sm text-stone-500">
                  {done} of {total} answers
                </p>
              </div>
            </div>
            <ol className="mt-5 space-y-0.5">
              {steps.map((s, index) => {
                const complete = s.done === s.total;
                return (
                  <li key={s.anchor}>
                    <button
                      type="button"
                      onClick={() => document.getElementById(s.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-stone-50"
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                          complete ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600",
                        )}
                      >
                        {complete ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                      </span>
                      <span className="flex-1 font-medium text-stone-700">{s.title}</span>
                      <span className="text-xs tabular text-stone-400">
                        {s.done}/{s.total}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white shadow-card">
            <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-brand-600/35 blur-3xl" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">Before you submit</p>
            <ul className="relative mt-4 space-y-3 text-[13px] leading-5 text-white/75">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold-300" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

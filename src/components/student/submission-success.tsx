"use client";

import { useState } from "react";
import { Check, Copy, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { anyToIso, formatDateRange, formatTimestamp } from "@/lib/dates";
import { describeCategory } from "@/lib/form-config";
import { formatBytes } from "@/lib/utils";
import type { StudentFormValues } from "@/lib/validation";

export type SuccessInfo = {
  ref: string;
  createdAt: string;
  values: StudentFormValues;
  fileName: string;
  fileSize: number;
};

export function SubmissionSuccess({
  info,
  onSubmitAnother,
  onStartFresh,
}: {
  info: SuccessInfo;
  onSubmitAnother: () => void;
  onStartFresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { values } = info;
  const firstName = values.name.trim().split(/\s+/)[0] ?? "";
  const start = anyToIso(values.startDate) ?? "";
  const end = anyToIso(values.endDate) ?? "";

  const rows: [string, string][] = [
    ["Name", values.name.trim()],
    ["Roll No", values.rollNo.trim().toUpperCase()],
    ["Class", `${values.year} · ${values.branch}`],
    ["Activity type", describeCategory(values.activityCategory).title],
    ["Name of activity", values.activityName.trim()],
    ["Level", values.activityLevel],
    ["Dates", formatDateRange(start, end)],
    ["Proof", `${info.fileName} (${formatBytes(info.fileSize)})`],
    ["Submitted", `${formatTimestamp(info.createdAt)} IST`],
  ];

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(info.ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable on insecure origins; the reference stays visible on screen.
    }
  };

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-card ring-1 ring-stone-900/5 animate-fade-up">
      <div className="relative bg-gradient-to-b from-emerald-50/80 to-white px-6 pb-8 pt-12 text-center sm:px-12">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-white shadow-[0_10px_30px_-10px_rgb(5_150_105/0.5)] ring-8 ring-emerald-100/70 animate-pop">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-600 text-white">
            <Check className="size-7" strokeWidth={3} />
          </span>
        </div>
        <h2 className="mt-7 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Submission received
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-stone-600">
          Thank you{firstName ? `, ${firstName}` : ""}. Your activity has been recorded successfully. Keep the reference
          number for your records.
        </p>

        <div className="mx-auto mt-7 inline-flex items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 py-2.5 pl-5 pr-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Reference No.</span>
          <span className="font-mono text-lg font-semibold tracking-wide text-brand-900">{info.ref}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Copy reference number" onClick={copyRef}>
            {copied ? <Check className="text-emerald-600" /> : <Copy />}
          </Button>
        </div>
      </div>

      <dl className="mx-6 divide-y divide-stone-100 rounded-2xl border border-stone-200 text-sm sm:mx-12">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-4 px-4 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="text-stone-500">{label}</dt>
            <dd className="min-w-0 break-words font-medium text-stone-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-8 sm:flex-row sm:justify-center sm:px-12">
        <Button size="lg" onClick={onSubmitAnother} className="w-full sm:w-auto">
          <Plus />
          Submit another activity
        </Button>
        <Button size="lg" variant="secondary" onClick={onStartFresh} className="w-full sm:w-auto">
          <RotateCcw />
          Start a new form
        </Button>
      </div>
      <p className="border-t border-stone-100 bg-stone-50/70 px-6 py-4 text-center text-xs text-stone-500">
        “Submit another activity” keeps your student details, so you only fill in the new activity.
      </p>
    </div>
  );
}

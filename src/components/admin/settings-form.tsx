"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { anyToIso, isoToDmy } from "@/lib/dates";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@/lib/form-config";
import type { FormSettings, SettingsErrors } from "@/lib/settings";
import { PageHeader } from "./page-header";

type Draft = Omit<FormSettings, "periodStart" | "periodEnd" | "deadline"> & {
  periodStart: string;
  periodEnd: string;
  deadline: string;
};

type SystemInfo = { storageMode: string; maxUploadMb: number; dataLocation: string; total: number };

const toDraft = (s: FormSettings): Draft => ({
  ...s,
  periodStart: isoToDmy(s.periodStart),
  periodEnd: isoToDmy(s.periodEnd),
  deadline: isoToDmy(s.deadline),
  activityCategories: [...s.activityCategories],
});

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-stone-900/5 sm:p-7 lg:grid-cols-[260px_1fr]">
      <div>
        <h2 className="font-semibold text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  );
}

export function SettingsForm({
  settings,
  categoryCounts,
  system,
}: {
  settings: FormSettings;
  categoryCounts: Record<string, number>;
  system: SystemInfo;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toDraft(settings));
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [newOption, setNewOption] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const moveOption = (i: number, delta: number) => {
    const list = [...draft.activityCategories];
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("activityCategories", list);
  };

  const addOption = () => {
    const v = newOption.replace(/\s+/g, " ").trim();
    if (!v) return;
    if (draft.activityCategories.some((c) => c.toLowerCase() === v.toLowerCase())) {
      toast.error("That option already exists.");
      return;
    }
    set("activityCategories", [...draft.activityCategories, v]);
    setNewOption("");
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    const payload = {
      ...draft,
      periodStart: anyToIso(draft.periodStart) ?? "",
      periodEnd: anyToIso(draft.periodEnd) ?? "",
      deadline: anyToIso(draft.deadline) ?? "",
      activityCategories: draft.activityCategories.map((c) => c.trim()).filter(Boolean),
    };
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.errors) setErrors(data.errors);
        toast.error(data?.error ?? "Could not save settings.");
        return;
      }
      const next = toDraft(data.settings as FormSettings);
      setSaved(next);
      setDraft(next);
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <PageHeader eyebrow="Settings" title="Form settings" description="Control what students see and when they can submit." />

      <Section title="Form status" description="Close the form when the collection period is over.">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-200 p-4">
          <span>
            <span className="block font-medium text-stone-900">Accepting responses</span>
            <span className="block text-sm text-stone-500">
              {draft.acceptingResponses ? "Students can submit the form." : "Students see the closed message below."}
            </span>
          </span>
          <Switch checked={draft.acceptingResponses} onCheckedChange={(v) => set("acceptingResponses", v)} />
        </label>
        <Field id="closedMessage" label="Message shown when the form is closed" error={errors.closedMessage}>
          <TextArea id="closedMessage" rows={3} value={draft.closedMessage} onChange={(e) => set("closedMessage", e.target.value)} />
        </Field>
      </Section>

      <Section title="Header & period" description="Shown at the top of the student form.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="institutionName" label="Institution name" error={errors.institutionName}>
            <TextInput id="institutionName" value={draft.institutionName} onChange={(e) => set("institutionName", e.target.value)} invalid={Boolean(errors.institutionName)} />
          </Field>
          <Field id="institutionSubtitle" label="Subtitle">
            <TextInput id="institutionSubtitle" value={draft.institutionSubtitle} onChange={(e) => set("institutionSubtitle", e.target.value)} />
          </Field>
          <Field id="formTitle" label="Form title" error={errors.formTitle} className="sm:col-span-2">
            <TextInput id="formTitle" value={draft.formTitle} onChange={(e) => set("formTitle", e.target.value)} invalid={Boolean(errors.formTitle)} />
          </Field>
          <Field id="periodStart" label="Period starts" error={errors.periodStart}>
            <DateField id="periodStart" value={draft.periodStart} onChange={(v) => set("periodStart", v)} invalid={Boolean(errors.periodStart)} />
          </Field>
          <Field id="periodEnd" label="Period ends" error={errors.periodEnd}>
            <DateField id="periodEnd" value={draft.periodEnd} onChange={(v) => set("periodEnd", v)} invalid={Boolean(errors.periodEnd)} />
          </Field>
          <Field id="deadline" label="Submission deadline" error={errors.deadline} hint="Shown to students. Closing the form is a separate switch above.">
            <DateField id="deadline" value={draft.deadline} onChange={(v) => set("deadline", v)} invalid={Boolean(errors.deadline)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Activity options"
        description="Options in “Select Activity and Achievement”. Removing an option keeps existing responses unchanged."
      >
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          {draft.activityCategories.map((c, i) => (
            <li key={i} className="flex items-center gap-2 p-2">
              <span className="w-6 text-center text-xs tabular text-stone-400">{i + 1}</span>
              <input
                value={c}
                onChange={(e) => {
                  const list = [...draft.activityCategories];
                  list[i] = e.target.value;
                  set("activityCategories", list);
                }}
                aria-label={`Option ${i + 1}`}
                className="h-9 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-sm outline-none hover:border-stone-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
              />
              <span className="hidden shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium tabular text-stone-500 sm:inline">
                {categoryCounts[c] ?? 0} responses
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => moveOption(i, -1)}>
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={i === draft.activityCategories.length - 1}
                onClick={() => moveOption(i, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="danger-ghost"
                size="icon-sm"
                aria-label="Remove option"
                onClick={() => set("activityCategories", draft.activityCategories.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        {errors.activityCategories && <p className="text-sm text-red-600">{errors.activityCategories}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <TextInput
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder="Add a new option, e.g. Internship Completed"
            />
          </div>
          <Button variant="secondary" size="lg" onClick={addOption}>
            <Plus />
            Add
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => set("activityCategories", [...DEFAULT_ACTIVITY_CATEGORIES])}>
          <RotateCcw />
          Reset to the original Google Form options
        </Button>
      </Section>

      <Section title="Email rule" description="Students must use an email ID on this domain.">
        <Field id="emailDomain" label="Allowed email domain" error={errors.emailDomain} hint="Leave empty to accept any email address.">
          <TextInput id="emailDomain" prefix="@" value={draft.emailDomain} onChange={(e) => set("emailDomain", e.target.value)} invalid={Boolean(errors.emailDomain)} />
        </Field>
      </Section>

      <Section title="System" description="Configured on the server through environment variables.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Storage", system.storageMode === "supabase" ? "Supabase (cloud database + storage)" : "Local (SQLite + files on disk)"],
            ["Data location", system.dataLocation],
            ["Max PDF size", `${system.maxUploadMb} MB`],
            ["Total responses", system.total.toLocaleString("en-IN")],
            ["Admin password", "Set with ADMIN_PASSWORD"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
              <dt className="text-xs text-stone-500">{k}</dt>
              <dd className="mt-0.5 break-all font-medium text-stone-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {dirty && (
        <div className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink-900 p-2 pl-4 text-white shadow-float animate-slide-up lg:left-[calc(50%+8rem)]">
          <p className="mr-auto text-sm font-medium">You have unsaved changes</p>
          <Button variant="ghost" size="sm" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setDraft(saved)} disabled={saving}>
            Discard
          </Button>
          <Button variant="gold" size="sm" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <Save />}
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}

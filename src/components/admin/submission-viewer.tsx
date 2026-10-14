"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Mail,
  Phone,
  SquareArrowOutUpRight,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, ClassBadges, LevelBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { daysInclusive, formatDateRange, formatTimestamp } from "@/lib/dates";
import { describeCategory } from "@/lib/form-config";
import type { Submission } from "@/lib/types";
import { formatBytes, formatRef, plural } from "@/lib/utils";

type Props = {
  items: Submission[];
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  onDelete: (ids: string[]) => Promise<boolean>;
  duplicates?: Set<string>;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-stone-900">{children}</dd>
    </div>
  );
}

function detailsText(s: Submission) {
  return [
    `Ref: ${formatRef(s.seq)}`,
    `Name: ${s.name}`,
    `Roll No: ${s.rollNo}`,
    `Email: ${s.email}`,
    `Mobile: ${s.mobile}`,
    `Class: ${s.year} ${s.branch}`,
    `LY EXCP student: ${s.isLyExcp ? "Yes" : "No"}`,
    `Activity type: ${s.activityCategory}`,
    `Organiser/Participant: ${s.organiserParticipantName}`,
    `Name of activity: ${s.activityName}`,
    `Level: ${s.activityLevel}`,
    `Dates: ${formatDateRange(s.startDate, s.endDate)}`,
    `Details: ${s.activityDetails}`,
    `Submitted: ${formatTimestamp(s.createdAt)} IST`,
  ].join("\n");
}

function PdfPane({ s }: { s: Submission }) {
  const [loaded, setLoaded] = useState(false);
  const src = `/api/admin/files/${s.id}`;
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-stone-200/70">
      <div className="hidden min-h-0 flex-1 md:flex">
        {!loaded && (
          <div className="absolute inset-4 flex flex-col gap-3 rounded-xl bg-white p-8">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton mt-6 flex-1" />
          </div>
        )}
        <iframe
          key={s.id}
          src={`${src}#view=FitH`}
          title={`Proof of activity: ${s.fileName}`}
          onLoad={() => setLoaded(true)}
          className="h-full w-full flex-1 border-0 bg-white"
        />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center md:hidden">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-brand-700 shadow-card">
          <FileText className="size-6" />
        </span>
        <p className="text-sm text-stone-600">{s.fileName}</p>
        <a href={src} target="_blank" rel="noreferrer" className={buttonClasses({ size: "md" })}>
          <SquareArrowOutUpRight />
          Open PDF
        </a>
      </div>
    </div>
  );
}

export function SubmissionViewer({ items, openId, onOpenChange, onDelete, duplicates }: Props) {
  const index = openId ? items.findIndex((s) => s.id === openId) : -1;
  const s = index >= 0 ? items[index] : null;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const go = (delta: number) => {
    const next = items[index + delta];
    if (next) onOpenChange(next.id);
  };

  useEffect(() => {
    if (!s) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") {
        const next = items[index + 1];
        if (next) onOpenChange(next.id);
      } else if (e.key === "ArrowLeft") {
        const prev = items[index - 1];
        if (prev) onOpenChange(prev.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, items, index, onOpenChange]);

  const remove = async () => {
    if (!s) return;
    setDeleting(true);
    const nextId = items[index + 1]?.id ?? items[index - 1]?.id ?? null;
    const ok = await onDelete([s.id]);
    setDeleting(false);
    setConfirming(false);
    if (ok) onOpenChange(nextId);
  };

  const copy = async () => {
    if (!s) return;
    try {
      await navigator.clipboard.writeText(detailsText(s));
      toast.success("Details copied");
    } catch {
      toast.error("Copy isn't available here.");
    }
  };

  const category = s ? describeCategory(s.activityCategory) : null;
  const days = s ? daysInclusive(s.startDate, s.endDate) : null;

  return (
    <Dialog open={Boolean(s)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent className="inset-0 flex flex-col overflow-hidden bg-white sm:inset-3 sm:rounded-3xl lg:inset-5">
        {s && category && (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
              <Badge className="bg-brand-50 font-mono text-brand-800 ring-brand-200">{formatRef(s.seq)}</Badge>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold text-stone-900">{s.name}</DialogTitle>
                <DialogDescription className="truncate text-xs text-stone-500">
                  {s.rollNo} · {s.activityName}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 hidden text-xs tabular text-stone-500 sm:inline">
                  {index + 1} of {items.length}
                </span>
                <Button variant="ghost" size="icon-sm" aria-label="Previous response" disabled={index <= 0} onClick={() => go(-1)}>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next response"
                  disabled={index >= items.length - 1}
                  onClick={() => go(1)}
                >
                  <ChevronRight />
                </Button>
                <span className="mx-1 h-5 w-px bg-stone-200" />
                <a
                  href={`/api/admin/files/${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}
                >
                  <SquareArrowOutUpRight />
                  New tab
                </a>
                <a
                  href={`/api/admin/files/${s.id}?download=1`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  <Download />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <DialogClose className={buttonClasses({ variant: "ghost", size: "icon-sm" })} aria-label="Close">
                  <X />
                </DialogClose>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <aside className="scrollbar-thin max-h-[55%] shrink-0 overflow-y-auto border-b border-stone-200 md:max-h-none md:w-[400px] md:border-b-0 md:border-r">
                <div className="space-y-6 p-5">
                  {duplicates?.has(s.id) && (
                    <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <TriangleAlert className="size-4 shrink-0" />
                      Possible duplicate: this student submitted another activity with the same name and start date.
                    </p>
                  )}
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Student</h3>
                    <dl className="mt-1 divide-y divide-stone-100">
                      <Row label="Name">{s.name}</Row>
                      <Row label="Roll No">{s.rollNo}</Row>
                      <Row label="Class">
                        <ClassBadges year={s.year} branch={s.branch} />
                      </Row>
                      <Row label="LY EXCP">{s.isLyExcp ? "Yes" : "No"}</Row>
                      <Row label="Email">
                        <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                          <Mail className="size-3.5" />
                          {s.email}
                        </a>
                      </Row>
                      <Row label="Mobile">
                        <a href={`tel:+91${s.mobile}`} className="inline-flex items-center gap-1.5 tabular text-brand-700 hover:underline">
                          <Phone className="size-3.5" />
                          {s.mobile}
                        </a>
                      </Row>
                    </dl>
                  </section>
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Activity</h3>
                    <dl className="mt-1 divide-y divide-stone-100">
                      <Row label="Type">
                        {category.title}
                        {category.hint && <span className="block text-xs font-normal text-stone-500">{category.hint}</span>}
                      </Row>
                      <Row label="Name">{s.activityName}</Row>
                      <Row label="Organiser / Participant">{s.organiserParticipantName}</Row>
                      <Row label="Level">
                        <LevelBadge level={s.activityLevel} />
                      </Row>
                      <Row label="Dates">
                        {formatDateRange(s.startDate, s.endDate)}
                        {days && <span className="block text-xs font-normal text-stone-500">{plural(days, "day")}</span>}
                      </Row>
                    </dl>
                    <div className="mt-3 rounded-xl bg-stone-50 p-3.5 text-sm leading-relaxed whitespace-pre-wrap text-stone-700 ring-1 ring-stone-100">
                      {s.activityDetails}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Submission</h3>
                    <dl className="mt-1 divide-y divide-stone-100">
                      <Row label="Submitted">{formatTimestamp(s.createdAt)} IST</Row>
                      <Row label="Proof file">
                        {s.fileName}
                        <span className="block text-xs font-normal text-stone-500">{formatBytes(s.fileSize)}</span>
                      </Row>
                    </dl>
                  </section>
                  <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-5">
                    <Button variant="secondary" size="sm" onClick={copy}>
                      <Copy />
                      Copy details
                    </Button>
                    <Button variant="danger-ghost" size="sm" onClick={() => setConfirming(true)}>
                      <Trash2 />
                      Delete response
                    </Button>
                  </div>
                </div>
              </aside>
              <PdfPane key={s.id} s={s} />
            </div>

            <ConfirmDialog
              open={confirming}
              onOpenChange={setConfirming}
              title="Delete this response?"
              description={`${s.name}'s response "${s.activityName}" and its proof PDF will be permanently deleted. This can't be undone.`}
              confirmLabel="Delete permanently"
              onConfirm={remove}
              busy={deleting}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, type DragEvent } from "react";
import { Eye, EyeOff, FileUp, RefreshCw, SquareArrowOutUpRight, X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button, buttonClasses } from "./button";

export type ProofFile = { file: File; url: string };

type Props = {
  id: string;
  proof: ProofFile | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  invalid?: boolean;
  maxMb: number;
  disabled?: boolean;
};

export function PdfIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid h-12 w-10 shrink-0 place-items-end", className)} aria-hidden="true">
      <svg viewBox="0 0 40 48" className="absolute inset-0 h-full w-full">
        <path d="M6 1h20l13 13v29a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4z" fill="#fff" stroke="#e7e5e4" strokeWidth="1.5" />
        <path d="M26 1v9a4 4 0 0 0 4 4h9" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="1.5" />
      </svg>
      <span className="relative mb-1.5 mr-auto -ml-1 rounded-[4px] bg-brand-700 px-1 py-px text-[9px] font-bold tracking-wide text-white shadow-sm">
        PDF
      </span>
    </span>
  );
}

export function PdfDrop({ id, proof, onSelect, onRemove, invalid, maxMb, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelect(file);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(event.dataTransfer.files);
  };

  const input = (
    <input
      id={id}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        handleFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (!proof) {
    return (
      <div>
        {input}
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 sm:py-12",
            dragging
              ? "border-brand-500 bg-brand-50/70 scale-[1.01]"
              : invalid
                ? "border-red-300 bg-red-50/30 hover:border-red-400"
                : "border-stone-300 bg-stone-50/50 hover:border-brand-400 hover:bg-brand-50/30",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <span
            className={cn(
              "grid size-14 place-items-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-stone-900/5 transition-transform duration-200 group-hover:-translate-y-0.5",
              dragging && "-translate-y-1",
            )}
          >
            <FileUp className="size-6" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-stone-900">
              {dragging ? "Drop your PDF to attach it" : "Drag & drop your proof PDF here"}
            </span>
            <span className="mt-1 block text-sm text-stone-500">
              or <span className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-4">browse your files</span>
            </span>
          </span>
          <span className="flex flex-wrap justify-center gap-1.5 text-xs font-medium text-stone-500">
            {["PDF only", "Single file", `Up to ${maxMb} MB`].map((t) => (
              <span key={t} className="rounded-full bg-white px-2.5 py-1 ring-1 ring-stone-200">
                {t}
              </span>
            ))}
          </span>
        </label>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgb(28_25_23/0.04)] animate-fade-in"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {input}
      <div className="flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap">
        <PdfIcon />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900" title={proof.file.name}>
            {proof.file.name}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {formatBytes(proof.file.size)} · PDF · <span className="text-emerald-700">Ready to upload</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? <EyeOff /> : <Eye />}
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <a href={proof.url} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "ghost", size: "sm", className: "md:hidden" })}>
            <SquareArrowOutUpRight />
            Preview
          </a>
          <label htmlFor={id} className={buttonClasses({ variant: "secondary", size: "sm", className: disabled ? "pointer-events-none opacity-60" : "" })}>
            <RefreshCw />
            Replace
          </label>
          <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={onRemove} disabled={disabled}>
            <X />
          </Button>
        </div>
      </div>
      {showPreview && (
        <div className="hidden border-t border-stone-200 bg-stone-100/80 p-2 md:block">
          <iframe src={`${proof.url}#view=FitH`} title="Preview of the selected PDF" className="h-[460px] w-full rounded-xl bg-white" />
        </div>
      )}
    </div>
  );
}

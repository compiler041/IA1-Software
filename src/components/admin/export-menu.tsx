"use client";

import { useState, type ComponentType } from "react";
import { ChevronDown, Download, FileArchive, FileSpreadsheet, ListFilter } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { toast } from "sonner";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { downloadExcel, downloadZip } from "./exports";

type View = { ids: string[]; label: string };

export async function exportExcel(ids?: string[]) {
  const id = toast.loading("Preparing the Excel file…");
  try {
    await downloadExcel(ids);
    toast.success("Excel file downloaded", { id });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not create the Excel file.", { id });
  }
}

export function exportZip(ids?: string[]) {
  downloadZip(ids, (message) => toast.error(message));
  toast("Preparing the ZIP with proof PDFs…", {
    description: "The download starts in a moment. Large exports can take a little while.",
  });
}

function Item({
  icon: Icon,
  title,
  description,
  count,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={count === 0}
      className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-stone-100 data-[disabled]:opacity-50"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3 text-sm font-medium text-stone-900">
          {title}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold tabular text-stone-600">
            {count.toLocaleString("en-IN")}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-stone-500">{description}</span>
      </span>
    </DropdownMenu.Item>
  );
}

export function ExportMenu({
  total,
  view,
  variant = "primary",
}: {
  total: number;
  view?: View | null;
  variant?: ButtonVariant;
}) {
  const [busy, setBusy] = useState(false);

  const excel = async (ids?: string[]) => {
    setBusy(true);
    await exportExcel(ids);
    setBusy(false);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant={variant} disabled={busy}>
          {busy ? <Spinner /> : <Download />}
          Export
          <ChevronDown className="opacity-70" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-stone-200 bg-white p-1.5 shadow-float outline-none data-[state=open]:animate-scale-in"
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Excel workbook
          </DropdownMenu.Label>
          <Item
            icon={FileSpreadsheet}
            title="All responses"
            description="Responses, summary and student sheets, with a link to every proof."
            count={total}
            onSelect={() => void excel()}
          />
          {view && (
            <Item
              icon={ListFilter}
              title={view.label}
              description="Only the rows in the current view, in the same order."
              count={view.ids.length}
              onSelect={() => void excel(view.ids)}
            />
          )}
          <DropdownMenu.Separator className="mx-2 my-1.5 h-px bg-stone-100" />
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            ZIP with proof PDFs
          </DropdownMenu.Label>
          <Item
            icon={FileArchive}
            title="All responses + PDFs"
            description="The Excel workbook plus every proof, in folders by branch and year."
            count={total}
            onSelect={() => exportZip()}
          />
          {view && (
            <Item
              icon={FileArchive}
              title={`${view.label} + PDFs`}
              description="Proofs for the rows in the current view only."
              count={view.ids.length}
              onSelect={() => exportZip(view.ids)}
            />
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

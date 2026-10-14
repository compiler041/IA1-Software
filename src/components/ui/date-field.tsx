"use client";

import "react-day-picker/style.css";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Popover } from "radix-ui";
import { DayPicker } from "react-day-picker";
import { anyToIso, isoToDmy, isoToLocalDate, isValidIsoDate, localDateToIso } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { inputBase, inputTone } from "./field";

type Props = {
  id: string;
  /** DD-MM-YYYY text (partial while typing). */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  /** ISO date the calendar opens on when nothing is selected yet. */
  defaultMonth?: string;
  describedBy?: string;
};

const THIS_YEAR = new Date().getFullYear();

function formatTyping(previous: string, next: string): string {
  if (isValidIsoDate(next.trim())) return isoToDmy(next.trim());
  const cleaned = next.replace(/[^\d\-/.]/g, "");
  if (cleaned.length < previous.length) return cleaned;
  const digits = cleaned.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `-${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `-${digits.slice(4, 8)}`;
  if (digits.length === 2 || digits.length === 4) out += "-";
  return out;
}

export function DateField({ id, value, onChange, onBlur, invalid, disabled, defaultMonth, describedBy }: Props) {
  const [open, setOpen] = useState(false);
  const iso = anyToIso(value);
  const selected = iso ? isoToLocalDate(iso) : undefined;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="relative">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="DD-MM-YYYY"
            maxLength={10}
            value={value}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange(formatTyping(value, e.target.value))}
            onBlur={onBlur}
            className={cn(inputBase, inputTone(invalid), "h-12 pl-3.5 pr-12 tabular tracking-wide")}
          />
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Choose date from calendar"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 data-[state=open]:bg-brand-50 data-[state=open]:text-brand-700"
            >
              <CalendarDays className="size-[18px]" />
            </button>
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="sa-calendar z-50 rounded-2xl border border-stone-200 bg-white p-3 shadow-float outline-none data-[state=open]:animate-scale-in"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(isoToDmy(localDateToIso(date)));
              setOpen(false);
              onBlur?.();
            }}
            defaultMonth={selected ?? (defaultMonth ? isoToLocalDate(defaultMonth) : undefined)}
            captionLayout="dropdown"
            startMonth={new Date(THIS_YEAR - 8, 0)}
            endMonth={new Date(THIS_YEAR + 2, 11)}
            weekStartsOn={1}
            showOutsideDays
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

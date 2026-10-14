"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover } from "radix-ui";
import { describeCategory } from "@/lib/form-config";
import { cn } from "@/lib/utils";
import { inputBase, inputTone } from "./field";

type Props = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
};

/** Searchable single-select for the "Select Activity and Achievement" question. */
export function ActivitySelect({ id, value, options, onChange, onBlur, invalid, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const selected = value ? describeCategory(value) : null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(Math.max(0, options.indexOf(value)));
    } else {
      onBlur?.();
    }
  };

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    onBlur?.();
  };

  const move = (index: number) => {
    setActive(index);
    itemRefs.current[index]?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move((active + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move((active - 1 + filtered.length) % filtered.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(filtered.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[Math.min(active, filtered.length - 1)];
      if (option) choose(option);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            inputBase,
            inputTone(invalid),
            "flex min-h-12 items-center gap-3 px-3.5 py-2.5 text-left data-[state=open]:border-brand-500 data-[state=open]:ring-4 data-[state=open]:ring-brand-500/10",
          )}
        >
          <span className="min-w-0 flex-1">
            {selected ? (
              <>
                <span className="block truncate font-medium text-stone-900">{selected.title}</span>
                {selected.hint && <span className="block truncate text-xs text-stone-500">{selected.hint}</span>}
              </>
            ) : (
              <span className="text-stone-400">Choose the type of activity or achievement</span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-stone-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 flex max-h-[min(26rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-[18rem] flex-col rounded-2xl border border-stone-200 bg-white p-1.5 shadow-float outline-none data-[state=open]:animate-scale-in"
        >
          <div className="relative mb-1.5 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search activity types…"
              aria-controls={`${id}-listbox`}
              aria-activedescendant={filtered[active] ? `${id}-opt-${active}` : undefined}
              className="h-10 w-full rounded-xl bg-stone-100/80 pl-9 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <ul id={`${id}-listbox`} role="listbox" className="scrollbar-thin -mr-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {filtered.map((option, index) => {
              const { title, hint } = describeCategory(option);
              const isSelected = option === value;
              return (
                <li
                  key={option}
                  id={`${id}-opt-${index}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  data-active={index === active}
                  onMouseMove={() => active !== index && setActive(index)}
                  onClick={() => choose(option)}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors data-[active=true]:bg-brand-50/80"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors",
                      isSelected ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white",
                    )}
                  >
                    {isSelected && <Check className="size-3" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm leading-5", isSelected ? "font-semibold text-brand-900" : "font-medium text-stone-900")}>
                      {title}
                    </span>
                    {hint && <span className="mt-0.5 block text-xs leading-4 text-stone-500">{hint}</span>}
                  </span>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-stone-500">No activity type matches “{query}”.</li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

import { CalendarClock, FileCheck2, Layers } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { academicYearLabel, formatLongDate } from "@/lib/dates";
import type { FormSettings } from "@/lib/settings";

function FormTitle({ title }: { title: string }) {
  const parts = title.split(/\s+and\s+/i);
  if (parts.length !== 2) return <>{title}</>;
  return (
    <>
      {parts[0]} <span className="font-display italic font-normal text-gold-300">&amp;</span> {parts[1]}
    </>
  );
}

export function SiteHero({ settings, maxUploadMb }: { settings: FormSettings; maxUploadMb: number }) {
  const year = academicYearLabel(settings.periodStart, settings.periodEnd);
  const facts = [
    {
      icon: CalendarClock,
      title: `Submit by ${formatLongDate(settings.deadline)}`,
      text: `Covers activities from ${formatLongDate(settings.periodStart)} to ${formatLongDate(settings.periodEnd)}`,
    },
    {
      icon: Layers,
      title: "One activity per submission",
      text: "For each activity, kindly submit the form again",
    },
    {
      icon: FileCheck2,
      title: "Proof as a single PDF",
      text: `Certificate or letter, up to ${maxUploadMb} MB`,
    },
  ];

  return (
    <header className="relative isolate overflow-hidden bg-ink-950 text-white">
      <div className="absolute inset-0 -z-10 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute -left-40 -top-40 -z-10 size-[36rem] rounded-full bg-brand-700/40 blur-[120px]" />
      <div className="absolute -right-32 top-10 -z-10 size-[28rem] rounded-full bg-gold-500/15 blur-[110px]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-gold-300/40 to-transparent" />

      <div className="mx-auto max-w-6xl px-5 pb-32 pt-6 sm:px-8 sm:pb-36 lg:pb-40">
        <nav className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-semibold tracking-tight">{settings.institutionName}</p>
              {settings.institutionSubtitle && (
                <p className="truncate text-xs text-white/55">{settings.institutionSubtitle}</p>
              )}
            </div>
          </div>
          {year && (
            <span className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur sm:inline-flex">
              <span className="size-1.5 rounded-full bg-gold-300 shadow-[0_0_10px_var(--color-gold-300)]" />
              Academic Year {year}
            </span>
          )}
        </nav>

        <div className="mt-14 max-w-3xl animate-fade-up sm:mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">Student Records Portal</p>
          <h1 className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-[4.2rem]">
            <FormTitle title={settings.formTitle} />
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Record every activity and achievement from{" "}
            <span className="font-medium text-white">{formatLongDate(settings.periodStart)}</span> to{" "}
            <span className="font-medium text-white">{formatLongDate(settings.periodEnd)}</span>. It takes about three
            minutes.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3 animate-fade-up [animation-delay:120ms]">
          {facts.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-300/10 text-gold-200 ring-1 ring-gold-300/20">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-5">{title}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/55">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

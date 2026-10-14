import type { FormSettings } from "@/lib/settings";

export function SiteFooter({ settings }: { settings: FormSettings }) {
  return (
    <footer className="border-t border-stone-200/80 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-medium text-stone-700">{settings.institutionName}</span>
          {settings.institutionSubtitle ? ` · ${settings.institutionSubtitle}` : ""}
        </p>
        <p className="text-xs">Student Activity &amp; Achievement Records · Your data is visible only to authorised faculty.</p>
      </div>
    </footer>
  );
}

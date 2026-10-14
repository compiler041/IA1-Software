"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, FileSpreadsheet, KeyRound, LayoutList, ScanEye, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputBase, inputTone } from "@/components/ui/field";
import { LogoMark } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Props = { next: string; configured: boolean; institutionName: string; formTitle: string };

const FEATURES = [
  { icon: LayoutList, title: "Every response, organised", text: "Filter by class, level and activity type; group by student." },
  { icon: ScanEye, title: "Instant proof preview", text: "Open any uploaded PDF right here, without downloading it." },
  { icon: FileSpreadsheet, title: "One-click exports", text: "Formatted Excel workbook, or a ZIP with every proof PDF." },
];

export function LoginScreen({ next, configured, institutionName, formTitle }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError("Please enter the admin password.");
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "Could not sign in. Please try again.");
        setAttempt((n) => n + 1);
        setBusy(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
      setAttempt((n) => n + 1);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative isolate hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 -z-10 bg-grid opacity-50" />
        <div className="absolute -left-32 -top-32 -z-10 size-[30rem] rounded-full bg-brand-700/45 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 -z-10 size-[26rem] rounded-full bg-gold-500/15 blur-[110px]" />

        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">{institutionName}</p>
            <p className="text-xs text-white/55">{formTitle}</p>
          </div>
        </div>

        <div className="my-auto max-w-lg py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">Admin Console</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Student records, <span className="italic font-normal text-gold-200">beautifully</span> organised.
          </h1>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-gold-200 ring-1 ring-white/10">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="mt-0.5 block text-sm text-white/55">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40">Authorised faculty only. Sessions expire after 12 hours.</p>
      </aside>

      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-900/5 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" />
          Student form
        </Link>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <p className="text-sm font-semibold leading-tight text-stone-900">{institutionName}</p>
          </div>

          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <KeyRound className="size-5" />
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-stone-900">Welcome back</h2>
          <p className="mt-2 text-[15px] text-stone-500">Sign in to view and export student submissions.</p>

          {!configured && (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                The admin password isn&apos;t set yet. Add <code className="font-mono text-[13px]">ADMIN_PASSWORD</code> to
                the server environment (for example in <code className="font-mono text-[13px]">.env.local</code>) and
                restart the app.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium text-stone-800">
                Admin password
              </label>
              <div key={attempt} className={cn("relative", attempt > 0 && error && "animate-shake")}>
                <input
                  id="admin-password"
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="current-password"
                  autoFocus
                  disabled={!configured || busy}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? "admin-password-error" : undefined}
                  placeholder="Enter password"
                  className={cn(inputBase, inputTone(Boolean(error)), "h-12 pl-3.5 pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                >
                  {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              {error && (
                <p id="admin-password-error" role="alert" className="text-[13px] text-red-600 animate-fade-in">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" variant="dark" className="w-full" disabled={!configured || busy}>
              {busy ? <Spinner /> : null}
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <ArrowRight />}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400">{institutionName}</p>
      </main>
    </div>
  );
}

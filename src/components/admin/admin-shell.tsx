"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Cloud,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  SquareArrowOutUpRight,
  Table2,
  Users,
  X,
} from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LogoMark } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import type { StorageMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/responses", label: "Responses", icon: Table2 },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

type Props = { children: ReactNode; institutionName: string; storageMode: StorageMode; acceptingResponses: boolean };

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  institutionName,
  storageMode,
  acceptingResponses,
  onNavigate,
}: Omit<Props, "children"> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <LogoMark className="size-9" />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold text-white">Admin Console</p>
          <p className="truncate text-xs text-white/50">{institutionName}</p>
        </div>
      </div>

      <nav className="space-y-1 px-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Workspace</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gold-300" />}
              <Icon className={cn("size-[18px]", active ? "text-gold-200" : "text-white/45 group-hover:text-white/80")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 p-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            <span
              className={cn(
                "size-2 rounded-full",
                acceptingResponses ? "bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]" : "bg-stone-500",
              )}
            />
            {acceptingResponses ? "Form is accepting responses" : "Form is closed"}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/45">
            {storageMode === "supabase" ? <Cloud className="size-3.5" /> : <HardDrive className="size-3.5" />}
            {storageMode === "supabase" ? "Cloud storage · Supabase" : "Local storage · SQLite"}
          </div>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <SquareArrowOutUpRight className="size-[18px] text-white/45" />
          Open student form
        </a>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          {signingOut ? <Spinner className="size-[18px]" /> : <LogOut className="size-[18px] text-white/45" />}
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children, ...props }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const current = NAV.find((n) => isActive(pathname, n.href));

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-hidden bg-ink-950 lg:block">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-brand-700/30 blur-[90px]" />
        <SidebarContent {...props} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/5 bg-ink-950 px-4 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-lg text-white/80 hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <LogoMark className="size-8" />
        <p className="text-sm font-semibold">{current?.label ?? "Admin"}</p>
      </header>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="inset-y-0 left-0 w-72 max-w-[85vw] overflow-hidden bg-ink-950 data-[state=open]:animate-slide-in-left"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <DialogClose
            aria-label="Close menu"
            className="absolute right-3 top-6 z-10 grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10"
          >
            <X className="size-4" />
          </DialogClose>
          <SidebarContent {...props} onNavigate={() => setMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

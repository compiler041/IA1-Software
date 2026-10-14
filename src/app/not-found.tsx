import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-950 px-6 text-center text-white">
      <div>
        <LogoMark className="mx-auto" />
        <p className="mt-8 font-display text-7xl font-semibold text-gold-200">404</p>
        <p className="mt-3 text-white/60">This page doesn&apos;t exist.</p>
        <Link href="/" className={buttonClasses({ variant: "gold", className: "mt-8" })}>
          Go to the student form
        </Link>
      </div>
    </main>
  );
}

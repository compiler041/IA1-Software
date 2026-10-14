"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-card ring-1 ring-stone-900/5">
      <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
        <TriangleAlert className="size-5" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        The data couldn&apos;t be loaded. Check the server logs and the storage configuration, then try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw />
        Try again
      </Button>
    </div>
  );
}

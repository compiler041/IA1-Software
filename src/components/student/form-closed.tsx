import { LockKeyhole } from "lucide-react";

export function FormClosed({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-[28px] bg-white px-6 py-14 text-center shadow-card ring-1 ring-stone-900/5 animate-fade-up sm:px-12">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-stone-100 text-stone-600 ring-1 ring-stone-200">
        <LockKeyhole className="size-7" />
      </span>
      <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-stone-900">
        Responses are closed
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-stone-600">{message}</p>
    </div>
  );
}

import { redirect } from "next/navigation";
import { isAdmin } from "./auth";

/**
 * Call at the top of every admin page. Layouts are not re-rendered on client-side navigation,
 * so the dashboard layout check alone is not enough to protect each page.
 */
export async function requireAdminPage(path: string): Promise<void> {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
}

export function safeAdminPath(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && /^\/admin(\/[\w\-/?=&%.]*)?$/.test(v) && !v.startsWith("/admin/login") ? v : "/admin";
}

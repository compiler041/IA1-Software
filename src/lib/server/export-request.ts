import { getRepository } from "./db";
import type { Submission } from "@/lib/types";

/**
 * Export endpoints accept an optional list of ids, either as a JSON body `{ ids: [...] }` or as a
 * form field `ids` containing a JSON array (used by plain form posts so large files stream to disk).
 * Without ids, everything is exported.
 */
export async function readExportIds(request: Request): Promise<string[] | null> {
  if (request.method !== "POST") return null;
  const type = request.headers.get("content-type") ?? "";
  let raw: unknown = null;
  try {
    if (type.includes("application/json")) {
      raw = ((await request.json()) as { ids?: unknown })?.ids;
    } else {
      const form = await request.formData();
      const field = form.get("ids");
      raw = typeof field === "string" && field ? JSON.parse(field) : null;
    }
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  return raw.filter((id): id is string => typeof id === "string").slice(0, 20_000);
}

/** With ids, rows come back in the same order as the ids (the order shown in the admin table). */
export async function loadExportRows(
  ids: string[] | null,
): Promise<{ rows: Submission[]; scopeLabel: string; keepOrder: boolean }> {
  const repo = await getRepository();
  if (ids === null) {
    const rows = await repo.list();
    return { rows, scopeLabel: `All responses (${rows.length})`, keepOrder: false };
  }
  const position = new Map(ids.map((id, index) => [id, index]));
  const rows = (await repo.getByIds(ids)).sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  return { rows, scopeLabel: `Filtered / selected responses (${rows.length})`, keepOrder: true };
}

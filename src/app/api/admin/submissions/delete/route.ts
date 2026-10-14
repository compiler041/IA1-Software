import { requireAdmin } from "@/lib/server/auth";
import { getRepository } from "@/lib/server/db";
import { jsonError, readJson } from "@/lib/server/http";
import { getFileStore } from "@/lib/server/storage";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await readJson(request)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 10_000)
    : [];
  if (ids.length === 0) return jsonError("Nothing was selected.", 400);

  try {
    const repo = await getRepository();
    const deleted = await repo.deleteByIds(ids);
    const store = await getFileStore();
    await store.remove(deleted.map((s) => s.fileKey)).catch((err) => console.error("[delete] file cleanup:", err));
    return Response.json({ deleted: deleted.length });
  } catch (error) {
    console.error("[delete] failed:", error);
    return jsonError("Could not delete the selected responses.", 500);
  }
}

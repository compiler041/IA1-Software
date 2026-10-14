import { requireAdmin } from "@/lib/server/auth";
import { buildWorkbook, exportFileName } from "@/lib/server/excel";
import { loadExportRows, readExportIds } from "@/lib/server/export-request";
import { contentDisposition, jsonError, requestOrigin } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings-store";
import { getFileStore } from "@/lib/server/storage";
import { createExportZip } from "@/lib/server/zip";

export const maxDuration = 300;

async function handle(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const ids = await readExportIds(request);
    const [{ rows, scopeLabel, keepOrder }, settings, store] = await Promise.all([
      loadExportRows(ids),
      getSettings(),
      getFileStore(),
    ]);
    const generatedAt = new Date();
    const workbook = await buildWorkbook(rows, {
      settings,
      origin: requestOrigin(request),
      scopeLabel,
      generatedAt,
      keepOrder,
    });
    const stream = createExportZip(rows, {
      store,
      workbook,
      workbookName: exportFileName(settings, "xlsx", generatedAt),
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition("attachment", exportFileName(settings, "zip", generatedAt)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export] zip failed:", error);
    return jsonError("Could not create the ZIP file.", 500);
  }
}

export const GET = handle;
export const POST = handle;

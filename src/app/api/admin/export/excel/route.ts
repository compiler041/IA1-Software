import { requireAdmin } from "@/lib/server/auth";
import { buildWorkbook, exportFileName } from "@/lib/server/excel";
import { loadExportRows, readExportIds } from "@/lib/server/export-request";
import { contentDisposition, jsonError, requestOrigin } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings-store";

async function handle(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const ids = await readExportIds(request);
    const [{ rows, scopeLabel, keepOrder }, settings] = await Promise.all([loadExportRows(ids), getSettings()]);
    const generatedAt = new Date();
    const buffer = await buildWorkbook(rows, {
      settings,
      origin: requestOrigin(request),
      scopeLabel,
      generatedAt,
      keepOrder,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition("attachment", exportFileName(settings, "xlsx", generatedAt)),
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export] excel failed:", error);
    return jsonError("Could not create the Excel file.", 500);
  }
}

export const GET = handle;
export const POST = handle;

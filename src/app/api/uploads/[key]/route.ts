import { getEnv } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";

/** Local mode only: receives the PDF body for a signed upload link and writes it to disk. */
export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { storageMode, maxUploadBytes } = getEnv();
  if (storageMode !== "local") return jsonError("Not found.", 404);

  const { key } = await params;
  const url = new URL(request.url);
  const size = Number(url.searchParams.get("size"));
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";

  const { saveUploadStream, verifyUploadLink } = await import("@/lib/server/storage/local");
  if (!verifyUploadLink(key, size, exp, sig)) {
    return jsonError("This upload link is invalid or has expired. Please try again.", 403);
  }
  if (size > maxUploadBytes) return jsonError("The file is too large.", 413);
  if (!request.body) return jsonError("No file was received.", 400);

  try {
    const result = await saveUploadStream(key, request.body, size);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, size: result.size });
  } catch (error) {
    console.error("[uploads] failed to store upload:", error);
    return jsonError("The file could not be saved. Please try again.", 500);
  }
}

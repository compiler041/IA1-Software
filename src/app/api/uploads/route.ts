import { randomUUID } from "node:crypto";
import { getRepository } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { clientIp, jsonError, rateLimit, readJson } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings-store";
import { getFileStore } from "@/lib/server/storage";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const cleanupState = ((globalThis as { __saCleanup?: { last: number } }).__saCleanup ??= { last: 0 });

/** Step 1 of a submission: reserve a file key and hand the browser a place to PUT the PDF. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`upload:${ip}`, 30, 10 * 60_000)) {
    return jsonError("Too many uploads from this device. Please wait a few minutes and try again.", 429);
  }

  const settings = await getSettings();
  if (!settings.acceptingResponses) return jsonError(settings.closedMessage, 403);

  const body = (await readJson(request)) as { fileName?: unknown; fileSize?: unknown; contentType?: unknown } | null;
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const fileSize = typeof body?.fileSize === "number" ? body.fileSize : Number.NaN;
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const { maxUploadBytes, maxUploadMb, storageMode } = getEnv();

  if (!fileName.toLowerCase().endsWith(".pdf") && contentType !== "application/pdf") {
    return jsonError("Only PDF files can be uploaded.", 415);
  }
  if (!Number.isInteger(fileSize) || fileSize <= 0) return jsonError("The selected file is empty.", 400);
  if (fileSize > maxUploadBytes) return jsonError(`The PDF must be ${maxUploadMb} MB or smaller.`, 413);

  try {
    const store = await getFileStore();
    const key = `${randomUUID()}.pdf`;
    const target = await store.createUploadTarget(key, fileSize);

    if (storageMode === "local" && Date.now() - cleanupState.last > CLEANUP_INTERVAL_MS) {
      cleanupState.last = Date.now();
      void (async () => {
        const { cleanupOrphanUploads } = await import("@/lib/server/storage/local");
        const repo = await getRepository();
        await cleanupOrphanUploads(await repo.allFileKeys());
      })().catch((err) => console.error("[uploads] cleanup failed:", err));
    }

    return Response.json({ key, ...target });
  } catch (error) {
    console.error("[uploads] could not create upload target:", error);
    return jsonError("Could not prepare the upload. Please try again.", 500);
  }
}

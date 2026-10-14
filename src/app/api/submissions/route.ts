import { randomUUID } from "node:crypto";
import { getRepository } from "@/lib/server/db";
import { clientIp, jsonError, rateLimit, readJson } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings-store";
import { getFileStore, isValidFileKey } from "@/lib/server/storage";
import { formatRef } from "@/lib/utils";
import { validateSubmission } from "@/lib/validation";

function cleanFileName(name: unknown): string {
  let value = typeof name === "string" ? (name.split(/[\\/]/).pop() ?? "") : "";
  value = value.replace(/[\u0000-\u001f<>:"|?*]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  if (!value) value = "proof.pdf";
  if (!value.toLowerCase().endsWith(".pdf")) value += ".pdf";
  return value;
}

/** Step 2 of a submission: validate the answers, confirm the uploaded PDF exists, then save. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`submit:${ip}`, 30, 10 * 60_000)) {
    return jsonError("Too many submissions from this device. Please wait a few minutes and try again.", 429);
  }

  const settings = await getSettings();
  if (!settings.acceptingResponses) return jsonError(settings.closedMessage, 403);

  const body = (await readJson(request)) as { values?: unknown; file?: { key?: unknown; name?: unknown } } | null;
  if (!body) return jsonError("Invalid request.", 400);

  const result = validateSubmission(body.values, {
    categories: settings.activityCategories,
    emailDomain: settings.emailDomain,
  });
  if (!result.ok) {
    return Response.json({ error: "Please correct the highlighted fields.", errors: result.errors }, { status: 422 });
  }

  const key = body.file?.key;
  const proofError = (message: string) =>
    Response.json({ error: message, errors: { proof: message } }, { status: 422 });
  if (!isValidFileKey(key)) return proofError("Please upload the proof of activity (PDF).");

  try {
    const store = await getFileStore();
    const repo = await getRepository();

    const info = await store.stat(key);
    if (!info) return proofError("Your PDF upload didn't finish. Please select the file again.");
    if (info.contentType && info.contentType !== "application/pdf") return proofError("Only PDF files are accepted.");
    if (await repo.fileKeyInUse(key)) return jsonError("This response was already submitted.", 409);

    const saved = await repo.insert({
      id: randomUUID(),
      ...result.data,
      fileKey: key,
      fileName: cleanFileName(body.file?.name),
      fileSize: info.size,
    });

    return Response.json({ id: saved.id, ref: formatRef(saved.seq), createdAt: saved.createdAt }, { status: 201 });
  } catch (error) {
    console.error("[submissions] failed to save:", error);
    return jsonError("We couldn't save your response. Please try again in a moment.", 500);
  }
}

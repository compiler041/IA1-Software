import { isAdmin } from "@/lib/server/auth";
import { getRepository } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { getFileStore } from "@/lib/server/storage";
import { formatRef, safeFilePart } from "@/lib/utils";

/** Streams a proof PDF to signed-in admins (inline for the viewer, or ?download=1). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(request.url);
  if (!(await isAdmin())) {
    const next = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(new URL(`/admin/login?next=${next}`, request.url), 303);
  }

  const { id } = await params;
  const repo = await getRepository();
  const submission = await repo.getById(id);
  if (!submission) return jsonError("Submission not found.", 404);

  const fileName = `${safeFilePart(submission.rollNo, 20)} - ${safeFilePart(submission.name, 40)} - ${safeFilePart(
    submission.activityName,
    50,
  )} (${formatRef(submission.seq)}).pdf`;

  const store = await getFileStore();
  return store.serve(submission.fileKey, { fileName, download: url.searchParams.get("download") === "1" });
}

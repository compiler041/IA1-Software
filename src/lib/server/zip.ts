import { PassThrough, Readable } from "node:stream";
import { ZipArchive } from "archiver";
import type { Submission } from "@/lib/types";
import { formatRef, safeFilePart } from "@/lib/utils";
import type { FileStore } from "./storage/types";

function proofEntryName(s: Submission, used: Set<string>): string {
  const base = `Proofs/${s.branch}/${s.year}/${safeFilePart(s.rollNo, 20)} - ${safeFilePart(s.name, 40)} - ${safeFilePart(
    s.activityName,
    50,
  )} (${formatRef(s.seq)})`;
  let name = `${base}.pdf`;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base} (${i}).pdf`;
  used.add(name.toLowerCase());
  return name;
}

/**
 * Streams a ZIP containing the Excel workbook plus every proof PDF, organised as
 * Proofs/<Branch>/<Year>/<Roll No> - <Name> - <Activity> (<Ref>).pdf
 */
export function createExportZip(
  subs: Submission[],
  opts: { store: FileStore; workbook: Buffer; workbookName: string },
): ReadableStream<Uint8Array> {
  const archive = new ZipArchive({ store: true });
  const output = new PassThrough();
  let finished = false;
  let processed = 0;
  const waiters: (() => void)[] = [];

  archive.on("entry", () => {
    processed += 1;
    waiters.splice(0).forEach((resolve) => resolve());
  });
  archive.on("warning", (err) => console.warn("[zip] warning:", err.message));
  archive.on("error", (err) => output.destroy(err));
  output.on("close", () => {
    if (!finished) archive.abort();
  });
  archive.pipe(output);

  const waitUntilProcessed = async (count: number) => {
    while (processed < count && !output.destroyed) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
  };

  (async () => {
    let appended = 0;
    archive.append(opts.workbook, { name: opts.workbookName });
    appended += 1;

    const used = new Set<string>();
    for (const s of [...subs].sort((a, b) => a.seq - b.seq)) {
      if (output.destroyed) return;
      const name = proofEntryName(s, used);
      const source = await opts.store.openForZip(s.fileKey).catch(() => null);
      if (!source) {
        archive.append(`The proof file for ${formatRef(s.seq)} (${s.name}) could not be found.`, {
          name: name.replace(/\.pdf$/, " - MISSING.txt"),
        });
      } else if (source.type === "path") {
        archive.file(source.path, { name });
      } else {
        archive.append(source.stream, { name });
      }
      appended += 1;
      // Keep at most one remote download in flight.
      if (source?.type === "stream") await waitUntilProcessed(appended);
    }
    await archive.finalize();
    finished = true;
  })().catch((err: Error) => output.destroy(err));

  return Readable.toWeb(output) as unknown as ReadableStream<Uint8Array>;
}

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { safeEqual, sign } from "../auth";
import { getEnv } from "../env";
import { contentDisposition } from "../http";
import { isValidFileKey, type FileStore } from "./types";

const UPLOAD_LINK_TTL_SECONDS = 60 * 60;
const PDF_MAGIC = Buffer.from("%PDF-");

export function uploadsDir(): string {
  return path.join(getEnv().dataDir, "uploads");
}

function filePath(key: string): string {
  if (!isValidFileKey(key)) throw new Error("Invalid file key");
  return path.join(uploadsDir(), key);
}

const uploadPayload = (key: string, size: number, exp: number) => `${key}:${size}:${exp}`;

export function verifyUploadLink(key: string, size: number, exp: number, sig: string): boolean {
  if (!isValidFileKey(key) || !Number.isFinite(size) || !Number.isFinite(exp)) return false;
  if (exp < Date.now() / 1000) return false;
  return safeEqual(sig, sign("upload", uploadPayload(key, size, exp)));
}

type SaveResult = { ok: true; size: number } | { ok: false; status: number; error: string };

/** Streams an upload to disk, enforcing the declared size and checking it really is a PDF. */
export async function saveUploadStream(
  key: string,
  body: ReadableStream<Uint8Array>,
  expectedSize: number,
): Promise<SaveResult> {
  const finalPath = filePath(key);
  await fs.promises.mkdir(uploadsDir(), { recursive: true });
  if (fs.existsSync(finalPath)) return { ok: false, status: 409, error: "This upload link was already used." };

  const tempPath = `${finalPath}.${randomBytes(4).toString("hex")}.part`;
  const handle = await fs.promises.open(tempPath, "wx");
  const reader = body.getReader();
  let written = 0;
  let head = Buffer.alloc(0);
  let failure: SaveResult | null = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;
      written += value.length;
      if (written > expectedSize) {
        failure = { ok: false, status: 413, error: "The file is larger than declared." };
        break;
      }
      if (head.length < 1024) head = Buffer.concat([head, Buffer.from(value.subarray(0, 1024 - head.length))]);
      await handle.write(value);
    }
  } catch {
    failure = { ok: false, status: 400, error: "The upload was interrupted. Please try again." };
  } finally {
    await handle.close();
    if (failure) await reader.cancel().catch(() => undefined);
  }

  if (!failure && written !== expectedSize) {
    failure = { ok: false, status: 400, error: "The upload was incomplete. Please try again." };
  }
  if (!failure && head.indexOf(PDF_MAGIC) === -1) {
    failure = { ok: false, status: 415, error: "That file is not a valid PDF." };
  }
  if (failure) {
    await fs.promises.rm(tempPath, { force: true });
    return failure;
  }

  await fs.promises.rename(tempPath, finalPath);
  return { ok: true, size: written };
}

/** Removes uploads that never became part of a submission (abandoned forms). */
export async function cleanupOrphanUploads(keysInUse: Set<string>, olderThanMs = 24 * 60 * 60 * 1000) {
  const dir = uploadsDir();
  let names: string[] = [];
  try {
    names = await fs.promises.readdir(dir);
  } catch {
    return 0;
  }
  let removed = 0;
  const cutoff = Date.now() - olderThanMs;
  for (const name of names) {
    const isPart = name.endsWith(".part");
    if (!isPart && (!isValidFileKey(name) || keysInUse.has(name))) continue;
    const full = path.join(dir, name);
    try {
      const stat = await fs.promises.stat(full);
      if (stat.mtimeMs < cutoff) {
        await fs.promises.rm(full, { force: true });
        removed += 1;
      }
    } catch {
      // File vanished in the meantime; nothing to do.
    }
  }
  return removed;
}

export const localFileStore: FileStore = {
  async createUploadTarget(key, size) {
    const exp = Math.floor(Date.now() / 1000) + UPLOAD_LINK_TTL_SECONDS;
    const sig = sign("upload", uploadPayload(key, size, exp));
    const query = new URLSearchParams({ size: String(size), exp: String(exp), sig });
    return {
      url: `/api/uploads/${key}?${query.toString()}`,
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
    };
  },

  async stat(key) {
    try {
      const stat = await fs.promises.stat(filePath(key));
      return stat.isFile() ? { size: stat.size, contentType: "application/pdf" } : null;
    } catch {
      return null;
    }
  },

  async serve(key, { fileName, download }) {
    const full = filePath(key);
    let size: number;
    try {
      size = (await fs.promises.stat(full)).size;
    } catch {
      return Response.json({ error: "The proof file could not be found." }, { status: 404 });
    }
    const stream = Readable.toWeb(fs.createReadStream(full)) as unknown as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(size),
        "Content-Disposition": contentDisposition(download ? "attachment" : "inline", fileName),
        "Cache-Control": "private, no-store",
      },
    });
  },

  async openForZip(key) {
    const full = filePath(key);
    return fs.existsSync(full) ? { type: "path", path: full } : null;
  },

  async remove(keys) {
    await Promise.all(
      keys.filter(isValidFileKey).map((key) => fs.promises.rm(filePath(key), { force: true }).catch(() => undefined)),
    );
  },
};

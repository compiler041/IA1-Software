import type { Readable } from "node:stream";

export type UploadTarget = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
};

export type StoredFile = { size: number; contentType?: string };

export type ZipSource = { type: "path"; path: string } | { type: "stream"; stream: Readable };

export interface FileStore {
  /** Where the browser should PUT the PDF (our own route locally, a signed URL on Supabase). */
  createUploadTarget(key: string, size: number): Promise<UploadTarget>;
  stat(key: string): Promise<StoredFile | null>;
  /** Response that shows the PDF inline (or as a download) in the browser. */
  serve(key: string, opts: { fileName: string; download: boolean }): Promise<Response>;
  openForZip(key: string): Promise<ZipSource | null>;
  remove(keys: string[]): Promise<void>;
}

const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

export function isValidFileKey(key: unknown): key is string {
  return typeof key === "string" && KEY_RE.test(key);
}

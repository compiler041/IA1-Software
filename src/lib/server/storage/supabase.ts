import { Readable } from "node:stream";
import { getEnv } from "../env";
import { getSupabase } from "../supabase";
import { isValidFileKey, type FileStore } from "./types";

const bucket = () => getSupabase().storage.from(getEnv().supabaseBucket);

export const supabaseFileStore: FileStore = {
  async createUploadTarget(key) {
    const { data, error } = await bucket().createSignedUploadUrl(key);
    if (error || !data) throw new Error(`Could not create an upload link: ${error?.message ?? "unknown error"}`);
    return {
      url: data.signedUrl,
      method: "PUT",
      headers: { "Content-Type": "application/pdf", "x-upsert": "false", "cache-control": "max-age=3600" },
    };
  },

  async stat(key) {
    if (!isValidFileKey(key)) return null;
    const { data, error } = await bucket().info(key);
    if (error || !data) return null;
    return { size: Number(data.size ?? 0), contentType: data.contentType ?? undefined };
  },

  async serve(key, { fileName, download }) {
    const { data, error } = await bucket().createSignedUrl(key, 10 * 60, { download: download ? fileName : false });
    if (error || !data) return Response.json({ error: "The proof file could not be found." }, { status: 404 });
    return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": "no-store" } });
  },

  async openForZip(key) {
    const { data, error } = await bucket().createSignedUrl(key, 10 * 60);
    if (error || !data) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok || !res.body) return null;
    return { type: "stream", stream: Readable.fromWeb(res.body as unknown as import("node:stream/web").ReadableStream) };
  },

  async remove(keys) {
    const valid = keys.filter(isValidFileKey);
    for (let i = 0; i < valid.length; i += 100) {
      await bucket().remove(valid.slice(i, i + 100));
    }
  },
};

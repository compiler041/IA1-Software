import type { NewSubmission, Submission } from "@/lib/types";
import { getSupabase } from "../supabase";
import { rowToSubmission, submissionToRow, type Repository, type SubmissionRow } from "./types";

const TABLE = "submissions";
const SETTINGS_TABLE = "app_settings";
const PAGE = 1000;
const CHUNK = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function fail(action: string, error: { message: string }): never {
  throw new Error(`Supabase ${action} failed: ${error.message}`);
}

export function createSupabaseRepository(): Repository {
  const sb = getSupabase();

  return {
    async insert(input: NewSubmission): Promise<Submission> {
      const { data, error } = await sb.from(TABLE).insert(submissionToRow(input)).select("*").single();
      if (error) fail("insert", error);
      return rowToSubmission(data as SubmissionRow);
    },

    async list() {
      const out: Submission[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb
          .from(TABLE)
          .select("*")
          .order("seq", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) fail("list", error);
        const rows = (data ?? []) as SubmissionRow[];
        out.push(...rows.map(rowToSubmission));
        if (rows.length < PAGE) break;
      }
      return out;
    },

    async getById(id) {
      if (!UUID_RE.test(id)) return null;
      const { data, error } = await sb.from(TABLE).select("*").eq("id", id).maybeSingle();
      if (error) fail("read", error);
      return data ? rowToSubmission(data as SubmissionRow) : null;
    },

    async getByIds(ids) {
      const valid = ids.filter((id) => UUID_RE.test(id));
      const out: Submission[] = [];
      for (const part of chunks(valid, CHUNK)) {
        const { data, error } = await sb.from(TABLE).select("*").in("id", part);
        if (error) fail("read", error);
        out.push(...((data ?? []) as SubmissionRow[]).map(rowToSubmission));
      }
      return out.sort((a, b) => b.seq - a.seq);
    },

    async deleteByIds(ids) {
      const valid = ids.filter((id) => UUID_RE.test(id));
      const out: Submission[] = [];
      for (const part of chunks(valid, CHUNK)) {
        const { data, error } = await sb.from(TABLE).delete().in("id", part).select("*");
        if (error) fail("delete", error);
        out.push(...((data ?? []) as SubmissionRow[]).map(rowToSubmission));
      }
      return out;
    },

    async fileKeyInUse(key) {
      const { count, error } = await sb.from(TABLE).select("id", { count: "exact", head: true }).eq("file_key", key);
      if (error) fail("lookup", error);
      return (count ?? 0) > 0;
    },

    async allFileKeys() {
      const keys = new Set<string>();
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb.from(TABLE).select("file_key").range(from, from + PAGE - 1);
        if (error) fail("list", error);
        const rows = (data ?? []) as { file_key: string }[];
        rows.forEach((r) => keys.add(r.file_key));
        if (rows.length < PAGE) break;
      }
      return keys;
    },

    async getSetting(key) {
      const { data, error } = await sb.from(SETTINGS_TABLE).select("value").eq("key", key).maybeSingle();
      if (error) fail("settings read", error);
      return (data as { value: unknown } | null)?.value ?? null;
    },

    async setSetting(key, value) {
      const { error } = await sb
        .from(SETTINGS_TABLE)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) fail("settings save", error);
    },
  };
}

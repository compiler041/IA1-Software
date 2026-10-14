import { getEnv } from "../env";
import type { Repository } from "./types";

const cache = new Map<string, Promise<Repository>>();

/** SQLite on disk by default; Supabase when SUPABASE_URL and a service key are configured. */
export function getRepository(): Promise<Repository> {
  const mode = getEnv().storageMode;
  let repo = cache.get(mode);
  if (!repo) {
    repo =
      mode === "supabase"
        ? import("./supabase").then((m) => m.createSupabaseRepository())
        : import("./sqlite").then((m) => m.createSqliteRepository());
    repo.catch(() => cache.delete(mode));
    cache.set(mode, repo);
  }
  return repo;
}

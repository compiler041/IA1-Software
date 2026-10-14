import path from "node:path";
import type { StorageMode } from "@/lib/types";

export function getEnv() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
  const maxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_MB || "", 10);
  const mb = Number.isFinite(maxUploadMb) && maxUploadMb > 0 ? Math.min(maxUploadMb, 1024) : 100;

  return {
    adminPassword: process.env.ADMIN_PASSWORD ?? "",
    sessionSecret: process.env.SESSION_SECRET ?? "",
    dataDir: path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || "data"),
    supabaseUrl,
    supabaseKey,
    supabaseBucket: (process.env.SUPABASE_BUCKET || "proofs").trim(),
    maxUploadMb: mb,
    maxUploadBytes: mb * 1024 * 1024,
    storageMode: (supabaseUrl && supabaseKey ? "supabase" : "local") as StorageMode,
  };
}

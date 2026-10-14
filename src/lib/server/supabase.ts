import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

type GlobalWithSupabase = typeof globalThis & { __saSupabase?: { key: string; client: SupabaseClient } };

export function getSupabase(): SupabaseClient {
  const { supabaseUrl, supabaseKey } = getEnv();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const g = globalThis as GlobalWithSupabase;
  const cacheKey = `${supabaseUrl}|${supabaseKey.slice(-8)}`;
  if (g.__saSupabase?.key === cacheKey) return g.__saSupabase.client;

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  g.__saSupabase = { key: cacheKey, client };
  return client;
}

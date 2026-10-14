import { getEnv } from "../env";
import type { FileStore } from "./types";

export { isValidFileKey } from "./types";

export async function getFileStore(): Promise<FileStore> {
  if (getEnv().storageMode === "supabase") return (await import("./supabase")).supabaseFileStore;
  return (await import("./local")).localFileStore;
}

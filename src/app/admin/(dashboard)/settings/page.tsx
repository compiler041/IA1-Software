import type { Metadata } from "next";
import { connection } from "next/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRepository } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { getSettings } from "@/lib/server/settings-store";
import { countBy } from "@/lib/stats";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  await requireAdminPage("/admin/settings");
  const repo = await getRepository();
  const [settings, subs] = await Promise.all([getSettings(), repo.list()]);
  const env = getEnv();

  return (
    <SettingsForm
      settings={settings}
      categoryCounts={Object.fromEntries(countBy(subs, (s) => s.activityCategory))}
      system={{
        storageMode: env.storageMode,
        maxUploadMb: env.maxUploadMb,
        dataLocation: env.storageMode === "supabase" ? `${env.supabaseUrl} · bucket "${env.supabaseBucket}"` : env.dataDir,
        total: subs.length,
      }}
    />
  );
}

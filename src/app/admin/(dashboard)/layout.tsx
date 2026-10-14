import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getEnv } from "@/lib/server/env";
import { getSettings } from "@/lib/server/settings-store";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection();
  await requireAdminPage("/admin");
  const settings = await getSettings();

  return (
    <AdminShell
      institutionName={settings.institutionName}
      storageMode={getEnv().storageMode}
      acceptingResponses={settings.acceptingResponses}
    >
      {children}
    </AdminShell>
  );
}

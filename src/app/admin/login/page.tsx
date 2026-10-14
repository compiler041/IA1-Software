import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginScreen } from "@/components/admin/login-screen";
import { safeAdminPath } from "@/lib/server/admin-page";
import { isAdmin, isAdminConfigured } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings-store";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const next = safeAdminPath((await searchParams).next);
  if (await isAdmin()) redirect(next);
  const settings = await getSettings();

  return (
    <LoginScreen
      next={next}
      configured={isAdminConfigured()}
      institutionName={settings.institutionName}
      formTitle={settings.formTitle}
    />
  );
}

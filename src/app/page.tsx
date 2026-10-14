import { connection } from "next/server";
import { FormClosed } from "@/components/student/form-closed";
import { SiteFooter } from "@/components/student/site-footer";
import { SiteHero } from "@/components/student/site-hero";
import { StudentForm } from "@/components/student/student-form";
import { getEnv } from "@/lib/server/env";
import { getSettings } from "@/lib/server/settings-store";

export default async function StudentPage() {
  await connection();
  const settings = await getSettings();
  const { maxUploadMb } = getEnv();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHero settings={settings} maxUploadMb={maxUploadMb} />
      <main className="relative z-10 mx-auto -mt-20 w-full max-w-6xl flex-1 px-4 pb-20 sm:-mt-24 sm:px-8">
        {settings.acceptingResponses ? (
          <StudentForm settings={settings} maxUploadMb={maxUploadMb} />
        ) : (
          <FormClosed message={settings.closedMessage} />
        )}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { ResponsesView } from "@/components/admin/responses-view";
import { EMPTY_FILTERS, type ResponseFilters } from "@/lib/filters";
import { isBranch, isLevel, isYear } from "@/lib/form-config";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRepository } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings-store";

export const metadata: Metadata = { title: "Responses" };

type Search = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []);

export default async function ResponsesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  await requireAdminPage("/admin/responses");
  const params = await searchParams;
  const repo = await getRepository();
  const [submissions, settings] = await Promise.all([repo.list(), getSettings()]);

  const filters: ResponseFilters = {
    ...EMPTY_FILTERS,
    q: typeof params.q === "string" ? params.q : "",
    years: list(params.year).filter(isYear),
    branches: list(params.branch).filter(isBranch),
    levels: list(params.level).filter(isLevel),
    categories: typeof params.category === "string" ? [params.category] : [],
  };
  const open = typeof params.open === "string" ? params.open : null;

  return (
    <ResponsesView
      submissions={submissions}
      categories={settings.activityCategories}
      initialFilters={filters}
      initialOpenId={open}
    />
  );
}

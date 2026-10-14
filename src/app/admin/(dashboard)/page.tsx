import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Activity, Award, Inbox, Table2, Users } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { ExportMenu } from "@/components/admin/export-menu";
import {
  BarList,
  ClassMatrix,
  LatestList,
  LevelBreakdown,
  MonthChart,
  StatCard,
  StatusBanner,
  Trend,
} from "@/components/admin/overview-widgets";
import { Card, PageHeader } from "@/components/admin/page-header";
import { branchDot } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { academicYearLabel } from "@/lib/dates";
import type { Branch } from "@/lib/form-config";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRepository } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings-store";
import { computeOverview, todayKey } from "@/lib/stats";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  await connection();
  await requireAdminPage("/admin");
  const repo = await getRepository();
  const [subs, settings] = await Promise.all([repo.list(), getSettings()]);
  const now = new Date().toISOString();
  const o = computeOverview(subs, {
    categories: settings.activityCategories,
    periodStart: settings.periodStart,
    periodEnd: settings.periodEnd,
    now,
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  const formUrl = `${proto}://${host}/`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Academic Year ${academicYearLabel(settings.periodStart, settings.periodEnd)}`}
        title="Overview"
        description="A live snapshot of every activity and achievement submitted by students."
        actions={
          <>
            <Link href="/admin/responses" className={buttonClasses({ variant: "secondary" })}>
              <Table2 />
              View responses
            </Link>
            <ExportMenu total={o.total} />
          </>
        }
      />

      <StatusBanner accepting={settings.acceptingResponses} deadline={settings.deadline} today={todayKey(now)} />

      {o.total === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Inbox className="size-6" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold text-stone-900">No submissions yet</h2>
            <p className="mt-2 max-w-md text-sm text-stone-500">
              Share the student form link below. Responses appear here the moment students submit them.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              featured
              label="Total submissions"
              value={o.total.toLocaleString("en-IN")}
              icon={<Activity />}
              hint={<Trend current={o.lastSevenDays} previous={o.previousSevenDays} dark />}
            />
            <StatCard
              label="Students"
              value={o.students.toLocaleString("en-IN")}
              icon={<Users />}
              hint={`${(o.total / Math.max(1, o.students)).toFixed(1)} activities per student on average`}
            />
            <StatCard
              label="National & International"
              value={o.nationalPlus.toLocaleString("en-IN")}
              icon={<Award />}
              hint={`${Math.round((o.nationalPlus / o.total) * 100)}% of all submissions`}
            />
            <StatCard
              label="Last 7 days"
              value={o.lastSevenDays.toLocaleString("en-IN")}
              icon={<Inbox />}
              hint={`${o.previousSevenDays} in the 7 days before`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Activities by month" subtitle="Based on the activity start date">
              <MonthChart data={o.byMonth} />
            </Card>
            <Card title="Activity level" subtitle="Click a level to see those responses">
              <LevelBreakdown items={o.byLevel} total={o.total} />
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Submissions by class" subtitle="Year × Branch. Click a cell to open those responses">
              <ClassMatrix matrix={o.matrix} branchTotals={o.branchTotals} total={o.total} />
            </Card>
            <Card title="Branch & year">
              <BarList
                items={o.byBranch}
                total={o.total}
                hrefFor={(i) => `/admin/responses?branch=${i.key}`}
                colorFor={(i) => branchDot(i.key as Branch)}
              />
              <div className="my-5 h-px bg-stone-100" />
              <BarList
                items={o.byYear}
                total={o.total}
                hrefFor={(i) => `/admin/responses?year=${i.key}`}
                colorFor={() => "bg-ink-700"}
              />
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Activity types">
              <BarList
                items={o.byCategory}
                total={o.total}
                describe
                hrefFor={(i) => `/admin/responses?category=${encodeURIComponent(i.key)}`}
              />
            </Card>
            <Card
              title="Latest submissions"
              action={
                <Link href="/admin/responses" className="text-sm font-medium text-brand-700 hover:underline">
                  View all
                </Link>
              }
            >
              <LatestList items={subs.slice(0, 7)} />
            </Card>
          </div>
        </>
      )}

      <Card title="Student form link" subtitle="Share this link with students so they can submit their activities.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-stone-100 px-4 py-2.5 font-mono text-sm text-stone-800">
            {formUrl}
          </code>
          <div className="flex gap-2">
            <CopyButton value={formUrl} label="Copy link" successMessage="Form link copied" />
            <a href="/" target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Open form
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

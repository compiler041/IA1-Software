import type { Metadata } from "next";
import { connection } from "next/server";
import { StudentsView } from "@/components/admin/students-view";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRepository } from "@/lib/server/db";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  await connection();
  await requireAdminPage("/admin/students");
  const repo = await getRepository();
  return <StudentsView submissions={await repo.list()} />;
}

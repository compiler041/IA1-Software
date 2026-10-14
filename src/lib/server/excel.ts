import ExcelJS from "exceljs";
import { formatLongDate, formatTimestamp, parseIsoDate, toIstParts } from "@/lib/dates";
import { BRANCHES, LEVELS, YEARS } from "@/lib/form-config";
import type { FormSettings } from "@/lib/settings";
import { computeOverview, groupByStudent } from "@/lib/stats";
import type { Submission } from "@/lib/types";
import { formatRef } from "@/lib/utils";

const BRAND = "FF82263B";
const BRAND_SOFT = "FFF6E6E9";
const INK = "FF1C1917";
const MUTED = "FF78716C";
const LINE = "FFE7E5E4";
const ZEBRA = "FFFAFAF9";

const thin = { style: "thin" as const, color: { argb: LINE } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

/** Excel stores dates without a time zone, so write the IST wall-clock time. */
function istExcelDate(timestamp: string): Date {
  const p = toIstParts(timestamp);
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.h, p.min));
}

function excelDate(iso: string): Date | string {
  const p = parseIsoDate(iso);
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : iso;
}

function styleHeaderRow(row: ExcelJS.Row, count: number) {
  row.height = 30;
  for (let c = 1; c <= count; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  }
}

type Column = { header: string; key: string; width: number; wrap?: boolean; numFmt?: string; center?: boolean };

const RESPONSE_COLUMNS: Column[] = [
  { header: "Sr. No.", key: "sr", width: 8, center: true },
  { header: "Ref. No.", key: "ref", width: 12, center: true },
  { header: "Submitted On (IST)", key: "submittedAt", width: 21, numFmt: "dd-mm-yyyy hh:mm AM/PM" },
  { header: "Name", key: "name", width: 26, wrap: true },
  { header: "Roll No", key: "rollNo", width: 15 },
  { header: "Email ID", key: "email", width: 32 },
  { header: "Mobile No", key: "mobile", width: 14 },
  { header: "Year", key: "year", width: 8, center: true },
  { header: "Branch", key: "branch", width: 10, center: true },
  { header: "Activity and Achievement", key: "activityCategory", width: 42, wrap: true },
  { header: "Organiser/Participant Name", key: "organiserParticipantName", width: 30, wrap: true },
  { header: "Name of Activity", key: "activityName", width: 34, wrap: true },
  { header: "Details of Activity", key: "activityDetails", width: 60, wrap: true },
  { header: "Activity Level", key: "activityLevel", width: 15, center: true },
  { header: "Start Date", key: "startDate", width: 13, numFmt: "dd-mm-yyyy", center: true },
  { header: "End Date", key: "endDate", width: 13, numFmt: "dd-mm-yyyy", center: true },
  { header: "Proof of Activity", key: "proof", width: 17, center: true },
  { header: "Proof File Name", key: "fileName", width: 32, wrap: true },
  { header: "LY EXCP Student", key: "isLyExcp", width: 12, center: true },
];

function addResponsesSheet(wb: ExcelJS.Workbook, subs: Submission[], origin: string) {
  const ws = wb.addWorksheet("Responses", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 4 }],
    properties: { defaultRowHeight: 20 },
  });
  ws.columns = RESPONSE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  subs.forEach((s, index) => {
    const row = ws.addRow({
      sr: index + 1,
      ref: formatRef(s.seq),
      submittedAt: istExcelDate(s.createdAt),
      name: s.name,
      rollNo: s.rollNo,
      email: s.email,
      mobile: s.mobile,
      year: s.year,
      branch: s.branch,
      activityCategory: s.activityCategory,
      organiserParticipantName: s.organiserParticipantName,
      activityName: s.activityName,
      activityDetails: s.activityDetails,
      activityLevel: s.activityLevel,
      startDate: excelDate(s.startDate),
      endDate: excelDate(s.endDate),
      proof: { text: "View PDF", hyperlink: `${origin}/api/admin/files/${s.id}` },
      fileName: s.fileName,
      isLyExcp: s.isLyExcp ? "Yes" : "No",
    });

    RESPONSE_COLUMNS.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.border = border;
      cell.alignment = {
        vertical: "top",
        horizontal: col.center ? "center" : "left",
        wrapText: Boolean(col.wrap),
      };
      if (col.numFmt) cell.numFmt = col.numFmt;
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    });
    row.getCell("proof").font = { color: { argb: "FF1D4ED8" }, underline: true };
  });

  styleHeaderRow(ws.getRow(1), RESPONSE_COLUMNS.length);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: RESPONSE_COLUMNS.length } };
}

function writeTitle(ws: ExcelJS.Worksheet, rowIndex: number, text: string) {
  const cell = ws.getCell(rowIndex, 1);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: BRAND } };
  return rowIndex + 1;
}

function writeTable(ws: ExcelJS.Worksheet, startRow: number, headers: string[], rows: (string | number)[][], totalRow?: (string | number)[]) {
  const header = ws.getRow(startRow);
  headers.forEach((h, i) => (header.getCell(i + 1).value = h));
  styleHeaderRow(header, headers.length);
  header.height = 22;

  let r = startRow + 1;
  for (const values of [...rows, ...(totalRow ? [totalRow] : [])]) {
    const row = ws.getRow(r);
    const isTotal = totalRow !== undefined && values === totalRow;
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", wrapText: i === 0 };
      if (typeof v === "number" && !Number.isInteger(v)) cell.numFmt = "0.0%";
      if (isTotal) {
        cell.font = { bold: true, color: { argb: INK } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } };
      }
    });
    r += 1;
  }
  return r + 1;
}

function addSummarySheet(
  wb: ExcelJS.Workbook,
  subs: Submission[],
  ctx: { settings: FormSettings; scopeLabel: string; generatedAt: Date },
) {
  const ws = wb.addWorksheet("Summary", { properties: { defaultRowHeight: 20 } });
  ws.columns = [{ width: 58 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const { settings } = ctx;
  const overview = computeOverview(subs, {
    categories: settings.activityCategories,
    periodStart: settings.periodStart,
    periodEnd: settings.periodEnd,
    now: ctx.generatedAt.toISOString(),
  });

  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value = settings.formTitle;
  title.font = { bold: true, size: 16, color: { argb: BRAND } };
  ws.getRow(1).height = 28;

  const meta: [string, string][] = [
    ["Institution", [settings.institutionName, settings.institutionSubtitle].filter(Boolean).join(", ")],
    ["Academic period", `${formatLongDate(settings.periodStart)} to ${formatLongDate(settings.periodEnd)}`],
    ["Export scope", ctx.scopeLabel],
    ["Generated on", `${formatTimestamp(ctx.generatedAt.toISOString())} (IST)`],
  ];
  meta.forEach(([label, value], i) => {
    const row = ws.getRow(i + 2);
    row.getCell(1).value = `${label}: ${value}`;
    row.getCell(1).font = { color: { argb: MUTED } };
  });

  let r = 7;
  r = writeTitle(ws, r, "Key figures");
  r = writeTable(ws, r, ["Metric", "Count"], [
    ["Total submissions", overview.total],
    ["Unique students", overview.students],
    ["National + International activities", overview.nationalPlus],
  ]);

  r = writeTitle(ws, r, "Submissions by Year and Branch");
  r = writeTable(
    ws,
    r,
    ["Year", ...BRANCHES, "Total"],
    overview.matrix.map((m) => [m.year, ...BRANCHES.map((b) => m.counts[b]), m.total]),
    ["Total", ...BRANCHES.map((b) => overview.branchTotals[b]), overview.total],
  );

  const share = (v: number) => (overview.total ? v / overview.total : 0);
  r = writeTitle(ws, r, "By Activity Level");
  r = writeTable(
    ws,
    r,
    ["Activity level", "Count", "Share"],
    overview.byLevel.map((l) => [l.label, l.value, share(l.value)]),
  );

  r = writeTitle(ws, r, "By Activity and Achievement");
  writeTable(
    ws,
    r,
    ["Activity and Achievement", "Count", "Share"],
    overview.byCategory.map((c) => [c.label, c.value, share(c.value)]),
  );
}

function addStudentsSheet(wb: ExcelJS.Workbook, subs: Submission[]) {
  const ws = wb.addWorksheet("Students", { views: [{ state: "frozen", ySplit: 1 }] });
  const columns: Column[] = [
    { header: "Roll No", key: "rollNo", width: 15 },
    { header: "Name", key: "name", width: 26 },
    { header: "Year", key: "year", width: 8, center: true },
    { header: "Branch", key: "branch", width: 10, center: true },
    { header: "Email ID", key: "email", width: 32 },
    { header: "Mobile No", key: "mobile", width: 14 },
    { header: "LY EXCP", key: "lyExcp", width: 10, center: true },
    { header: "Total Activities", key: "total", width: 12, center: true },
    ...LEVELS.map((l) => ({ header: l, key: l, width: 13, center: true })),
    { header: "Last Submitted (IST)", key: "latest", width: 21, numFmt: "dd-mm-yyyy hh:mm AM/PM" },
  ];
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const yearOrder = Object.fromEntries(YEARS.map((y, i) => [y, i]));
  const students = groupByStudent(subs).sort(
    (a, b) =>
      yearOrder[a.year] - yearOrder[b.year] ||
      a.branch.localeCompare(b.branch) ||
      a.rollNo.localeCompare(b.rollNo, "en", { numeric: true }),
  );

  students.forEach((st, index) => {
    const row = ws.addRow({
      rollNo: st.rollNo,
      name: st.name,
      year: st.year,
      branch: st.branch,
      email: st.email,
      mobile: st.mobile,
      lyExcp: st.isLyExcp ? "Yes" : "No",
      total: st.total,
      ...st.levels,
      latest: istExcelDate(st.latest),
    });
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: col.center ? "center" : "left" };
      if (col.numFmt) cell.numFmt = col.numFmt;
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    });
  });

  styleHeaderRow(ws.getRow(1), columns.length);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

export async function buildWorkbook(
  subs: Submission[],
  ctx: { settings: FormSettings; origin: string; scopeLabel: string; generatedAt?: Date; keepOrder?: boolean },
): Promise<Buffer> {
  const generatedAt = ctx.generatedAt ?? new Date();
  const ordered = ctx.keepOrder ? subs : [...subs].sort((a, b) => a.seq - b.seq);

  const wb = new ExcelJS.Workbook();
  wb.creator = ctx.settings.institutionName;
  wb.title = ctx.settings.formTitle;
  wb.created = generatedAt;

  addResponsesSheet(wb, ordered, ctx.origin);
  addSummarySheet(wb, ordered, { settings: ctx.settings, scopeLabel: ctx.scopeLabel, generatedAt });
  addStudentsSheet(wb, ordered);

  const data = await wb.xlsx.writeBuffer();
  return Buffer.from(data as ArrayBuffer);
}

export function exportFileName(settings: FormSettings, ext: "xlsx" | "zip", generatedAt = new Date()): string {
  const p = toIstParts(generatedAt);
  const stamp = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  const period = `${settings.periodStart.slice(0, 4)}-${settings.periodEnd.slice(2, 4)}`;
  return `Student-Activity-Data_${period}_${stamp}.${ext}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const IST_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export type DateParts = { y: number; m: number; d: number };

export function parseIsoDate(iso: string | null | undefined): DateParts | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return null;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > daysInMonth) return null;
  return { y, m, d };
}

export const isValidIsoDate = (iso: string | null | undefined) => parseIsoDate(iso) !== null;

export const toIsoDate = (y: number, m: number, d: number) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;

/** "2025-07-01" -> "01-07-2025" */
export function isoToDmy(iso: string): string {
  const p = parseIsoDate(iso);
  return p ? `${pad(p.d)}-${pad(p.m)}-${p.y}` : "";
}

/** Accepts DD-MM-YYYY (also / or . separators) and returns an ISO date, or null when invalid. */
export function dmyToIso(input: string): string | null {
  const match = /^\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\s*$/.exec(input);
  if (!match) return null;
  const iso = toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  return isValidIsoDate(iso) ? iso : null;
}

/** Normalises either an ISO date or a DD-MM-YYYY string to ISO. */
export function anyToIso(value: string): string | null {
  return isValidIsoDate(value) ? value : dmyToIso(value);
}

export function isoToLocalDate(iso: string): Date | undefined {
  const p = parseIsoDate(iso);
  return p ? new Date(p.y, p.m - 1, p.d) : undefined;
}

export function localDateToIso(date: Date): string {
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/** "2025-07-01" -> "1st July 2025" */
export function formatLongDate(iso: string): string {
  const p = parseIsoDate(iso);
  return p ? `${ordinal(p.d)} ${MONTHS[p.m - 1]} ${p.y}` : "";
}

/** "2025-07-01" -> "1 Jul 2025" */
export function formatShortDate(iso: string): string {
  const p = parseIsoDate(iso);
  return p ? `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y}` : "";
}

export function formatDateRange(start: string, end: string): string {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s || !e) return formatShortDate(start) || formatShortDate(end);
  if (start === end) return formatShortDate(start);
  if (s.y === e.y && s.m === e.m) return `${s.d} – ${e.d} ${MONTHS_SHORT[e.m - 1]} ${e.y}`;
  if (s.y === e.y) return `${s.d} ${MONTHS_SHORT[s.m - 1]} – ${e.d} ${MONTHS_SHORT[e.m - 1]} ${e.y}`;
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

const utcDay = (p: DateParts) => Date.UTC(p.y, p.m - 1, p.d);

export function daysInclusive(start: string, end: string): number | null {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s || !e) return null;
  const diff = Math.round((utcDay(e) - utcDay(s)) / DAY_MS) + 1;
  return diff > 0 ? diff : null;
}

/** Timestamp -> wall-clock parts in India Standard Time (no DST, so a fixed offset is exact). */
export function toIstParts(timestamp: string | number | Date) {
  const ms = new Date(timestamp).getTime() + IST_OFFSET_MINUTES * 60_000;
  const d = new Date(ms);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

/** "10 Oct 2026, 6:45 PM" in IST. Deterministic, so server and browser render identical text. */
export function formatTimestamp(timestamp: string): string {
  const p = toIstParts(timestamp);
  const h12 = p.h % 12 || 12;
  return `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y}, ${h12}:${pad(p.min)} ${p.h < 12 ? "AM" : "PM"}`;
}

export function formatTimestampDate(timestamp: string): string {
  const p = toIstParts(timestamp);
  return `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y}`;
}

/** ISO date (YYYY-MM-DD) of a timestamp in IST. */
export function istDateKey(timestamp: string | number | Date): string {
  const p = toIstParts(timestamp);
  return toIsoDate(p.y, p.m, p.d);
}

/** "2025-07-01".."2026-06-30" -> "2025–26" */
export function academicYearLabel(start: string, end: string): string {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s || !e) return "";
  if (s.y === e.y) return String(s.y);
  return `${s.y}–${String(e.y).slice(-2)}`;
}

/** Month buckets (YYYY-MM) covering an ISO date range, e.g. the academic period. */
export function monthsBetween(start: string, end: string): { key: string; label: string; year: number }[] {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s || !e) return [];
  const out: { key: string; label: string; year: number }[] = [];
  let y = s.y;
  let m = s.m;
  while (y < e.y || (y === e.y && m <= e.m)) {
    out.push({ key: `${y}-${pad(m)}`, label: MONTHS_SHORT[m - 1], year: y });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 60) break;
  }
  return out;
}

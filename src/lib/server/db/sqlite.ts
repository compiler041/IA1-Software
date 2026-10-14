import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { NewSubmission, Submission } from "@/lib/types";
import { getEnv } from "../env";
import { rowToSubmission, submissionToRow, type Repository, type SubmissionRow } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS submissions (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  year TEXT NOT NULL,
  branch TEXT NOT NULL,
  activity_category TEXT NOT NULL,
  organiser_participant_name TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  activity_details TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_ly_excp INTEGER NOT NULL DEFAULT 0,
  file_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_roll_no_idx ON submissions (roll_no);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

type GlobalWithDb = typeof globalThis & { __saSqlite?: { file: string; db: Database.Database } };

function getDb(): Database.Database {
  const g = globalThis as GlobalWithDb;
  const file = path.join(getEnv().dataDir, "portal.db");
  if (g.__saSqlite?.file === file) return g.__saSqlite.db;

  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  g.__saSqlite = { file, db };
  return db;
}

export function createSqliteRepository(): Repository {
  const db = getDb();

  const selectByIds = (ids: string[]) =>
    (
      db
        .prepare("SELECT * FROM submissions WHERE id IN (SELECT value FROM json_each(?)) ORDER BY seq DESC")
        .all(JSON.stringify(ids)) as SubmissionRow[]
    ).map(rowToSubmission);

  return {
    async insert(input: NewSubmission): Promise<Submission> {
      const row = submissionToRow(input);
      db.prepare(
        `INSERT INTO submissions (
          id, created_at, name, roll_no, email, mobile, year, branch, activity_category,
          organiser_participant_name, activity_name, activity_details, activity_level,
          start_date, end_date, is_ly_excp, file_key, file_name, file_size
        ) VALUES (
          @id, @created_at, @name, @roll_no, @email, @mobile, @year, @branch, @activity_category,
          @organiser_participant_name, @activity_name, @activity_details, @activity_level,
          @start_date, @end_date, @is_ly_excp, @file_key, @file_name, @file_size
        )`,
      ).run({ ...row, created_at: new Date().toISOString(), is_ly_excp: row.is_ly_excp ? 1 : 0 });
      const saved = db.prepare("SELECT * FROM submissions WHERE id = ?").get(input.id) as SubmissionRow;
      return rowToSubmission(saved);
    },

    async list() {
      return (db.prepare("SELECT * FROM submissions ORDER BY seq DESC").all() as SubmissionRow[]).map(rowToSubmission);
    },

    async getById(id) {
      const row = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as SubmissionRow | undefined;
      return row ? rowToSubmission(row) : null;
    },

    async getByIds(ids) {
      if (ids.length === 0) return [];
      return selectByIds(ids);
    },

    async deleteByIds(ids) {
      if (ids.length === 0) return [];
      const run = db.transaction((list: string[]) => {
        const rows = selectByIds(list);
        db.prepare("DELETE FROM submissions WHERE id IN (SELECT value FROM json_each(?))").run(JSON.stringify(list));
        return rows;
      });
      return run(ids);
    },

    async fileKeyInUse(key) {
      return Boolean(db.prepare("SELECT 1 FROM submissions WHERE file_key = ? LIMIT 1").get(key));
    },

    async allFileKeys() {
      const rows = db.prepare("SELECT file_key FROM submissions").all() as { file_key: string }[];
      return new Set(rows.map((r) => r.file_key));
    },

    async getSetting(key) {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
      if (!row) return null;
      try {
        return JSON.parse(row.value) as unknown;
      } catch {
        return null;
      }
    },

    async setSetting(key, value) {
      db.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ).run(key, JSON.stringify(value), new Date().toISOString());
    },
  };
}

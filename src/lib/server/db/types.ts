import type { NewSubmission, Submission } from "@/lib/types";

export interface Repository {
  insert(row: NewSubmission): Promise<Submission>;
  list(): Promise<Submission[]>;
  getById(id: string): Promise<Submission | null>;
  getByIds(ids: string[]): Promise<Submission[]>;
  /** Deletes rows and returns them so their files can be removed too. */
  deleteByIds(ids: string[]): Promise<Submission[]>;
  fileKeyInUse(key: string): Promise<boolean>;
  allFileKeys(): Promise<Set<string>>;
  getSetting(key: string): Promise<unknown | null>;
  setSetting(key: string, value: unknown): Promise<void>;
}

export type SubmissionRow = {
  id: string;
  seq: number;
  created_at: string;
  name: string;
  roll_no: string;
  email: string;
  mobile: string;
  year: string;
  branch: string;
  activity_category: string;
  organiser_participant_name: string;
  activity_name: string;
  activity_details: string;
  activity_level: string;
  start_date: string;
  end_date: string;
  is_ly_excp: boolean | number;
  file_key: string;
  file_name: string;
  file_size: number | string;
};

export function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    seq: Number(row.seq),
    createdAt: new Date(row.created_at).toISOString(),
    name: row.name,
    rollNo: row.roll_no,
    email: row.email,
    mobile: row.mobile,
    year: row.year as Submission["year"],
    branch: row.branch as Submission["branch"],
    activityCategory: row.activity_category,
    organiserParticipantName: row.organiser_participant_name,
    activityName: row.activity_name,
    activityDetails: row.activity_details,
    activityLevel: row.activity_level as Submission["activityLevel"],
    startDate: String(row.start_date).slice(0, 10),
    endDate: String(row.end_date).slice(0, 10),
    isLyExcp: Boolean(row.is_ly_excp),
    fileKey: row.file_key,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
  };
}

export function submissionToRow(s: NewSubmission) {
  return {
    id: s.id,
    name: s.name,
    roll_no: s.rollNo,
    email: s.email,
    mobile: s.mobile,
    year: s.year,
    branch: s.branch,
    activity_category: s.activityCategory,
    organiser_participant_name: s.organiserParticipantName,
    activity_name: s.activityName,
    activity_details: s.activityDetails,
    activity_level: s.activityLevel,
    start_date: s.startDate,
    end_date: s.endDate,
    is_ly_excp: s.isLyExcp,
    file_key: s.fileKey,
    file_name: s.fileName,
    file_size: s.fileSize,
  };
}

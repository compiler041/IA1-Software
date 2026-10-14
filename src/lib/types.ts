import type { ActivityLevel, Branch, Year } from "./form-config";

export type Submission = {
  id: string;
  seq: number;
  createdAt: string;
  name: string;
  rollNo: string;
  email: string;
  mobile: string;
  year: Year;
  branch: Branch;
  activityCategory: string;
  organiserParticipantName: string;
  activityName: string;
  activityDetails: string;
  activityLevel: ActivityLevel;
  startDate: string;
  endDate: string;
  isLyExcp: boolean;
  fileKey: string;
  fileName: string;
  fileSize: number;
};

/** Validated student answers (everything except the uploaded file and system fields). */
export type SubmissionInput = Omit<Submission, "id" | "seq" | "createdAt" | "fileKey" | "fileName" | "fileSize">;

export type NewSubmission = SubmissionInput & {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
};

export type StorageMode = "local" | "supabase";

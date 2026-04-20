/**
 * DarePool Report System
 *
 * Stores user reports in localStorage.
 * A dare with >= 1 report is flagged and hidden from the homepage feed.
 * (Future: admin review dashboard, automatic removal thresholds, appeals flow)
 */

export type ReportReason =
  | "dangerous"
  | "illegal"
  | "harassment"
  | "hate_speech"
  | "sexual"
  | "offensive"
  | "other";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  dangerous: "Dangerous / self-harm",
  illegal: "Illegal activity",
  harassment: "Harassment / bullying",
  hate_speech: "Hate speech / racism",
  sexual: "Sexual / inappropriate",
  offensive: "Offensive language",
  other: "Other",
};

export interface Report {
  id: string;
  dareId: string;
  reason: ReportReason;
  reportedBy: string;
  reportedAt: number;
}

const REPORTS_KEY = "darepool_reports";

function loadReports(): Report[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Report[];
  } catch {
    return [];
  }
}

function saveReports(reports: Report[]) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function submitReport(
  dareId: string,
  reason: ReportReason,
  reportedBy: string
): Report {
  const reports = loadReports();
  const report: Report = {
    id: crypto.randomUUID(),
    dareId,
    reason,
    reportedBy,
    reportedAt: Date.now(),
  };
  saveReports([...reports, report]);
  return report;
}

export function getReportsForDare(dareId: string): Report[] {
  return loadReports().filter((r) => r.dareId === dareId);
}

/** A dare is flagged if it has at least one report */
export function isDareFlagged(dareId: string): boolean {
  return getReportsForDare(dareId).length > 0;
}

/** Whether a specific user has already reported a specific dare */
export function hasUserReported(dareId: string, username: string): boolean {
  return loadReports().some(
    (r) => r.dareId === dareId && r.reportedBy === username
  );
}

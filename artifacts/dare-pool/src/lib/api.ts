/**
 * DarePool API client
 * All server calls go through this file. Keep functions typed and thin.
 * The Vite dev server proxies /api → api-server (port 8080).
 */

const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("darepool_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() };
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  username: string;
  isAdmin: boolean;
  isBanned?: boolean;
  wins: number;
  totalEntries: number;
  totalVotesCast: number;
  strikeCount?: number;
  createdAt: string;
}

export interface ApiDare {
  id: number;
  title: string;
  description: string;
  prizePool: number;
  createdByUserId: number;
  createdByUsername: string | null;
  createdAt: string;
  expiresAt: string;
  status: "active" | "expired" | "reported" | "removed";
  winnerEntryId: number | null;
  isFeatured: boolean;
  reportCount: number;
  entryCount: number;
}

export interface ApiEntry {
  id: number;
  dareId: number;
  userId: number;
  username: string | null;
  videoUrl: string;
  videoType: "link" | "upload";
  createdAt: string;
  voteCount: number;
  status: "active" | "removed" | "flagged" | "winner";
}

export interface ApiReport {
  id: number;
  dareId: number | null;
  entryId: number | null;
  reason: string;
  status: string;
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiRegister(username: string, email: string, password: string) {
  return request<{ token: string; user: Pick<ApiUser, "id" | "username" | "isAdmin"> }>(
    "POST",
    "/auth/register",
    { username, email, password }
  );
}

export async function apiLogin(email: string, password: string) {
  return request<{ token: string; user: Pick<ApiUser, "id" | "username" | "isAdmin"> }>(
    "POST",
    "/auth/login",
    { email, password }
  );
}

export async function apiMe() {
  return request<{ user: ApiUser }>("GET", "/auth/me");
}

// ─── Dares ────────────────────────────────────────────────────────────────────

export async function apiGetDares(filter?: string, status?: string) {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (status) params.set("status", status);
  const qs = params.toString() ? `?${params}` : "";
  return request<{ dares: ApiDare[] }>("GET", `/dares${qs}`);
}

export async function apiGetDare(id: number) {
  return request<{ dare: ApiDare }>("GET", `/dares/${id}`);
}

export async function apiCreateDare(title: string, description: string, prizePool: number) {
  return request<{ dare: ApiDare }>("POST", "/dares", { title, description, prizePool });
}

// ─── Entries ──────────────────────────────────────────────────────────────────

export async function apiGetEntries(dareId: number) {
  return request<{ entries: ApiEntry[]; votedEntryId: number | null }>(
    "GET",
    `/dares/${dareId}/entries`
  );
}

export async function apiSubmitEntry(dareId: number, videoUrl: string, videoType: "link" | "upload") {
  return request<{ entry: ApiEntry }>("POST", `/dares/${dareId}/entries`, { videoUrl, videoType });
}

export async function apiUploadEntry(dareId: number, file: File) {
  const form = new FormData();
  form.append("video", file);
  return request<{ entry: ApiEntry }>(
    "POST",
    `/dares/${dareId}/entries/upload`,
    form,
    true
  );
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export async function apiVote(dareId: number, entryId: number) {
  return request<{ ok: boolean; entryId: number }>("POST", `/dares/${dareId}/vote`, { entryId });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function apiReport(payload: {
  dareId?: number;
  entryId?: number;
  reason: string;
  details?: string;
}) {
  return request<{ report: ApiReport }>("POST", "/reports", payload);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function apiGetUser(id: number) {
  return request<{
    user: ApiUser;
    dares: ApiDare[];
    entries: ApiEntry[];
  }>("GET", `/users/${id}`);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function apiAdminOverview() {
  return request<{ dares: ApiDare[]; reports: ApiReport[]; users: ApiUser[] }>(
    "GET",
    "/admin/overview"
  );
}
export const apiAdminRemoveDare = (id: number, notes?: string) =>
  request("POST", `/admin/dares/${id}/remove`, { notes });
export const apiAdminFeatureDare = (id: number) =>
  request("POST", `/admin/dares/${id}/feature`, {});
export const apiAdminOverrideWinner = (dareId: number, entryId: number) =>
  request("POST", `/admin/dares/${dareId}/winner`, { entryId });
export const apiAdminRemoveEntry = (id: number, notes?: string) =>
  request("POST", `/admin/entries/${id}/remove`, { notes });
export const apiAdminBanUser = (id: number, notes?: string) =>
  request("POST", `/admin/users/${id}/ban`, { notes });
export const apiAdminUnbanUser = (id: number) =>
  request("POST", `/admin/users/${id}/unban`, {});
export const apiAdminDismissReport = (id: number) =>
  request("POST", `/admin/reports/${id}/dismiss`, {});
export const apiAdminActionReport = (id: number, notes?: string) =>
  request("POST", `/admin/reports/${id}/action`, { notes });

// ─── Seed ────────────────────────────────────────────────────────────────────

export async function apiSeed() {
  return request<{ ok: boolean; message: string; adminLogin?: { email: string; password: string } }>(
    "POST",
    "/seed",
    {}
  );
}

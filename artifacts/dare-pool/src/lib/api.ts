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
  bio: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isBanned?: boolean;
  wins: number;
  totalEntries: number;
  totalVotesCast: number;
  totalComments: number;
  currentWinStreak: number;
  bestWinStreak: number;
  totalPrizeEarnings: number;
  maxVotesOnEntry: number;
  winRate: number;
  strikeCount?: number;
  createdAt: string;
  lastActiveAt: string | null;
  lastUsernameChangeAt?: string | null;
}

export interface ApiBadge {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export interface ApiProfileEntry {
  id: number;
  dareId: number;
  dareTitle: string;
  voteCount: number;
  status: string;
  createdAt: string;
}

export interface ApiWin {
  entryId: number;
  dareId: number;
  dareTitle: string;
  prizePool: number;
  voteCount: number;
  completedAt: string;
}

export interface ApiProfileComment {
  id: number;
  entryId: number;
  dareId: number | null;
  dareTitle: string;
  content: string;
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
  status: "active" | "completed" | "expired" | "expired_no_submissions" | "transferred" | "reported" | "removed";
  winnerEntryId: number | null;
  transferredToDareId: number | null;
  transferReason: string | null;
  transferredToDareTitle?: string | null;
  isFeatured: boolean;
  reportCount: number;
  entryCount: number;
  funderCount?: number;
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

// ─── Comments ────────────────────────────────────────────────────────────────

export interface ApiComment {
  id: number;
  entryId: number | null;
  dareId?: number | null;
  userId: number;
  username: string | null;
  avatarUrl?: string | null;
  content: string;
  status?: string;
  reportCount?: number;
  createdAt: string;
}

export async function apiGetComments(entryId: number) {
  return request<{ comments: ApiComment[] }>("GET", `/entries/${entryId}/comments`);
}

export async function apiAddComment(entryId: number, content: string) {
  return request<{ comment: ApiComment }>("POST", `/entries/${entryId}/comments`, { content });
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

// ─── Dare Comments ────────────────────────────────────────────────────────────

export interface ApiDareComment {
  id: number;
  dareId: number | null;
  entryId: number | null;
  userId: number;
  username: string | null;
  avatarUrl: string | null;
  content: string;
  status: string;
  reportCount: number;
  createdAt: string;
}

export async function apiGetDareComments(dareId: number) {
  return request<{ comments: ApiDareComment[] }>("GET", `/dares/${dareId}/comments`);
}

export async function apiAddDareComment(dareId: number, content: string) {
  return request<{ comment: ApiDareComment }>("POST", `/dares/${dareId}/comments`, { content });
}

export async function apiReportComment(commentId: number, target: "dare" | "entry", targetId: number, reason: string) {
  const path = target === "dare"
    ? `/dares/${targetId}/comments/${commentId}/report`
    : `/entries/${targetId}/comments/${commentId}/report`;
  return request<{ ok: boolean }>("POST", path, { reason });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function apiGetUser(id: number) {
  return request<{
    user: ApiUser;
    entries: ApiProfileEntry[];
    wins: ApiWin[];
    comments: ApiProfileComment[];
    badges: ApiBadge[];
  }>("GET", `/users/${id}`);
}

export async function apiUpdateProfile(
  id: number,
  data: { bio?: string; avatarUrl?: string; username?: string }
) {
  return request<{
    user: Pick<ApiUser, "id" | "username" | "bio" | "avatarUrl" | "lastUsernameChangeAt">;
  }>(
    "PATCH",
    `/users/${id}`,
    data
  );
}

export async function apiUploadAvatar(id: number, file: File) {
  const form = new FormData();
  form.append("avatar", file);
  return request<{ user: { id: number; username: string; avatarUrl: string }; avatarUrl: string }>(
    "POST",
    `/users/${id}/avatar`,
    form,
    true
  );
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

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface ApiWallet {
  id: number;
  userId: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawableBalance: number;
  lifetimeDeposited: number;
  lifetimeWithdrawn: number;
  lifetimeWon: number;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiWalletTransaction {
  id: number;
  userId: number;
  type: string;
  status: string;
  amount: number;
  currency: string;
  processor: string;
  processorReferenceId: string | null;
  relatedDareId: number | null;
  relatedEntryId: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPayoutAccount {
  id: number;
  userId: number;
  provider: string;
  providerAccountId: string;
  onboardingComplete: number;
  payoutsEnabled: number;
  chargesEnabled: number;
}

export async function apiGetWallet() {
  return request<{ wallet: ApiWallet; transactions: ApiWalletTransaction[]; payoutAccount: ApiPayoutAccount | null }>(
    "GET", "/wallet"
  );
}

export async function apiDepositFunds(amount: number) {
  return request<{ url: string; sessionId: string }>("POST", "/wallet/deposit", { amount });
}

export async function apiWithdrawFunds(amount: number) {
  return request<{ ok: boolean }>("POST", "/wallet/withdraw", { amount });
}

export async function apiStartOnboarding() {
  return request<{ url: string }>("POST", "/wallet/onboard", {});
}

// ─── Dare Funding ─────────────────────────────────────────────────────────────

export async function apiFundDare(dareId: number, amount: number) {
  return request<{ success: boolean; newPrizePool: number }>(
    "POST", `/dares/${dareId}/fund`, { amount }
  );
}

export async function apiGetFundingStats(dareId: number) {
  return request<{ funderCount: number }>("GET", `/dares/${dareId}/fund`);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface ApiNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedDareId: number | null;
  relatedTargetDareId: number | null;
  isRead: boolean;
  createdAt: string;
}

export async function apiGetNotifications() {
  return request<{ notifications: ApiNotification[]; unreadCount: number }>(
    "GET", "/notifications"
  );
}

export async function apiMarkNotificationRead(id: number) {
  return request<{ success: boolean }>("POST", `/notifications/${id}/read`, {});
}

export async function apiMarkAllNotificationsRead() {
  return request<{ success: boolean }>("POST", "/notifications/read-all", {});
}

// ─── Reels ────────────────────────────────────────────────────────────────────

export interface ApiReel {
  id: number;
  dareId: number;
  userId: number;
  username: string | null;
  avatarUrl: string | null;
  videoUrl: string;
  videoType: string;
  status: string;
  voteCount: number;
  createdAt: string;
  dareTitle: string | null;
  dareStatus: string | null;
  darePrize: number;
}

export async function apiGetReels(limit = 30, offset = 0) {
  return request<{ reels: ApiReel[]; limit: number; offset: number }>(
    "GET", `/reels?limit=${limit}&offset=${offset}`
  );
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export async function apiSeed() {
  return request<{ ok: boolean; message: string; adminLogin?: { email: string; password: string } }>(
    "POST",
    "/seed",
    {}
  );
}

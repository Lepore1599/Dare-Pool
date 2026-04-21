import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  notificationPreferencesTable,
  blockedUsersTable,
  supportTicketsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ─── GET /api/settings/profile ─────────────────────────────────────────────
router.get("/profile", async (req, res) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      displayName: usersTable.displayName,
      bio: usersTable.bio,
      avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt,
      lastUsernameChangeAt: usersTable.lastUsernameChangeAt,
      emailVerified: usersTable.emailVerified,
      termsAcceptedAt: usersTable.termsAcceptedAt,
      guidelinesAcceptedAt: usersTable.guidelinesAcceptedAt,
      privacyAcceptedAt: usersTable.privacyAcceptedAt,
      riskAcceptedAt: usersTable.riskAcceptedAt,
      acceptedPolicyVersion: usersTable.acceptedPolicyVersion,
      totalPrizeEarnings: usersTable.totalPrizeEarnings,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json({ profile: user });
});

// ─── PUT /api/settings/profile ─────────────────────────────────────────────
router.put("/profile", async (req, res) => {
  const { displayName, bio, avatarUrl, email } = req.body as Record<string, string | undefined>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (displayName !== undefined) updates.displayName = displayName.slice(0, 50) || null;
  if (bio !== undefined) updates.bio = bio.slice(0, 200) || null;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl.slice(0, 500) || null;

  if (email !== undefined) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      res.status(400).json({ error: "Invalid email address." });
      return;
    }
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, trimmed))
      .limit(1);
    if (existing.length > 0 && existing[0]!.id !== req.user!.userId) {
      res.status(409).json({ error: "That email is already in use." });
      return;
    }
    updates.email = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.userId));
  res.json({ ok: true });
});

// ─── GET /api/settings/privacy ─────────────────────────────────────────────
router.get("/privacy", async (req, res) => {
  const [user] = await db
    .select({
      privateAccount: usersTable.privateAccount,
      commentPrivacyDares: usersTable.commentPrivacyDares,
      commentPrivacySubmissions: usersTable.commentPrivacySubmissions,
      messagePrivacy: usersTable.messagePrivacy,
      hideEarnings: usersTable.hideEarnings,
      allowBoosts: usersTable.allowBoosts,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found." }); return; }
  res.json({ privacy: user });
});

// ─── PUT /api/settings/privacy ─────────────────────────────────────────────
router.put("/privacy", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (typeof b.privateAccount === "boolean") updates.privateAccount = b.privateAccount;
  if (typeof b.commentPrivacyDares === "string") updates.commentPrivacyDares = b.commentPrivacyDares;
  if (typeof b.commentPrivacySubmissions === "string") updates.commentPrivacySubmissions = b.commentPrivacySubmissions;
  if (typeof b.messagePrivacy === "string") updates.messagePrivacy = b.messagePrivacy;
  if (typeof b.hideEarnings === "boolean") updates.hideEarnings = b.hideEarnings;
  if (typeof b.allowBoosts === "boolean") updates.allowBoosts = b.allowBoosts;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.userId));
  res.json({ ok: true });
});

// ─── GET /api/settings/content ─────────────────────────────────────────────
router.get("/content", async (req, res) => {
  const [user] = await db
    .select({
      dataSaverEnabled: usersTable.dataSaverEnabled,
      autoplayEnabled: usersTable.autoplayEnabled,
      mutedByDefault: usersTable.mutedByDefault,
      language: usersTable.language,
      theme: usersTable.theme,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found." }); return; }
  res.json({ content: user });
});

// ─── PUT /api/settings/content ─────────────────────────────────────────────
router.put("/content", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (typeof b.dataSaverEnabled === "boolean") updates.dataSaverEnabled = b.dataSaverEnabled;
  if (typeof b.autoplayEnabled === "boolean") updates.autoplayEnabled = b.autoplayEnabled;
  if (typeof b.mutedByDefault === "boolean") updates.mutedByDefault = b.mutedByDefault;
  if (typeof b.language === "string") updates.language = b.language;
  if (typeof b.theme === "string") updates.theme = b.theme;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.userId));
  res.json({ ok: true });
});

// ─── GET /api/settings/notifications ───────────────────────────────────────
router.get("/notifications", async (req, res) => {
  const uid = req.user!.userId;
  let [prefs] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, uid))
    .limit(1);

  if (!prefs) {
    [prefs] = await db
      .insert(notificationPreferencesTable)
      .values({ userId: uid })
      .returning();
  }

  res.json({ notifications: prefs });
});

// ─── PUT /api/settings/notifications ───────────────────────────────────────
router.put("/notifications", async (req, res) => {
  const uid = req.user!.userId;
  const b = req.body as Record<string, unknown>;

  const allowed = [
    "notifyDareFunded", "notifyNewSubmission", "notifyNewDareComment",
    "notifyNewSubmissionComment", "notifyBoostOnMyDare", "notifyDareWon",
    "notifyPoolTransferred", "notifyWalletDeposit", "notifyWithdrawalStatus",
    "notifySecurityAlerts", "notifyMarketing",
  ] as const;

  const updates: Partial<typeof notificationPreferencesTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  for (const key of allowed) {
    if (typeof b[key] === "boolean") (updates as Record<string, unknown>)[key] = b[key];
  }

  const existing = await db
    .select({ id: notificationPreferencesTable.id })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, uid))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(notificationPreferencesTable).values({ userId: uid, ...updates });
  } else {
    await db.update(notificationPreferencesTable).set(updates).where(eq(notificationPreferencesTable.userId, uid));
  }

  res.json({ ok: true });
});

// ─── GET /api/settings/blocked-users ───────────────────────────────────────
router.get("/blocked-users", async (req, res) => {
  const uid = req.user!.userId;
  const rows = await db
    .select({
      id: blockedUsersTable.id,
      blockedUserId: blockedUsersTable.blockedUserId,
      blockedUsername: usersTable.username,
      createdAt: blockedUsersTable.createdAt,
    })
    .from(blockedUsersTable)
    .leftJoin(usersTable, eq(usersTable.id, blockedUsersTable.blockedUserId))
    .where(eq(blockedUsersTable.userId, uid));

  res.json({ blocked: rows });
});

// ─── POST /api/settings/blocked-users ──────────────────────────────────────
router.post("/blocked-users", async (req, res) => {
  const uid = req.user!.userId;
  const { blockedUserId } = req.body as { blockedUserId?: number };

  if (!blockedUserId || typeof blockedUserId !== "number") {
    res.status(400).json({ error: "blockedUserId required." });
    return;
  }
  if (blockedUserId === uid) {
    res.status(400).json({ error: "Cannot block yourself." });
    return;
  }

  const existing = await db
    .select({ id: blockedUsersTable.id })
    .from(blockedUsersTable)
    .where(and(eq(blockedUsersTable.userId, uid), eq(blockedUsersTable.blockedUserId, blockedUserId)))
    .limit(1);

  if (existing.length > 0) {
    res.json({ ok: true, message: "Already blocked." });
    return;
  }

  await db.insert(blockedUsersTable).values({ userId: uid, blockedUserId });
  res.json({ ok: true });
});

// ─── DELETE /api/settings/blocked-users/:id ────────────────────────────────
router.delete("/blocked-users/:id", async (req, res) => {
  const uid = req.user!.userId;
  const blockId = Number(req.params.id);
  await db
    .delete(blockedUsersTable)
    .where(and(eq(blockedUsersTable.id, blockId), eq(blockedUsersTable.userId, uid)));
  res.json({ ok: true });
});

// ─── POST /api/settings/support-ticket ─────────────────────────────────────
router.post("/support-ticket", async (req, res) => {
  const uid = req.user!.userId;
  const { category, subject, details } = req.body as Record<string, string | undefined>;

  if (!category || !subject || !details) {
    res.status(400).json({ error: "category, subject, and details are required." });
    return;
  }

  const [ticket] = await db
    .insert(supportTicketsTable)
    .values({ userId: uid, category, subject: subject.slice(0, 200), details: details.slice(0, 2000) })
    .returning({ id: supportTicketsTable.id });

  res.json({ ok: true, ticketId: ticket?.id });
});

// ─── POST /api/settings/change-password ────────────────────────────────────
router.post("/change-password", async (req, res) => {
  const uid = req.user!.userId;
  const { currentPassword, newPassword } = req.body as Record<string, string | undefined>;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new passwords are required." });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }
  if (newPassword.length > 72) {
    res.status(400).json({ error: "New password is too long." });
    return;
  }

  const [user] = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, uid))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found." }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, uid));
  res.json({ ok: true });
});

// ─── POST /api/settings/delete-account ─────────────────────────────────────
router.post("/delete-account", async (req, res) => {
  const uid = req.user!.userId;
  const { password } = req.body as { password?: string };

  if (!password) {
    res.status(400).json({ error: "Password is required to delete your account." });
    return;
  }

  const [user] = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, uid))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found." }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  await db.update(usersTable).set({
    deletedAt: new Date(),
    email: `deleted_${uid}_${Date.now()}@deleted.darepool`,
    username: `deleted_${uid}`,
    passwordHash: "DELETED",
    bio: null,
    avatarUrl: null,
    displayName: null,
  }).where(eq(usersTable.id, uid));

  res.json({ ok: true });
});

export default router;

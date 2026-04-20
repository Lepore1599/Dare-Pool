import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, daresTable, entriesTable, commentsTable, updateProfileSchema } from "@workspace/db";
import { eq, desc, count, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { avatarUpload } from "../lib/uploads";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

// ─── Badge computation ────────────────────────────────────────────────────────

interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

function computeBadges(user: {
  wins: number;
  totalEntries: number;
  totalComments: number;
  currentWinStreak: number;
  strikeCount: number;
  createdAt: Date;
}): Badge[] {
  const badges: Badge[] = [];

  if (user.wins >= 1)
    badges.push({ id: "first_win", label: "First Win", emoji: "🔥", description: "Won their first dare" });
  if (user.wins >= 5)
    badges.push({ id: "champion", label: "Champion", emoji: "👑", description: "Won 5 or more dares" });
  if (user.wins >= 10)
    badges.push({ id: "legend", label: "Legend", emoji: "🏆", description: "Won 10 or more dares" });
  if (user.wins >= 3)
    badges.push({ id: "top_performer", label: "Top Performer", emoji: "🌟", description: "Consistently finishing at the top" });
  if (user.totalEntries >= 1)
    badges.push({ id: "competitor", label: "Competitor", emoji: "📋", description: "Submitted their first entry" });
  if (user.totalEntries >= 10)
    badges.push({ id: "active_competitor", label: "Active Competitor", emoji: "🎯", description: "Submitted 10 or more entries" });
  if (user.totalComments >= 25)
    badges.push({ id: "commentator", label: "Commentator", emoji: "💬", description: "Left 25 or more comments" });
  if (user.currentWinStreak >= 3)
    badges.push({ id: "hot_streak", label: "Hot Streak", emoji: "⚡", description: "On a 3+ win streak" });
  if (user.strikeCount === 0 && user.totalEntries > 0)
    badges.push({ id: "clean_account", label: "Clean Account", emoji: "✅", description: "No strikes on record" });

  // Early user: joined in the first 90 days after launch
  const appLaunchDate = new Date("2024-01-01");
  const earlyThreshold = new Date(appLaunchDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (new Date(user.createdAt) <= earlyThreshold)
    badges.push({ id: "early_user", label: "Early User", emoji: "🚀", description: "Joined during the early days" });

  return badges;
}

// ─── Touch last active (fire-and-forget) ─────────────────────────────────────

export async function touchLastActive(userId: number) {
  try {
    await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, userId));
  } catch { /* non-critical */ }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID." }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found." }); return; }

  const isAdminReq = req.user?.isAdmin === true;
  const isSelf = req.user?.userId === id;

  // Entries with dare titles
  const rawEntries = await db
    .select({
      id: entriesTable.id,
      dareId: entriesTable.dareId,
      dareTitle: daresTable.title,
      voteCount: entriesTable.voteCount,
      status: entriesTable.status,
      createdAt: entriesTable.createdAt,
      prizePool: daresTable.prizePool,
    })
    .from(entriesTable)
    .leftJoin(daresTable, eq(entriesTable.dareId, daresTable.id))
    .where(eq(entriesTable.userId, id))
    .orderBy(desc(entriesTable.createdAt));

  const wins = rawEntries.filter((e) => e.status === "winner");
  const totalPrizeEarnings = wins.reduce((acc, e) => acc + (e.prizePool ?? 0), 0);
  const maxVotesOnEntry = rawEntries.length > 0 ? Math.max(...rawEntries.map((e) => e.voteCount)) : 0;
  const winRate = rawEntries.length > 0 ? Math.round((wins.length / rawEntries.length) * 100) : 0;

  // Win streak computation
  const sortedByDate = [...rawEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let bestStreak = 0, runningStreak = 0, currentStreak = 0;
  for (const e of sortedByDate) {
    if (e.status === "winner") { runningStreak++; if (runningStreak > bestStreak) bestStreak = runningStreak; }
    else runningStreak = 0;
  }
  for (let i = sortedByDate.length - 1; i >= 0; i--) {
    if (sortedByDate[i]?.status === "winner") currentStreak++;
    else break;
  }

  // Recent comments with dare context
  const rawComments = await db
    .select({
      id: commentsTable.id,
      entryId: commentsTable.entryId,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
      dareId: entriesTable.dareId,
      dareTitle: daresTable.title,
    })
    .from(commentsTable)
    .leftJoin(entriesTable, eq(commentsTable.entryId, entriesTable.id))
    .leftJoin(daresTable, eq(entriesTable.dareId, daresTable.id))
    .where(eq(commentsTable.userId, id))
    .orderBy(desc(commentsTable.createdAt))
    .limit(50);

  const [{ value: totalComments }] = await db
    .select({ value: count() })
    .from(commentsTable)
    .where(eq(commentsTable.userId, id));

  const badges = computeBadges({
    wins: wins.length, totalEntries: rawEntries.length, totalComments,
    currentWinStreak: currentStreak, strikeCount: user.strikeCount, createdAt: user.createdAt,
  });

  const publicUser = {
    id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin, isBanned: user.isBanned,
    wins: wins.length, totalEntries: rawEntries.length, totalVotesCast: user.totalVotesCast,
    totalComments, currentWinStreak: currentStreak,
    bestWinStreak: Math.max(bestStreak, user.bestWinStreak),
    totalPrizeEarnings, maxVotesOnEntry, winRate,
    createdAt: user.createdAt, lastActiveAt: user.lastActiveAt,
    lastUsernameChangeAt: (isAdminReq || isSelf) ? user.lastUsernameChangeAt : undefined,
    ...(isAdminReq || isSelf ? { strikeCount: user.strikeCount } : {}),
  };

  res.json({
    user: publicUser,
    entries: rawEntries.map((e) => ({
      id: e.id, dareId: e.dareId, dareTitle: e.dareTitle ?? `Dare #${e.dareId}`,
      voteCount: e.voteCount, status: e.status, createdAt: e.createdAt,
    })),
    wins: wins.map((e) => ({
      entryId: e.id, dareId: e.dareId, dareTitle: e.dareTitle ?? `Dare #${e.dareId}`,
      prizePool: e.prizePool ?? 0, voteCount: e.voteCount, completedAt: e.createdAt,
    })),
    comments: rawComments.map((c) => ({
      id: c.id, entryId: c.entryId, dareId: c.dareId,
      dareTitle: c.dareTitle ?? "Unknown dare", content: c.content, createdAt: c.createdAt,
    })),
    badges,
  });
});

// ─── POST /api/users/:id/avatar — upload profile picture ─────────────────────

router.post(
  "/:id/avatar",
  requireAuth,
  avatarUpload.single("avatar"),
  async (req, res) => {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID." }); return; }

    if (req.user!.userId !== id && !req.user!.isAdmin) {
      // Clean up uploaded file if auth fails
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(403).json({ error: "You can only update your own profile picture." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No image file uploaded." });
      return;
    }

    // Delete old avatar file if it was a local upload
    const [existing] = await db
      .select({ avatarUrl: usersTable.avatarUrl })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (existing?.avatarUrl?.startsWith("/api/uploads/avatars/")) {
      const oldFilename = existing.avatarUrl.replace("/api/uploads/avatars/", "");
      const oldPath = path.resolve(__dirname, "../../uploads/avatars", oldFilename);
      fs.unlink(oldPath, () => {}); // non-blocking, ignore errors
    }

    const avatarUrl = `/api/uploads/avatars/${req.file.filename}`;

    const [updated] = await db
      .update(usersTable)
      .set({ avatarUrl })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, username: usersTable.username, avatarUrl: usersTable.avatarUrl });

    res.json({ user: updated, avatarUrl });
  }
);

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────

router.patch("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID." }); return; }

  if (req.user!.userId !== id && !req.user!.isAdmin) {
    res.status(403).json({ error: "You can only edit your own profile." }); return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid profile data." }); return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.bio !== undefined) updates["bio"] = parsed.data.bio || null;
  if (parsed.data.avatarUrl !== undefined) updates["avatarUrl"] = parsed.data.avatarUrl || null;

  // ── Username change with 30-day cooldown ──────────────────────────────────
  if (parsed.data.username !== undefined) {
    const newUsername = parsed.data.username;

    // Fetch current user data
    const [currentUser] = await db
      .select({ username: usersTable.username, lastUsernameChangeAt: usersTable.lastUsernameChangeAt })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!currentUser) { res.status(404).json({ error: "User not found." }); return; }

    // Skip if username unchanged
    if (newUsername !== currentUser.username) {
      // Enforce 30-day cooldown (admin bypasses this)
      if (!req.user!.isAdmin && currentUser.lastUsernameChangeAt) {
        const daysSince = (Date.now() - new Date(currentUser.lastUsernameChangeAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          const nextAllowed = new Date(
            new Date(currentUser.lastUsernameChangeAt).getTime() + 30 * 24 * 60 * 60 * 1000
          );
          res.status(429).json({
            error: `You can only change your username once every 30 days. You can change it again on ${nextAllowed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
            nextAllowedAt: nextAllowed.toISOString(),
          });
          return;
        }
      }

      // Check uniqueness (case-insensitive)
      const [conflict] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, newUsername))
        .limit(1);

      if (conflict && conflict.id !== id) {
        res.status(409).json({ error: "That username is already taken." }); return;
      }

      updates["username"] = newUsername;
      updates["lastUsernameChangeAt"] = new Date();
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update." }); return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      bio: usersTable.bio,
      avatarUrl: usersTable.avatarUrl,
      lastUsernameChangeAt: usersTable.lastUsernameChangeAt,
    });

  res.json({ user: updated });
});

export default router;

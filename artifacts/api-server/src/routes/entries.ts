import { Router } from "express";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { entriesTable, daresTable, usersTable, votesTable, submitEntrySchema } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { upload } from "../lib/uploads";

const router = Router({ mergeParams: true });

// GET /api/dares/:dareId/entries
router.get("/", async (req, res) => {
  const dareId = parseInt((req.params as Record<string, string>)["dareId"]);
  if (isNaN(dareId)) {
    res.status(400).json({ error: "Invalid dare ID." });
    return;
  }

  const entries = await db
    .select({
      id: entriesTable.id,
      dareId: entriesTable.dareId,
      userId: entriesTable.userId,
      username: usersTable.username,
      videoUrl: entriesTable.videoUrl,
      videoType: entriesTable.videoType,
      createdAt: entriesTable.createdAt,
      voteCount: entriesTable.voteCount,
      status: entriesTable.status,
    })
    .from(entriesTable)
    .leftJoin(usersTable, eq(entriesTable.userId, usersTable.id))
    .where(and(eq(entriesTable.dareId, dareId), ne(entriesTable.status, "removed")));

  // Randomize display order so first-place entry doesn't always get more exposure
  const shuffled = [...entries].sort(() => Math.random() - 0.5);

  // But put winner on top if the dare is expired
  const [dare] = await db
    .select({ winnerEntryId: daresTable.winnerEntryId, status: daresTable.status })
    .from(daresTable)
    .where(eq(daresTable.id, dareId))
    .limit(1);

  let result = shuffled;
  if (dare?.status === "expired" && dare.winnerEntryId) {
    result = [
      ...shuffled.filter((e) => e.id === dare.winnerEntryId),
      ...shuffled.filter((e) => e.id !== dare.winnerEntryId),
    ];
  }

  // If viewer is logged in, tell them which entry they voted for
  const votedEntryId = req.headers.authorization
    ? await (async () => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) return null;
        const { verifyToken } = await import("../lib/jwt");
        const payload = verifyToken(token);
        if (!payload) return null;
        const [vote] = await db
          .select({ entryId: votesTable.entryId })
          .from(votesTable)
          .where(and(eq(votesTable.dareId, dareId), eq(votesTable.userId, payload.userId)))
          .limit(1);
        return vote?.entryId ?? null;
      })()
    : null;

  res.json({ entries: result, votedEntryId });
});

// POST /api/dares/:dareId/entries  — submit an entry (link)
router.post("/", requireAuth, async (req, res) => {
  const dareId = parseInt((req.params as Record<string, string>)["dareId"]);
  if (isNaN(dareId)) {
    res.status(400).json({ error: "Invalid dare ID." });
    return;
  }

  const [dare] = await db
    .select()
    .from(daresTable)
    .where(eq(daresTable.id, dareId))
    .limit(1);

  if (!dare) {
    res.status(404).json({ error: "Dare not found." });
    return;
  }
  if (dare.status !== "active") {
    res.status(403).json({ error: "This dare is no longer accepting submissions." });
    return;
  }

  // One submission per user per dare
  const [existing] = await db
    .select({ id: entriesTable.id })
    .from(entriesTable)
    .where(and(eq(entriesTable.dareId, dareId), eq(entriesTable.userId, req.user!.userId)))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "You've already submitted an entry for this dare." });
    return;
  }

  const parsed = submitEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }

  const { videoUrl, videoType } = parsed.data;

  if (videoType === "link") {
    try {
      new URL(videoUrl);
    } catch {
      res.status(400).json({ error: "Please enter a valid video URL." });
      return;
    }
  }

  const [entry] = await db
    .insert(entriesTable)
    .values({ dareId, userId: req.user!.userId, videoUrl, videoType })
    .returning();

  await db
    .update(usersTable)
    .set({ totalEntries: db.$count(entriesTable, eq(entriesTable.userId, req.user!.userId)) as unknown as number })
    .where(eq(usersTable.id, req.user!.userId));

  res.status(201).json({ entry });
});

// POST /api/dares/:dareId/entries/upload — video file upload
router.post(
  "/upload",
  requireAuth,
  upload.single("video"),
  async (req, res) => {
    const dareId = parseInt((req.params as Record<string, string>)["dareId"]);
    if (isNaN(dareId)) {
      res.status(400).json({ error: "Invalid dare ID." });
      return;
    }

    const [dare] = await db
      .select()
      .from(daresTable)
      .where(eq(daresTable.id, dareId))
      .limit(1);

    if (!dare || dare.status !== "active") {
      res.status(403).json({ error: "This dare is not accepting submissions." });
      return;
    }

    const [existing] = await db
      .select({ id: entriesTable.id })
      .from(entriesTable)
      .where(and(eq(entriesTable.dareId, dareId), eq(entriesTable.userId, req.user!.userId)))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "You've already submitted an entry for this dare." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const videoUrl = `/api/uploads/${req.file.filename}`;

    const [entry] = await db
      .insert(entriesTable)
      .values({ dareId, userId: req.user!.userId, videoUrl, videoType: "upload" })
      .returning();

    res.status(201).json({ entry });
  }
);

export default router;

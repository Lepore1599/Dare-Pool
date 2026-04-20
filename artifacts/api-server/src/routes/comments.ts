import { Router } from "express";
import { db } from "@workspace/db";
import {
  commentsTable, usersTable, entriesTable, daresTable, reportsTable,
  createCommentSchema, reportCommentSchema,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import type { Request, Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { touchLastActive } from "./users";
import { moderateComment } from "../lib/commentModeration";

// ─── Shared select fields ──────────────────────────────────────────────────

const commentFields = {
  id: commentsTable.id,
  entryId: commentsTable.entryId,
  dareId: commentsTable.dareId,
  userId: commentsTable.userId,
  username: usersTable.username,
  avatarUrl: usersTable.avatarUrl,
  content: commentsTable.content,
  status: commentsTable.status,
  reportCount: commentsTable.reportCount,
  createdAt: commentsTable.createdAt,
};

// ─── Shared report handler ────────────────────────────────────────────────

async function handleCommentReport(req: Request, res: Response) {
  const commentId = parseInt((req.params as Record<string, string>)["commentId"]);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment ID." }); return; }

  const parsed = reportCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid reason." }); return;
  }

  const [comment] = await db
    .select({ id: commentsTable.id, reportCount: commentsTable.reportCount })
    .from(commentsTable)
    .where(eq(commentsTable.id, commentId))
    .limit(1);
  if (!comment) { res.status(404).json({ error: "Comment not found." }); return; }

  await db.insert(reportsTable).values({
    commentId,
    reportedByUserId: req.user!.userId,
    reason: parsed.data.reason,
  });

  const newCount = comment.reportCount + 1;
  await db.update(commentsTable).set({
    reportCount: newCount,
    ...(newCount >= 3 ? { status: "flagged" } : {}),
  }).where(eq(commentsTable.id, commentId));

  res.json({ ok: true });
}

// ─── Entry comments ───────────────────────────────────────────────────────
// Mounted at /entries/:entryId/comments

const entryCommentsRouter = Router({ mergeParams: true });

entryCommentsRouter.get("/", async (req, res) => {
  const entryId = parseInt((req.params as Record<string, string>)["entryId"]);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid entry ID." }); return; }

  const rows = await db
    .select(commentFields)
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(and(eq(commentsTable.entryId, entryId), eq(commentsTable.status, "active")))
    .orderBy(desc(commentsTable.createdAt));

  res.json({ comments: rows });
});

entryCommentsRouter.post("/", requireAuth, async (req, res) => {
  const entryId = parseInt((req.params as Record<string, string>)["entryId"]);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid entry ID." }); return; }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid comment." }); return;
  }

  const [entry] = await db
    .select({ id: entriesTable.id })
    .from(entriesTable)
    .where(eq(entriesTable.id, entryId))
    .limit(1);
  if (!entry) { res.status(404).json({ error: "Entry not found." }); return; }

  const mod = moderateComment(parsed.data.content);
  if (!mod.ok) { res.status(422).json({ error: mod.message }); return; }

  const [inserted] = await db
    .insert(commentsTable)
    .values({ entryId, userId: req.user!.userId, content: parsed.data.content })
    .returning();

  Promise.all([
    db.update(usersTable).set({ totalComments: sql`${usersTable.totalComments} + 1` }).where(eq(usersTable.id, req.user!.userId)),
    touchLastActive(req.user!.userId),
  ]).catch(() => {});

  const [withUser] = await db
    .select(commentFields)
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(eq(commentsTable.id, inserted!.id))
    .limit(1);

  res.status(201).json({ comment: withUser });
});

entryCommentsRouter.post("/:commentId/report", requireAuth, async (req, res) => {
  await handleCommentReport(req, res);
});

// ─── Dare comments ────────────────────────────────────────────────────────
// Mounted at /dares/:dareId/comments

const dareCommentsRouter = Router({ mergeParams: true });

dareCommentsRouter.get("/", async (req, res) => {
  const dareId = parseInt((req.params as Record<string, string>)["dareId"]);
  if (isNaN(dareId)) { res.status(400).json({ error: "Invalid dare ID." }); return; }

  const rows = await db
    .select(commentFields)
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(and(eq(commentsTable.dareId, dareId), eq(commentsTable.status, "active")))
    .orderBy(desc(commentsTable.createdAt));

  res.json({ comments: rows });
});

dareCommentsRouter.post("/", requireAuth, async (req, res) => {
  const dareId = parseInt((req.params as Record<string, string>)["dareId"]);
  if (isNaN(dareId)) { res.status(400).json({ error: "Invalid dare ID." }); return; }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid comment." }); return;
  }

  const [dare] = await db
    .select({ id: daresTable.id })
    .from(daresTable)
    .where(eq(daresTable.id, dareId))
    .limit(1);
  if (!dare) { res.status(404).json({ error: "Dare not found." }); return; }

  const mod = moderateComment(parsed.data.content);
  if (!mod.ok) { res.status(422).json({ error: mod.message }); return; }

  const [inserted] = await db
    .insert(commentsTable)
    .values({ dareId, userId: req.user!.userId, content: parsed.data.content })
    .returning();

  Promise.all([
    db.update(usersTable).set({ totalComments: sql`${usersTable.totalComments} + 1` }).where(eq(usersTable.id, req.user!.userId)),
    touchLastActive(req.user!.userId),
  ]).catch(() => {});

  const [withUser] = await db
    .select(commentFields)
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(eq(commentsTable.id, inserted!.id))
    .limit(1);

  res.status(201).json({ comment: withUser });
});

dareCommentsRouter.post("/:commentId/report", requireAuth, async (req, res) => {
  await handleCommentReport(req, res);
});

// ─── Admin helpers (called from admin router) ─────────────────────────────

export async function adminRemoveComment(commentId: number) {
  await db.update(commentsTable).set({ status: "removed" }).where(eq(commentsTable.id, commentId));
}

export async function getReportedComments() {
  return db
    .select(commentFields)
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(and(eq(commentsTable.status, "flagged"), sql`${commentsTable.reportCount} > 0`))
    .orderBy(desc(commentsTable.reportCount));
}

export { entryCommentsRouter, dareCommentsRouter };
export default entryCommentsRouter;

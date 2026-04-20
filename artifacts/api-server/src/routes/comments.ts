import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, usersTable, entriesTable, createCommentSchema } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { touchLastActive } from "./users";

const router = Router({ mergeParams: true });

// GET /api/entries/:entryId/comments
router.get("/", async (req, res) => {
  const entryId = parseInt((req.params as Record<string, string>)["entryId"]);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid entry ID." }); return; }

  const rows = await db
    .select({
      id: commentsTable.id,
      entryId: commentsTable.entryId,
      userId: commentsTable.userId,
      username: usersTable.username,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
    })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(eq(commentsTable.entryId, entryId))
    .orderBy(desc(commentsTable.createdAt));

  res.json({ comments: rows });
});

// POST /api/entries/:entryId/comments
router.post("/", requireAuth, async (req, res) => {
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

  const [inserted] = await db
    .insert(commentsTable)
    .values({ entryId, userId: req.user!.userId, content: parsed.data.content })
    .returning();

  // Increment comment counter and update last active (non-blocking)
  Promise.all([
    db.update(usersTable)
      .set({ totalComments: sql`${usersTable.totalComments} + 1` })
      .where(eq(usersTable.id, req.user!.userId)),
    touchLastActive(req.user!.userId),
  ]).catch(() => {});

  const [withUser] = await db
    .select({
      id: commentsTable.id,
      entryId: commentsTable.entryId,
      userId: commentsTable.userId,
      username: usersTable.username,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
    })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(eq(commentsTable.id, inserted!.id))
    .limit(1);

  res.status(201).json({ comment: withUser });
});

export default router;

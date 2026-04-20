import { Router } from "express";
import { db } from "@workspace/db";
import { daresTable, usersTable, entriesTable, createDareSchema } from "@workspace/db";
import { eq, desc, asc, and, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { moderate } from "../lib/moderation";
import { closeExpiredDares } from "../lib/expiration";

const router = Router();

// GET /api/dares  — list dares
router.get("/", async (req, res) => {
  await closeExpiredDares();

  const { filter, status } = req.query as Record<string, string>;

  let query = db
    .select({
      id: daresTable.id,
      title: daresTable.title,
      description: daresTable.description,
      prizePool: daresTable.prizePool,
      createdByUserId: daresTable.createdByUserId,
      createdByUsername: usersTable.username,
      createdAt: daresTable.createdAt,
      expiresAt: daresTable.expiresAt,
      status: daresTable.status,
      winnerEntryId: daresTable.winnerEntryId,
      isFeatured: daresTable.isFeatured,
      reportCount: daresTable.reportCount,
    })
    .from(daresTable)
    .leftJoin(usersTable, eq(daresTable.createdByUserId, usersTable.id))
    .$dynamic();

  if (status && ["active", "expired", "removed"].includes(status)) {
    query = query.where(eq(daresTable.status, status)) as typeof query;
  } else {
    query = query.where(ne(daresTable.status, "removed")) as typeof query;
  }

  // Sorting
  if (filter === "prize") {
    query = query.orderBy(desc(daresTable.prizePool)) as typeof query;
  } else if (filter === "ending") {
    query = query.orderBy(asc(daresTable.expiresAt)) as typeof query;
  } else {
    query = query.orderBy(desc(daresTable.createdAt)) as typeof query;
  }

  const dares = await query;

  // Attach entry counts
  const allEntries = await db
    .select({ dareId: entriesTable.dareId, id: entriesTable.id })
    .from(entriesTable)
    .where(ne(entriesTable.status, "removed"));

  const entryCountMap: Record<number, number> = {};
  for (const e of allEntries) {
    entryCountMap[e.dareId] = (entryCountMap[e.dareId] ?? 0) + 1;
  }

  const result = dares.map((d) => ({
    ...d,
    entryCount: entryCountMap[d.id] ?? 0,
  }));

  if (filter === "submissions") {
    result.sort((a, b) => b.entryCount - a.entryCount);
  }

  res.json({ dares: result });
});

// GET /api/dares/:id
router.get("/:id", async (req, res) => {
  await closeExpiredDares();

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid dare ID." });
    return;
  }

  const [dare] = await db
    .select({
      id: daresTable.id,
      title: daresTable.title,
      description: daresTable.description,
      prizePool: daresTable.prizePool,
      createdByUserId: daresTable.createdByUserId,
      createdByUsername: usersTable.username,
      createdAt: daresTable.createdAt,
      expiresAt: daresTable.expiresAt,
      status: daresTable.status,
      winnerEntryId: daresTable.winnerEntryId,
      isFeatured: daresTable.isFeatured,
      reportCount: daresTable.reportCount,
    })
    .from(daresTable)
    .leftJoin(usersTable, eq(daresTable.createdByUserId, usersTable.id))
    .where(eq(daresTable.id, id))
    .limit(1);

  if (!dare) {
    res.status(404).json({ error: "Dare not found." });
    return;
  }

  res.json({ dare });
});

// POST /api/dares
router.post("/", requireAuth, async (req, res) => {
  const parsed = createDareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }

  const { title, description, prizePool } = parsed.data;

  const result = moderate(title, description);
  if (result.outcome === "hard") {
    res.status(422).json({ error: result.message, outcome: "hard" });
    return;
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const [dare] = await db
    .insert(daresTable)
    .values({
      title: title.trim(),
      description: description.trim(),
      prizePool,
      createdByUserId: req.user!.userId,
      expiresAt,
    })
    .returning();

  res.status(201).json({ dare });
});

export default router;

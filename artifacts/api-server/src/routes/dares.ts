import { Router } from "express";
import { db } from "@workspace/db";
import {
  daresTable,
  usersTable,
  entriesTable,
  createDareSchema,
  walletsTable,
  walletTransactionsTable,
  poolContributionsTable,
} from "@workspace/db";
import { eq, desc, asc, and, ne, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { moderate } from "../lib/moderation";
import { closeExpiredDares } from "../lib/expiration";

const router = Router();

const DARE_SELECT = {
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
  transferredToDareId: daresTable.transferredToDareId,
  transferReason: daresTable.transferReason,
  isFeatured: daresTable.isFeatured,
  reportCount: daresTable.reportCount,
};

// GET /api/dares  — list dares
router.get("/", async (req, res) => {
  await closeExpiredDares();

  const { filter, status } = req.query as Record<string, string>;

  let query = db
    .select(DARE_SELECT)
    .from(daresTable)
    .leftJoin(usersTable, eq(daresTable.createdByUserId, usersTable.id))
    .$dynamic();

  const validStatuses = ["active", "completed", "expired", "expired_no_submissions", "transferred", "removed"];
  if (status && validStatuses.includes(status)) {
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
    .select(DARE_SELECT)
    .from(daresTable)
    .leftJoin(usersTable, eq(daresTable.createdByUserId, usersTable.id))
    .where(eq(daresTable.id, id))
    .limit(1);

  if (!dare) {
    res.status(404).json({ error: "Dare not found." });
    return;
  }

  // Attach funder count
  const [funderRow] = await db
    .select({ count: sql<number>`count(distinct user_id)` })
    .from(poolContributionsTable)
    .where(eq(poolContributionsTable.dareId, id));

  // If transferred, grab the destination dare title
  let transferredToDareTitle: string | null = null;
  if (dare.transferredToDareId) {
    const [target] = await db
      .select({ title: daresTable.title })
      .from(daresTable)
      .where(eq(daresTable.id, dare.transferredToDareId));
    transferredToDareTitle = target?.title ?? null;
  }

  res.json({
    dare: {
      ...dare,
      funderCount: Number(funderRow?.count ?? 0),
      transferredToDareTitle,
    },
  });
});

// POST /api/dares — create and fund initial pool from creator's wallet
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

  const userId = req.user!.userId;
  const amountCents = prizePool * 100;

  // Check wallet balance
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));

  if (!wallet || wallet.availableBalance < amountCents) {
    res.status(400).json({
      error: `You need at least $${prizePool} in your wallet to fund this dare. Current balance: $${Math.floor((wallet?.availableBalance ?? 0) / 100)}.`,
    });
    return;
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const dare = await db.transaction(async (tx) => {
    // Create the dare
    const [newDare] = await tx
      .insert(daresTable)
      .values({
        title: title.trim(),
        description: description.trim(),
        prizePool,
        createdByUserId: userId,
        expiresAt,
      })
      .returning();

    if (!newDare) throw new Error("Failed to create dare");

    // Deduct from creator's wallet
    await tx
      .update(walletsTable)
      .set({
        availableBalance: sql`available_balance - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, userId));

    // Record wallet transaction
    const [txn] = await tx
      .insert(walletTransactionsTable)
      .values({
        userId,
        type: "dare_fund",
        status: "completed",
        amount: amountCents,
        relatedDareId: newDare.id,
        description: `Created dare: ${newDare.title}`,
      })
      .returning();

    // Record pool contribution
    await tx.insert(poolContributionsTable).values({
      dareId: newDare.id,
      userId,
      amount: prizePool,
      walletTransactionId: txn!.id,
    });

    return newDare;
  });

  res.status(201).json({ dare });
});

export default router;

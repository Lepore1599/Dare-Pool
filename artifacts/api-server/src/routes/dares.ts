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
  votesTable,
  commentsTable,
  boostsTable,
} from "@workspace/db";
import { eq, desc, asc, and, ne, sql, gt, isNotNull } from "drizzle-orm";
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

// ─── helpers ─────────────────────────────────────────────────────────────────

async function attachScoringData(dares: typeof DARE_SELECT[]) {
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run all supplemental queries in parallel
  const [allEntries, voteCounts, dareCounts, recentFunding, activeBoosts] =
    await Promise.all([
      // entry counts
      db
        .select({ dareId: entriesTable.dareId, id: entriesTable.id })
        .from(entriesTable)
        .where(ne(entriesTable.status, "removed")),

      // vote counts per dare
      db
        .select({
          dareId: votesTable.dareId,
          count: sql<number>`count(*)::int`,
        })
        .from(votesTable)
        .groupBy(votesTable.dareId),

      // dare-level comment counts (dareId IS NOT NULL, entryId IS NULL)
      db
        .select({
          dareId: commentsTable.dareId,
          count: sql<number>`count(*)::int`,
        })
        .from(commentsTable)
        .where(
          and(
            isNotNull(commentsTable.dareId),
            ne(commentsTable.status, "removed")
          )
        )
        .groupBy(commentsTable.dareId),

      // recent funding: pool_contributions added in the last 24h
      db
        .select({
          dareId: poolContributionsTable.dareId,
          recentDollars: sql<number>`sum(amount)::int`,
          recentFunders: sql<number>`count(distinct user_id)::int`,
        })
        .from(poolContributionsTable)
        .where(gt(poolContributionsTable.createdAt, cutoff24h))
        .groupBy(poolContributionsTable.dareId),

      // active boosts per dare (highest tier wins if multiple)
      db
        .select({
          dareId: boostsTable.dareId,
          boostTier: boostsTable.boostTier,
          endsAt: boostsTable.endsAt,
          purchasedByUsername: usersTable.username,
          purchasedByUserId: boostsTable.purchasedByUserId,
        })
        .from(boostsTable)
        .leftJoin(usersTable, eq(boostsTable.purchasedByUserId, usersTable.id))
        .where(and(eq(boostsTable.status, "active"), gt(boostsTable.endsAt, now)))
        .orderBy(desc(boostsTable.endsAt)),
    ]);

  // Build lookup maps
  const entryCountMap: Record<number, number> = {};
  for (const e of allEntries) {
    entryCountMap[e.dareId] = (entryCountMap[e.dareId] ?? 0) + 1;
  }

  const voteCountMap: Record<number, number> = {};
  for (const v of voteCounts) {
    voteCountMap[v.dareId] = v.count;
  }

  const commentCountMap: Record<number, number> = {};
  for (const c of dareCounts) {
    if (c.dareId != null) commentCountMap[c.dareId] = c.count;
  }

  const recentFundingMap: Record<number, { dollars: number; funders: number }> = {};
  for (const r of recentFunding) {
    recentFundingMap[r.dareId] = { dollars: r.recentDollars, funders: r.recentFunders };
  }

  // For boosts: keep only the first (most recent expiry) per dare
  const boostMap: Record<number, {
    boostTier: string;
    endsAt: Date;
    boostedByUsername: string | null;
    boostedByUserId: number;
  }> = {};
  for (const b of activeBoosts) {
    if (!(b.dareId in boostMap)) {
      boostMap[b.dareId] = {
        boostTier: b.boostTier,
        endsAt: b.endsAt,
        boostedByUsername: b.purchasedByUsername,
        boostedByUserId: b.purchasedByUserId,
      };
    }
  }

  return (dares as Array<Record<string, unknown>>).map((d) => {
    const id = d.id as number;
    const rf = recentFundingMap[id] ?? { dollars: 0, funders: 0 };
    const entryCount = entryCountMap[id] ?? 0;
    const voteCount = voteCountMap[id] ?? 0;
    const commentCount = commentCountMap[id] ?? 0;
    const boostInfo = boostMap[id] ?? null;

    return {
      ...d,
      entryCount,
      voteCount,
      commentCount,
      recentFundingDollars: rf.dollars,
      recentFunderCount: rf.funders,
      boostInfo,
    };
  });
}

// ─── GET /api/dares ──────────────────────────────────────────────────────────

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

  if (filter === "prize") {
    query = query.orderBy(desc(daresTable.prizePool)) as typeof query;
  } else if (filter === "ending") {
    query = query.orderBy(asc(daresTable.expiresAt)) as typeof query;
  } else {
    query = query.orderBy(desc(daresTable.createdAt)) as typeof query;
  }

  const dares = await query;
  const result = await attachScoringData(dares);

  if (filter === "submissions") {
    result.sort((a, b) => (b.entryCount as number) - (a.entryCount as number));
  }

  res.json({ dares: result });
});

// ─── GET /api/dares/:id ──────────────────────────────────────────────────────

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

// ─── POST /api/dares ─────────────────────────────────────────────────────────

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

    await tx
      .update(walletsTable)
      .set({
        availableBalance: sql`available_balance - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, userId));

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

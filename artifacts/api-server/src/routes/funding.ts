import { Router } from "express";
import { db } from "@workspace/db";
import {
  daresTable,
  walletsTable,
  walletTransactionsTable,
  poolContributionsTable,
} from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router({ mergeParams: true });

// GET /api/dares/:dareId/fund  — funder stats
router.get("/", async (req, res) => {
  const dareId = parseInt(req.params.dareId);
  if (isNaN(dareId)) { res.status(400).json({ error: "Invalid dare ID." }); return; }

  const [funderCount] = await db
    .select({ count: sql<number>`count(distinct user_id)` })
    .from(poolContributionsTable)
    .where(eq(poolContributionsTable.dareId, dareId));

  res.json({ funderCount: Number(funderCount?.count ?? 0) });
});

// POST /api/dares/:dareId/fund  — fund a dare from wallet
router.post("/", requireAuth, async (req, res) => {
  const dareId = parseInt(req.params.dareId);
  if (isNaN(dareId)) { res.status(400).json({ error: "Invalid dare ID." }); return; }

  const amount = Number(req.body.amount); // dollars
  if (!Number.isInteger(amount) || amount < 1) {
    res.status(400).json({ error: "Amount must be a whole dollar amount of at least $1." }); return;
  }

  const userId = req.user!.userId;

  // Verify dare is still active
  const [dare] = await db
    .select()
    .from(daresTable)
    .where(eq(daresTable.id, dareId));

  if (!dare) { res.status(404).json({ error: "Dare not found." }); return; }
  if (dare.status !== "active") {
    res.status(400).json({ error: "This dare is no longer accepting funds." }); return;
  }
  if (new Date() >= dare.expiresAt) {
    res.status(400).json({ error: "This dare has expired." }); return;
  }

  const amountCents = amount * 100;

  // Check wallet balance
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));

  if (!wallet || wallet.availableBalance < amountCents) {
    res.status(400).json({ error: "Insufficient wallet balance." }); return;
  }

  // Deduct from wallet, add to prize pool — atomically
  await db.transaction(async (tx) => {
    await tx
      .update(walletsTable)
      .set({
        availableBalance: sql`available_balance - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(walletsTable.userId, userId), sql`available_balance >= ${amountCents}`));

    // Re-check balance was actually deducted
    const [updated] = await tx
      .select({ availableBalance: walletsTable.availableBalance })
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId));

    if (!updated || updated.availableBalance < 0) {
      throw new Error("Insufficient balance");
    }

    await tx
      .update(daresTable)
      .set({ prizePool: sql`prize_pool + ${amount}` })
      .where(eq(daresTable.id, dareId));

    const [txn] = await tx
      .insert(walletTransactionsTable)
      .values({
        userId,
        type: "dare_fund",
        status: "completed",
        amount: amountCents,
        relatedDareId: dareId,
        description: `Funded dare: ${dare.title}`,
      })
      .returning();

    await tx.insert(poolContributionsTable).values({
      dareId,
      userId,
      amount,
      walletTransactionId: txn!.id,
    });
  });

  const [updatedDare] = await db
    .select({ prizePool: daresTable.prizePool })
    .from(daresTable)
    .where(eq(daresTable.id, dareId));

  res.json({ success: true, newPrizePool: updatedDare?.prizePool ?? 0 });
});

export default router;

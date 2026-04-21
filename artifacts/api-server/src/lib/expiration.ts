import { db } from "@workspace/db";
import {
  daresTable,
  entriesTable,
  walletsTable,
  walletTransactionsTable,
  poolContributionsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, lt, asc, desc, ne, gte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

// Platform user ID — 0 signals a platform-level ledger entry (no real wallet row needed)
const PLATFORM_USER_ID = 1; // Admin account holds platform fees for now

const MIN_REMAINING_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Finds all expired active dares and processes them exactly once.
 * Safe to call multiple times — skips dares already closed.
 *
 * For each expired dare:
 *  - If valid submissions exist  → 80/10/10 payout split, mark completed
 *  - If no valid submissions     → transfer pool to best eligible dare, notify funders
 */
export async function closeExpiredDares(): Promise<void> {
  const now = new Date();

  const expired = await db
    .select()
    .from(daresTable)
    .where(and(eq(daresTable.status, "active"), lt(daresTable.expiresAt, now)));

  for (const dare of expired) {
    try {
      await processDare(dare, now);
    } catch (err) {
      logger.error({ err, dareId: dare.id }, "Error processing expired dare");
    }
  }
}

async function processDare(
  dare: typeof daresTable.$inferSelect,
  now: Date,
): Promise<void> {
  // Re-fetch inside the transaction guard to prevent double-processing
  const [fresh] = await db
    .select({ status: daresTable.status })
    .from(daresTable)
    .where(eq(daresTable.id, dare.id));

  if (!fresh || fresh.status !== "active") return; // already processed

  // Find valid submissions: active status and not removed/flagged
  const validEntries = await db
    .select()
    .from(entriesTable)
    .where(
      and(
        eq(entriesTable.dareId, dare.id),
        eq(entriesTable.status, "active"),
      ),
    )
    .orderBy(asc(entriesTable.createdAt));

  if (validEntries.length > 0) {
    await handleSuccessfulDare(dare, validEntries);
  } else {
    await handleFailedDare(dare, now);
  }
}

async function getOrCreateWallet(userId: number) {
  const [existing] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));
  if (existing) return existing;

  const [created] = await db
    .insert(walletsTable)
    .values({ userId })
    .returning();
  return created!;
}

async function creditWallet(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: number,
  amountCents: number,
  type: string,
  description: string,
  relatedDareId: number,
  relatedEntryId?: number,
) {
  // Ensure wallet exists
  const [wallet] = await tx
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));

  if (!wallet) {
    await tx.insert(walletsTable).values({ userId });
  }

  // Credit withdrawable balance (prize winnings are immediately withdrawable)
  await tx
    .update(walletsTable)
    .set({
      withdrawableBalance: sql`withdrawable_balance + ${amountCents}`,
      lifetimeWon: sql`lifetime_won + ${amountCents}`,
      updatedAt: new Date(),
    })
    .where(eq(walletsTable.userId, userId));

  // Record transaction
  const [txn] = await tx
    .insert(walletTransactionsTable)
    .values({
      userId,
      type,
      status: "completed",
      amount: amountCents,
      relatedDareId,
      relatedEntryId: relatedEntryId ?? null,
      description,
    })
    .returning();

  return txn;
}

async function handleSuccessfulDare(
  dare: typeof daresTable.$inferSelect,
  validEntries: (typeof entriesTable.$inferSelect)[],
) {
  // Pick winner: highest voteCount, tie → earliest createdAt (already ordered)
  let winner = validEntries[0]!;
  for (const entry of validEntries) {
    if (entry.voteCount > winner.voteCount) winner = entry;
  }

  const totalCents = dare.prizePool * 100; // prizePool is dollars
  const winnerCents = Math.floor(totalCents * 0.8);
  const creatorCents = Math.floor(totalCents * 0.1);
  const platformCents = totalCents - winnerCents - creatorCents;

  await db.transaction(async (tx) => {
    // Mark dare as completed
    await tx
      .update(daresTable)
      .set({ status: "completed", winnerEntryId: winner.id })
      .where(eq(daresTable.id, dare.id));

    // Mark winning entry
    await tx
      .update(entriesTable)
      .set({ status: "winner" })
      .where(eq(entriesTable.id, winner.id));

    // Credit winner (80%)
    if (winnerCents > 0) {
      await creditWallet(
        tx,
        winner.userId,
        winnerCents,
        "dare_win_credit",
        `Won dare: ${dare.title}`,
        dare.id,
        winner.id,
      );
    }

    // Credit dare creator (10%) — only if they aren't the winner
    if (creatorCents > 0 && dare.createdByUserId !== winner.userId) {
      await creditWallet(
        tx,
        dare.createdByUserId,
        creatorCents,
        "dare_creator_credit",
        `Creator cut: ${dare.title}`,
        dare.id,
      );
    } else if (creatorCents > 0 && dare.createdByUserId === winner.userId) {
      // Winner is also the creator — give them the creator cut too
      await tx
        .update(walletsTable)
        .set({
          withdrawableBalance: sql`withdrawable_balance + ${creatorCents}`,
          lifetimeWon: sql`lifetime_won + ${creatorCents}`,
          updatedAt: new Date(),
        })
        .where(eq(walletsTable.userId, winner.userId));
      await tx.insert(walletTransactionsTable).values({
        userId: winner.userId,
        type: "dare_creator_credit",
        status: "completed",
        amount: creatorCents,
        relatedDareId: dare.id,
        description: `Creator cut (also winner): ${dare.title}`,
      });
    }

    // Record platform fee
    if (platformCents > 0) {
      await tx.insert(walletTransactionsTable).values({
        userId: PLATFORM_USER_ID,
        type: "platform_fee",
        status: "completed",
        amount: platformCents,
        relatedDareId: dare.id,
        description: `Platform fee: ${dare.title}`,
      });
    }

    // Notify winner
    await tx.insert(notificationsTable).values({
      userId: winner.userId,
      type: "dare_won",
      title: "You won a dare!",
      message: `Congratulations! Your submission won "${dare.title}" — $${Math.floor(winnerCents / 100)} has been added to your wallet.`,
      relatedDareId: dare.id,
    });

    // Notify creator if not winner
    if (dare.createdByUserId !== winner.userId) {
      await tx.insert(notificationsTable).values({
        userId: dare.createdByUserId,
        type: "dare_completed",
        title: "Your dare was completed!",
        message: `"${dare.title}" has a winner — you received $${Math.floor(creatorCents / 100)} as the creator.`,
        relatedDareId: dare.id,
      });
    }
  });

  logger.info(
    { dareId: dare.id, winnerId: winner.id, winnerCents, creatorCents, platformCents },
    "Dare completed with payout",
  );
}

async function handleFailedDare(
  dare: typeof daresTable.$inferSelect,
  now: Date,
) {
  if (dare.prizePool <= 0) {
    // Nothing to transfer
    await db
      .update(daresTable)
      .set({ status: "expired_no_submissions" })
      .where(eq(daresTable.id, dare.id));
    return;
  }

  // Find eligible target dare: active, not same dare, >=6h remaining, highest prizePool
  const minExpiry = new Date(now.getTime() + MIN_REMAINING_MS);

  const eligibleDares = await db
    .select()
    .from(daresTable)
    .where(
      and(
        eq(daresTable.status, "active"),
        ne(daresTable.id, dare.id),
        gte(daresTable.expiresAt, minExpiry),
      ),
    )
    .orderBy(desc(daresTable.prizePool))
    .limit(1);

  const funders = await db
    .select()
    .from(poolContributionsTable)
    .where(eq(poolContributionsTable.dareId, dare.id));

  const uniqueFunderIds = [...new Set(funders.map((f) => f.userId))];

  if (eligibleDares.length > 0) {
    const target = eligibleDares[0]!;

    await db.transaction(async (tx) => {
      // Transfer pool to target dare
      await tx
        .update(daresTable)
        .set({
          status: "transferred",
          transferredToDareId: target.id,
          transferReason: "No valid submissions — pool transferred to active dare",
        })
        .where(eq(daresTable.id, dare.id));

      await tx
        .update(daresTable)
        .set({ prizePool: sql`prize_pool + ${dare.prizePool}` })
        .where(eq(daresTable.id, target.id));

      // Record platform-level transfer transactions
      await tx.insert(walletTransactionsTable).values({
        userId: PLATFORM_USER_ID,
        type: "dare_pool_transfer_out",
        status: "completed",
        amount: dare.prizePool * 100,
        relatedDareId: dare.id,
        description: `Pool transferred out: ${dare.title} → ${target.title}`,
      });
      await tx.insert(walletTransactionsTable).values({
        userId: PLATFORM_USER_ID,
        type: "dare_pool_transfer_in",
        status: "completed",
        amount: dare.prizePool * 100,
        relatedDareId: target.id,
        description: `Pool transferred in from: ${dare.title}`,
      });

      // Notify all funders
      for (const funderId of uniqueFunderIds) {
        await tx.insert(notificationsTable).values({
          userId: funderId,
          type: "dare_transferred",
          title: "Your dare expired — pool moved",
          message: `"${dare.title}" ended with no valid submissions. The $${dare.prizePool} prize pool was transferred to "${target.title}".`,
          relatedDareId: dare.id,
          relatedTargetDareId: target.id,
        });
      }
    });

    logger.info(
      { dareId: dare.id, targetDareId: target.id, prizePool: dare.prizePool },
      "Dare pool transferred to eligible dare",
    );
  } else {
    // No eligible target — mark for admin review, keep funds logged
    await db.transaction(async (tx) => {
      await tx
        .update(daresTable)
        .set({
          status: "expired_no_submissions",
          transferReason: "No eligible active dare to receive pool — pending admin review",
        })
        .where(eq(daresTable.id, dare.id));

      // Record the stranded pool
      await tx.insert(walletTransactionsTable).values({
        userId: PLATFORM_USER_ID,
        type: "dare_pool_transfer_out",
        status: "pending",
        amount: dare.prizePool * 100,
        relatedDareId: dare.id,
        description: `Pool stranded — no eligible transfer target: ${dare.title}`,
      });

      // Notify funders
      for (const funderId of uniqueFunderIds) {
        await tx.insert(notificationsTable).values({
          userId: funderId,
          type: "dare_transferred",
          title: "Your dare expired — no valid submissions",
          message: `"${dare.title}" ended with no valid submissions and no active dare was available to receive the pool. Funds are held pending review.`,
          relatedDareId: dare.id,
        });
      }
    });

    logger.warn(
      { dareId: dare.id, prizePool: dare.prizePool },
      "Dare expired with no submissions and no transfer target",
    );
  }
}

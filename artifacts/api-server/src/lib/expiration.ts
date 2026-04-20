import { db } from "@workspace/db";
import { daresTable, entriesTable } from "@workspace/db";
import { eq, and, lt, asc } from "drizzle-orm";

/**
 * Finds all expired active dares and closes them:
 *  1. Sets status → "expired"
 *  2. Determines winner by highest voteCount, tie-broken by earliest createdAt
 *  3. Sets winnerEntryId on the dare and status → "winner" on the winning entry
 *
 * Safe to call multiple times — skips dares that are already closed.
 */
export async function closeExpiredDares(): Promise<void> {
  const now = new Date();

  const expired = await db
    .select()
    .from(daresTable)
    .where(and(eq(daresTable.status, "active"), lt(daresTable.expiresAt, now)));

  for (const dare of expired) {
    const entries = await db
      .select()
      .from(entriesTable)
      .where(and(eq(entriesTable.dareId, dare.id), eq(entriesTable.status, "active")))
      .orderBy(asc(entriesTable.createdAt));

    if (entries.length === 0) {
      await db
        .update(daresTable)
        .set({ status: "expired" })
        .where(eq(daresTable.id, dare.id));
      continue;
    }

    // Pick winner: highest voteCount, tie → earliest createdAt (already ordered)
    let winner = entries[0];
    for (const entry of entries) {
      if (entry.voteCount > winner.voteCount) winner = entry;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(daresTable)
        .set({ status: "expired", winnerEntryId: winner.id })
        .where(eq(daresTable.id, dare.id));

      await tx
        .update(entriesTable)
        .set({ status: "winner" })
        .where(eq(entriesTable.id, winner.id));
    });
  }
}

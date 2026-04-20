import { Router } from "express";
import { db } from "@workspace/db";
import { votesTable, entriesTable, daresTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router({ mergeParams: true });

// POST /api/dares/:dareId/vote
router.post("/", requireAuth, async (req, res) => {
  const dareId = parseInt((req.params as Record<string, string>)["dareId"]);
  const { entryId } = req.body as { entryId: number };

  if (isNaN(dareId) || !entryId) {
    res.status(400).json({ error: "Invalid dare or entry ID." });
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
    res.status(403).json({ error: "Voting is closed — this dare has expired." });
    return;
  }

  // Verify entry belongs to this dare
  const [entry] = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.id, entryId), eq(entriesTable.dareId, dareId)))
    .limit(1);

  if (!entry) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }

  // No voting on your own entry
  if (entry.userId === req.user!.userId) {
    res.status(403).json({ error: "You can't vote on your own entry." });
    return;
  }

  // One vote per dare
  const [existingVote] = await db
    .select({ id: votesTable.id })
    .from(votesTable)
    .where(and(eq(votesTable.dareId, dareId), eq(votesTable.userId, req.user!.userId)))
    .limit(1);

  if (existingVote) {
    res.status(409).json({ error: "You've already voted on this dare." });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.insert(votesTable).values({
      dareId,
      entryId,
      userId: req.user!.userId,
    });

    await tx
      .update(entriesTable)
      .set({ voteCount: entry.voteCount + 1 })
      .where(eq(entriesTable.id, entryId));

    await tx
      .update(usersTable)
      .set({ totalVotesCast: db.$count(votesTable, eq(votesTable.userId, req.user!.userId)) as unknown as number })
      .where(eq(usersTable.id, req.user!.userId));
  });

  res.json({ ok: true, entryId });
});

export default router;

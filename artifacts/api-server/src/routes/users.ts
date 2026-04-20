import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, daresTable, entriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID." });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      isAdmin: usersTable.isAdmin,
      isBanned: usersTable.isBanned,
      wins: usersTable.wins,
      totalEntries: usersTable.totalEntries,
      totalVotesCast: usersTable.totalVotesCast,
      strikeCount: usersTable.strikeCount,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  // Get their dares
  const dares = await db
    .select({ id: daresTable.id, title: daresTable.title, status: daresTable.status, prizePool: daresTable.prizePool, createdAt: daresTable.createdAt })
    .from(daresTable)
    .where(eq(daresTable.createdByUserId, id));

  // Get their entries
  const entries = await db
    .select({ id: entriesTable.id, dareId: entriesTable.dareId, voteCount: entriesTable.voteCount, status: entriesTable.status, createdAt: entriesTable.createdAt })
    .from(entriesTable)
    .where(eq(entriesTable.userId, id));

  // Recount wins from entries with status=winner
  const wins = entries.filter((e) => e.status === "winner").length;

  res.json({ user: { ...user, wins }, dares, entries });
});

export default router;

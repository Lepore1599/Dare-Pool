import { Router } from "express";
import { db } from "@workspace/db";
import { entriesTable, usersTable, daresTable } from "@workspace/db";
import { eq, desc, ne, and } from "drizzle-orm";

const router = Router();

// GET /api/reels — all video entries across all dares, sorted newest first
// Each reel includes full dare info so the frontend can link back
router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select({
      id: entriesTable.id,
      dareId: entriesTable.dareId,
      userId: entriesTable.userId,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      videoUrl: entriesTable.videoUrl,
      videoType: entriesTable.videoType,
      status: entriesTable.status,
      voteCount: entriesTable.voteCount,
      createdAt: entriesTable.createdAt,
      dareTitle: daresTable.title,
      dareStatus: daresTable.status,
      darePrize: daresTable.prizePool,
    })
    .from(entriesTable)
    .leftJoin(usersTable, eq(entriesTable.userId, usersTable.id))
    .leftJoin(daresTable, eq(entriesTable.dareId, daresTable.id))
    .where(
      and(
        eq(entriesTable.videoType, "upload"),
        ne(entriesTable.status, "removed"),
      )
    )
    .orderBy(desc(entriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ reels: rows, limit, offset });
});

export default router;

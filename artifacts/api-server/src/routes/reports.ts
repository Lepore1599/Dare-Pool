import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, daresTable, entriesTable, submitReportSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// POST /api/reports
router.post("/", requireAuth, async (req, res) => {
  const parsed = submitReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }

  const { dareId, entryId, reason, details } = parsed.data;

  if (!dareId && !entryId) {
    res.status(400).json({ error: "Must provide dareId or entryId." });
    return;
  }

  // Prevent duplicate reports from same user
  const [existing] = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(
      and(
        eq(reportsTable.reportedByUserId, req.user!.userId),
        dareId ? eq(reportsTable.dareId, dareId) : eq(reportsTable.entryId, entryId!)
      )
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "You've already reported this content." });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      dareId: dareId ?? null,
      entryId: entryId ?? null,
      reportedByUserId: req.user!.userId,
      reason,
      details: details ?? null,
    })
    .returning();

  // Increment report count on dare
  if (dareId) {
    const [dare] = await db
      .select({ reportCount: daresTable.reportCount })
      .from(daresTable)
      .where(eq(daresTable.id, dareId))
      .limit(1);
    if (dare) {
      await db
        .update(daresTable)
        .set({ reportCount: dare.reportCount + 1 })
        .where(eq(daresTable.id, dareId));
    }
  }

  res.status(201).json({ report });
});

export default router;

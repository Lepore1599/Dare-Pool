import { Router } from "express";
import { db } from "@workspace/db";
import {
  daresTable, entriesTable, usersTable, reportsTable, adminActionsTable,
} from "@workspace/db";
import { eq, desc, ne, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { adminRemoveComment, getReportedComments } from "./comments";

const router = Router();
router.use(requireAuth, requireAdmin);

async function logAction(
  adminUserId: number,
  actionType: string,
  targetType: string,
  targetId: number,
  notes?: string
) {
  await db.insert(adminActionsTable).values({ adminUserId, actionType, targetType, targetId, notes });
}

// GET /api/admin/overview
router.get("/overview", async (req, res) => {
  const [dares, reports, users] = await Promise.all([
    db.select({ id: daresTable.id, title: daresTable.title, status: daresTable.status, reportCount: daresTable.reportCount, createdAt: daresTable.createdAt }).from(daresTable).where(ne(daresTable.status, "removed")).orderBy(desc(daresTable.createdAt)),
    db.select({ id: reportsTable.id, dareId: reportsTable.dareId, entryId: reportsTable.entryId, reason: reportsTable.reason, status: reportsTable.status, createdAt: reportsTable.createdAt, reportedByUserId: reportsTable.reportedByUserId }).from(reportsTable).where(eq(reportsTable.status, "open")).orderBy(desc(reportsTable.createdAt)),
    db.select({ id: usersTable.id, username: usersTable.username, isBanned: usersTable.isBanned, strikeCount: usersTable.strikeCount, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt }).from(usersTable).orderBy(desc(usersTable.strikeCount)),
  ]);
  res.json({ dares, reports, users });
});

// POST /api/admin/dares/:id/remove
router.post("/dares/:id/remove", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await db.update(daresTable).set({ status: "removed" }).where(eq(daresTable.id, id));
  await logAction(req.user!.userId, "remove_dare", "dare", id, req.body.notes);
  res.json({ ok: true });
});

// POST /api/admin/dares/:id/feature
router.post("/dares/:id/feature", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  const [dare] = await db.select({ isFeatured: daresTable.isFeatured }).from(daresTable).where(eq(daresTable.id, id)).limit(1);
  if (!dare) { res.status(404).json({ error: "Not found." }); return; }
  await db.update(daresTable).set({ isFeatured: !dare.isFeatured }).where(eq(daresTable.id, id));
  await logAction(req.user!.userId, dare.isFeatured ? "unfeature_dare" : "feature_dare", "dare", id);
  res.json({ ok: true });
});

// POST /api/admin/dares/:id/winner — override winner
router.post("/dares/:id/winner", async (req, res) => {
  const id = parseInt(req.params.id);
  const { entryId } = req.body as { entryId: number };
  if (isNaN(id) || !entryId) { res.status(400).json({ error: "Invalid." }); return; }
  await db.transaction(async (tx) => {
    // Reset old winner
    await tx.update(entriesTable).set({ status: "active" }).where(and(eq(entriesTable.dareId, id), eq(entriesTable.status, "winner")));
    // Set new winner
    await tx.update(daresTable).set({ winnerEntryId: entryId, status: "expired" }).where(eq(daresTable.id, id));
    await tx.update(entriesTable).set({ status: "winner" }).where(eq(entriesTable.id, entryId));
  });
  await logAction(req.user!.userId, "override_winner", "dare", id, `New winner entry: ${entryId}`);
  res.json({ ok: true });
});

// POST /api/admin/entries/:id/remove
router.post("/entries/:id/remove", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await db.update(entriesTable).set({ status: "removed" }).where(eq(entriesTable.id, id));
  await logAction(req.user!.userId, "remove_entry", "entry", id, req.body.notes);
  res.json({ ok: true });
});

// POST /api/admin/users/:id/ban
router.post("/users/:id/ban", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, id));
  await logAction(req.user!.userId, "ban_user", "user", id, req.body.notes);
  res.json({ ok: true });
});

// POST /api/admin/users/:id/unban
router.post("/users/:id/unban", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, id));
  await logAction(req.user!.userId, "unban_user", "user", id);
  res.json({ ok: true });
});

// POST /api/admin/reports/:id/dismiss
router.post("/reports/:id/dismiss", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await db.update(reportsTable).set({ status: "dismissed" }).where(eq(reportsTable.id, id));
  await logAction(req.user!.userId, "dismiss_report", "report", id);
  res.json({ ok: true });
});

// POST /api/admin/reports/:id/action
router.post("/reports/:id/action", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await db.update(reportsTable).set({ status: "actioned" }).where(eq(reportsTable.id, id));
  await logAction(req.user!.userId, "action_report", "report", id, req.body.notes);
  res.json({ ok: true });
});

// GET /api/admin/comments/reported
router.get("/comments/reported", async (_req, res) => {
  const comments = await getReportedComments();
  res.json({ comments });
});

// POST /api/admin/comments/:id/remove
router.post("/comments/:id/remove", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID." }); return; }
  await adminRemoveComment(id);
  await logAction(req.user!.userId, "remove_comment", "comment", id, req.body.notes);
  res.json({ ok: true });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import {
  boostsTable,
  daresTable,
  walletsTable,
  walletTransactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ─── Store definition ────────────────────────────────────────────────────────

export const BOOST_TIERS: Record<string, { label: string; amountCents: number; durationHours: number }> = {
  tier1: { label: "2-Hour Boost", amountCents: 199,  durationHours: 2  },
  tier2: { label: "10-Hour Boost", amountCents: 499, durationHours: 10 },
  tier3: { label: "24-Hour Boost", amountCents: 999, durationHours: 24 },
};

// ─── GET /api/boosts/active  (admin: inspect all active boosts) ──────────────

router.get("/active", async (req, res) => {
  const now = new Date();
  const rows = await db
    .select({
      id: boostsTable.id,
      dareId: boostsTable.dareId,
      dareTitle: daresTable.title,
      purchasedByUserId: boostsTable.purchasedByUserId,
      purchasedByUsername: usersTable.username,
      boostTier: boostsTable.boostTier,
      amountPaid: boostsTable.amountPaid,
      startsAt: boostsTable.startsAt,
      endsAt: boostsTable.endsAt,
      status: boostsTable.status,
      createdAt: boostsTable.createdAt,
    })
    .from(boostsTable)
    .leftJoin(daresTable, eq(boostsTable.dareId, daresTable.id))
    .leftJoin(usersTable, eq(boostsTable.purchasedByUserId, usersTable.id))
    .where(and(eq(boostsTable.status, "active"), gt(boostsTable.endsAt, now)))
    .orderBy(boostsTable.endsAt);

  res.json({ boosts: rows });
});

// ─── POST /api/boosts  — purchase a boost ────────────────────────────────────

router.post("/", requireAuth, async (req, res) => {
  const { dareId, tier } = req.body as { dareId: unknown; tier: unknown };
  if (typeof dareId !== "number" || !Number.isInteger(dareId) || dareId <= 0) {
    res.status(400).json({ error: "Invalid dare ID." });
    return;
  }
  if (tier !== "tier1" && tier !== "tier2" && tier !== "tier3") {
    res.status(400).json({ error: "Invalid boost tier. Must be tier1, tier2, or tier3." });
    return;
  }
  const userId = req.user!.userId;
  const tierDef = BOOST_TIERS[tier]!;

  // Verify dare exists and is active
  const [dare] = await db
    .select({ id: daresTable.id, status: daresTable.status, title: daresTable.title })
    .from(daresTable)
    .where(eq(daresTable.id, dareId))
    .limit(1);

  if (!dare) {
    res.status(404).json({ error: "Dare not found." });
    return;
  }
  if (dare.status !== "active") {
    res.status(400).json({ error: "You can only boost active dares." });
    return;
  }

  // Check wallet
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));

  if (!wallet || wallet.availableBalance < tierDef.amountCents) {
    const needDollars = (tierDef.amountCents / 100).toFixed(2);
    const hasDollars = ((wallet?.availableBalance ?? 0) / 100).toFixed(2);
    res.status(400).json({
      error: `You need $${needDollars} in your wallet to purchase this boost. Current balance: $${hasDollars}.`,
    });
    return;
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + tierDef.durationHours * 60 * 60 * 1000);

  const boost = await db.transaction(async (tx) => {
    // Deduct wallet
    await tx
      .update(walletsTable)
      .set({
        availableBalance: sql`available_balance - ${tierDef.amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, userId));

    // Record wallet transaction
    await tx.insert(walletTransactionsTable).values({
      userId,
      type: "boost_purchase",
      status: "completed",
      amount: tierDef.amountCents,
      relatedDareId: dareId,
      description: `${tierDef.label} for dare: ${dare.title}`,
    });

    // Create boost record
    const [newBoost] = await tx
      .insert(boostsTable)
      .values({
        dareId,
        purchasedByUserId: userId,
        boostTier: tier,
        amountPaid: tierDef.amountCents,
        startsAt: now,
        endsAt,
        status: "active",
      })
      .returning();

    return newBoost;
  });

  res.status(201).json({ boost });
});

export default router;

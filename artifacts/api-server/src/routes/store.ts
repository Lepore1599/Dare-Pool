import { Router } from "express";
import { db } from "@workspace/db";
import {
  userBadgesTable,
  walletsTable,
  walletTransactionsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const VALID_BADGE_IDS = ["bronze", "silver", "gold", "premium"] as const;
type BadgeId = typeof VALID_BADGE_IDS[number];

function isValidBadgeId(id: unknown): id is BadgeId {
  return VALID_BADGE_IDS.includes(id as BadgeId);
}

const router = Router();

// ─── Store item definitions ───────────────────────────────────────────────────

export const STORE_BADGES: Record<BadgeId, {
  label: string;
  emoji: string;
  description: string;
  amountCents: number;
}> = {
  bronze:  { label: "Bronze Badge",  emoji: "🥉", description: "Show you're a serious contender",   amountCents: 99  },
  silver:  { label: "Silver Badge",  emoji: "🥈", description: "Reserved for rising stars",         amountCents: 299 },
  gold:    { label: "Gold Badge",    emoji: "🥇", description: "Only the elite carry this",          amountCents: 499 },
  premium: { label: "Premium Badge", emoji: "💎", description: "Ultimate prestige on your profile", amountCents: 999 },
};

// ─── GET /api/store/items ─────────────────────────────────────────────────────

router.get("/items", (_, res) => {
  const badges = (Object.entries(STORE_BADGES) as [BadgeId, typeof STORE_BADGES[BadgeId]][]).map(([id, b]) => ({ id, ...b }));
  res.json({ badges });
});

// ─── GET /api/store/badges ────────────────────────────────────────────────────

router.get("/badges", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const rows = await db
    .select()
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, userId))
    .orderBy(userBadgesTable.purchasedAt);
  res.json({ badges: rows });
});

// ─── POST /api/store/badges/purchase ─────────────────────────────────────────

router.post("/badges/purchase", requireAuth, async (req, res) => {
  const { badgeId } = req.body as { badgeId: unknown };
  if (!isValidBadgeId(badgeId)) {
    res.status(400).json({ error: "Invalid badge ID." });
    return;
  }

  const userId = req.user!.userId;
  const badgeDef = STORE_BADGES[badgeId];

  // Already owned?
  const [existing] = await db
    .select()
    .from(userBadgesTable)
    .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId)))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "You already own this badge." });
    return;
  }

  // Check wallet
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));

  if (!wallet || wallet.availableBalance < badgeDef.amountCents) {
    const needDollars = (badgeDef.amountCents / 100).toFixed(2);
    const hasDollars = ((wallet?.availableBalance ?? 0) / 100).toFixed(2);
    res.status(400).json({
      error: `You need $${needDollars} in your wallet. Current balance: $${hasDollars}.`,
    });
    return;
  }

  const badge = await db.transaction(async (tx) => {
    await tx
      .update(walletsTable)
      .set({ availableBalance: sql`available_balance - ${badgeDef.amountCents}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(walletTransactionsTable).values({
      userId,
      type: "badge_purchase",
      status: "completed",
      amount: badgeDef.amountCents,
      description: `Purchased ${badgeDef.label}`,
    });

    const [newBadge] = await tx
      .insert(userBadgesTable)
      .values({ userId, badgeId })
      .returning();

    return newBadge;
  });

  res.status(201).json({ badge });
});

// ─── POST /api/store/badges/equip ────────────────────────────────────────────

router.post("/badges/equip", requireAuth, async (req, res) => {
  const { badgeId, equip } = req.body as { badgeId: unknown; equip: unknown };
  if (!isValidBadgeId(badgeId)) {
    res.status(400).json({ error: "Invalid badge ID." });
    return;
  }
  if (typeof equip !== "boolean") {
    res.status(400).json({ error: "equip must be a boolean." });
    return;
  }

  const userId = req.user!.userId;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(userBadgesTable)
    .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "You don't own this badge." });
    return;
  }

  // Unequip all badges first
  await db
    .update(userBadgesTable)
    .set({ equippedAt: null })
    .where(eq(userBadgesTable.userId, userId));

  // Re-equip if requested
  if (equip) {
    await db
      .update(userBadgesTable)
      .set({ equippedAt: new Date() })
      .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId)));
  }

  res.json({ success: true, equipped: equip ? badgeId : null });
});

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, daresTable, entriesTable, votesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

// POST /api/seed  — creates demo data if db is empty. Safe to call multiple times.
router.post("/", async (_req, res) => {
  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable);
  if (Number(userCount) > 0) {
    res.json({ ok: true, message: "Database already seeded." });
    return;
  }

  const hash = await bcrypt.hash("password123", 12);

  const [admin] = await db.insert(usersTable).values({ username: "Admin", email: "admin@darepool.com", passwordHash: hash, isAdmin: true }).returning();
  const [user1] = await db.insert(usersTable).values({ username: "DareKing", email: "dareking@example.com", passwordHash: hash }).returning();
  const [user2] = await db.insert(usersTable).values({ username: "ChillSeeker", email: "chill@example.com", passwordHash: hash }).returning();
  const [user3] = await db.insert(usersTable).values({ username: "FireEater99", email: "fire@example.com", passwordHash: hash }).returning();
  const [user4] = await db.insert(usersTable).values({ username: "IceWarrior", email: "ice@example.com", passwordHash: hash }).returning();
  const [user5] = await db.insert(usersTable).values({ username: "JibberJabber", email: "jibber@example.com", passwordHash: hash }).returning();

  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 3600 * 1000);
  const ago = (n: number) => new Date(now.getTime() - n * 3600 * 1000);

  // Active dares
  const [d1] = await db.insert(daresTable).values({ title: "Eat a spoonful of hot sauce and finish a sentence", description: "Down a spoonful of your hottest hot sauce then recite the pledge of allegiance without stopping. Record it all.", prizePool: 250, createdByUserId: user1!.id, expiresAt: h(44) }).returning();
  const [d2] = await db.insert(daresTable).values({ title: "Cold plunge for 60 seconds", description: "Jump into ice-cold water (bathtub full of ice counts) and stay submerged for 60 seconds. Prove it on camera.", prizePool: 500, createdByUserId: user2!.id, expiresAt: h(38) }).returning();

  // Expired dare
  const [d3] = await db.insert(daresTable).values({ title: "Order a meal entirely in a made-up language", description: "Walk into any fast food place and place your entire order in a language you invented on the spot.", prizePool: 100, createdByUserId: user5!.id, expiresAt: ago(2), status: "expired" }).returning();

  // Entries for active dare 1
  const [e1] = await db.insert(entriesTable).values({ dareId: d1!.id, userId: user3!.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "link", voteCount: 12 }).returning();
  const [e2] = await db.insert(entriesTable).values({ dareId: d1!.id, userId: user4!.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "link", voteCount: 7 }).returning();

  // Entry for active dare 2
  const [e3] = await db.insert(entriesTable).values({ dareId: d2!.id, userId: user1!.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "link", voteCount: 19 }).returning();

  // Entries for expired dare (with winner)
  const [e4] = await db.insert(entriesTable).values({ dareId: d3!.id, userId: user5!.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "link", voteCount: 31, status: "winner" }).returning();
  const [e5] = await db.insert(entriesTable).values({ dareId: d3!.id, userId: user2!.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "link", voteCount: 14 }).returning();
  const [e6] = await db.insert(entriesTable).values({ dareId: d3!.id, userId: user3!.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "link", voteCount: 9 }).returning();

  // Set winner on expired dare
  await db.update(daresTable).set({ winnerEntryId: e4!.id }).where(eq(daresTable.id, d3!.id));

  // Update user stats
  await db.update(usersTable).set({ wins: 1 }).where(eq(usersTable.id, user5!.id));

  // Sample votes for the expired dare
  if (admin && e4 && e5 && e6 && d3) {
    await db.insert(votesTable).values([
      { dareId: d3.id, entryId: e4.id, userId: admin.id },
      { dareId: d3.id, entryId: e5.id, userId: user1!.id },
      { dareId: d3.id, entryId: e6.id, userId: user4!.id },
    ]).onConflictDoNothing();
  }

  res.json({
    ok: true,
    message: "Seeded successfully.",
    adminLogin: { email: "admin@darepool.com", password: "password123" },
    demoLogin: { email: "dareking@example.com", password: "password123" },
  });
});

export default router;

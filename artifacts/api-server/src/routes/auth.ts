import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, registerSchema, loginSchema } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }
  const { username, email, password } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.username, username), eq(usersTable.email, email.toLowerCase())))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Username or email already taken." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ username, email: email.toLowerCase(), passwordHash })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create account." });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
  res.json({
    token,
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "This account has been suspended." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
  res.json({
    token,
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      isAdmin: usersTable.isAdmin,
      isBanned: usersTable.isBanned,
      wins: usersTable.wins,
      totalEntries: usersTable.totalEntries,
      totalVotesCast: usersTable.totalVotesCast,
      createdAt: usersTable.createdAt,
      termsAcceptedAt: usersTable.termsAcceptedAt,
      guidelinesAcceptedAt: usersTable.guidelinesAcceptedAt,
      privacyAcceptedAt: usersTable.privacyAcceptedAt,
      riskAcceptedAt: usersTable.riskAcceptedAt,
      acceptedPolicyVersion: usersTable.acceptedPolicyVersion,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({ user });
});

// POST /api/auth/accept-terms
router.post("/accept-terms", requireAuth, async (req, res) => {
  const { terms, guidelines, privacy, risk, policyVersion } = req.body as {
    terms?: boolean;
    guidelines?: boolean;
    privacy?: boolean;
    risk?: boolean;
    policyVersion?: string;
  };

  if (!terms || !guidelines || !privacy || !risk) {
    res.status(400).json({ error: "All agreements must be accepted." });
    return;
  }

  const now = new Date();
  await db.update(usersTable).set({
    termsAcceptedAt: now,
    guidelinesAcceptedAt: now,
    privacyAcceptedAt: now,
    riskAcceptedAt: now,
    acceptedPolicyVersion: policyVersion ?? "1.0",
  }).where(eq(usersTable.id, req.user!.userId));

  res.json({ ok: true });
});

export default router;

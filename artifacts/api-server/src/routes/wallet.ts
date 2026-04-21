import { Router } from "express";
import { db } from "@workspace/db";
import {
  walletsTable, walletTransactionsTable, payoutAccountsTable, withdrawalRequestsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";

const router = Router();
router.use(requireAuth);

// ─── Get or create wallet ─────────────────────────────────────────────────────

async function getOrCreateWallet(userId: number) {
  const [existing] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(walletsTable).values({ userId }).returning();
  return created!;
}

// ─── GET /api/wallet ──────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const wallet = await getOrCreateWallet(userId);

  const transactions = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, userId))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(50);

  const [payoutAccount] = await db
    .select()
    .from(payoutAccountsTable)
    .where(eq(payoutAccountsTable.userId, userId))
    .limit(1);

  res.json({ wallet, transactions, payoutAccount: payoutAccount ?? null });
});

// ─── POST /api/wallet/deposit ─────────────────────────────────────────────────

router.post("/deposit", async (req, res) => {
  const userId = req.user!.userId;
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount < 100 || amount > 10_000_00) {
    res.status(400).json({ error: "Amount must be between $1.00 and $10,000." }); return;
  }
  const wallet = await getOrCreateWallet(userId);

  const stripe = await getUncachableStripeClient();

  // Ensure the user has a Stripe customer record
  let customerId = wallet.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { userId: String(userId) } });
    customerId = customer.id;
    await db.update(walletsTable)
      .set({ stripeCustomerId: customerId })
      .where(eq(walletsTable.userId, userId));
  }

  // Create a pending transaction record
  const [txn] = await db.insert(walletTransactionsTable).values({
    userId,
    type: "deposit",
    status: "pending",
    amount,
    description: `Deposit $${(amount / 100).toFixed(2)}`,
  }).returning();

  // Build success/cancel URLs using the app domain
  const appDomain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
  const baseUrl = `https://${appDomain}`;

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: "DarePool Wallet Deposit" },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/wallet?deposit=success&txn=${txn!.id}`,
    cancel_url: `${baseUrl}/wallet?deposit=cancel`,
    metadata: { userId: String(userId), txnId: String(txn!.id) },
  });

  // Update txn with Stripe session ID
  await db.update(walletTransactionsTable)
    .set({ processorReferenceId: session.id })
    .where(eq(walletTransactionsTable.id, txn!.id));

  res.json({ url: session.url, sessionId: session.id });
});

// ─── POST /api/wallet/webhook — Stripe webhook (called from main webhook handler)

// Actually the webhook is handled globally in app.ts, but we expose a helper here
// for balance crediting. Called by the main webhook handler after checkout.session.completed.
export async function creditWalletAfterCheckout(sessionId: string) {
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const userId = Number(session.metadata?.userId);
  const txnId = Number(session.metadata?.txnId);
  if (!userId || !txnId) return;

  const [txn] = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.id, txnId))
    .limit(1);

  if (!txn || txn.status !== "pending") return; // already processed

  await db.transaction(async (tx) => {
    await tx.update(walletTransactionsTable)
      .set({ status: "completed" })
      .where(eq(walletTransactionsTable.id, txnId));

    await tx.update(walletsTable).set({
      availableBalance: sql`${walletsTable.availableBalance} + ${txn.amount}`,
      withdrawableBalance: sql`${walletsTable.withdrawableBalance} + ${txn.amount}`,
      lifetimeDeposited: sql`${walletsTable.lifetimeDeposited} + ${txn.amount}`,
    }).where(eq(walletsTable.userId, userId));
  });
}

// ─── POST /api/wallet/withdraw ────────────────────────────────────────────────

router.post("/withdraw", async (req, res) => {
  const userId = req.user!.userId;
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount < 500) {
    res.status(400).json({ error: "Minimum withdrawal is $5.00." }); return;
  }
  const wallet = await getOrCreateWallet(userId);

  if (wallet.withdrawableBalance < amount) {
    res.status(400).json({ error: "Insufficient withdrawable balance." }); return;
  }

  const [payoutAccount] = await db
    .select()
    .from(payoutAccountsTable)
    .where(eq(payoutAccountsTable.userId, userId))
    .limit(1);

  if (!payoutAccount || !payoutAccount.onboardingComplete || !payoutAccount.payoutsEnabled) {
    res.status(400).json({ error: "Payout account not set up. Please complete onboarding first.", needsOnboarding: true }); return;
  }

  const stripe = await getUncachableStripeClient();

  const [wr] = await db.insert(withdrawalRequestsTable).values({
    userId,
    amount,
    status: "processing",
  }).returning();

  try {
    const payout = await stripe.transfers.create({
      amount,
      currency: "usd",
      destination: payoutAccount.providerAccountId,
    });

    await db.transaction(async (tx) => {
      await tx.update(withdrawalRequestsTable)
        .set({ status: "completed", providerPayoutId: payout.id })
        .where(eq(withdrawalRequestsTable.id, wr!.id));

      await tx.update(walletsTable).set({
        withdrawableBalance: sql`${walletsTable.withdrawableBalance} - ${amount}`,
        availableBalance: sql`${walletsTable.availableBalance} - ${amount}`,
        lifetimeWithdrawn: sql`${walletsTable.lifetimeWithdrawn} + ${amount}`,
      }).where(eq(walletsTable.userId, userId));

      await tx.insert(walletTransactionsTable).values({
        userId,
        type: "withdrawal",
        status: "completed",
        amount,
        processor: "stripe_connect",
        processorReferenceId: payout.id,
        description: `Withdrawal $${(amount / 100).toFixed(2)}`,
      });
    });

    res.json({ ok: true, payoutId: payout.id });
  } catch (err: unknown) {
    await db.update(withdrawalRequestsTable)
      .set({ status: "failed", failureReason: err instanceof Error ? err.message : "Unknown" })
      .where(eq(withdrawalRequestsTable.id, wr!.id));
    res.status(500).json({ error: "Payout failed. Please try again." });
  }
});

// ─── POST /api/wallet/onboard ─────────────────────────────────────────────────

router.post("/onboard", async (req, res) => {
  const userId = req.user!.userId;
  const stripe = await getUncachableStripeClient();

  const appDomain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
  const baseUrl = `https://${appDomain}`;

  let [payoutAccount] = await db
    .select()
    .from(payoutAccountsTable)
    .where(eq(payoutAccountsTable.userId, userId))
    .limit(1);

  let accountId: string;

  if (!payoutAccount) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { userId: String(userId) },
    });
    accountId = account.id;
    [payoutAccount] = await db.insert(payoutAccountsTable).values({
      userId,
      providerAccountId: accountId,
    }).returning();
  } else {
    accountId = payoutAccount.providerAccountId;
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/wallet?onboard=refresh`,
    return_url: `${baseUrl}/wallet?onboard=complete`,
    type: "account_onboarding",
  });

  res.json({ url: accountLink.url });
});

// ─── GET /api/wallet/onboard-status ──────────────────────────────────────────

router.get("/onboard-status", async (req, res) => {
  const userId = req.user!.userId;
  const [payoutAccount] = await db
    .select()
    .from(payoutAccountsTable)
    .where(eq(payoutAccountsTable.userId, userId))
    .limit(1);

  if (!payoutAccount) { res.json({ hasAccount: false }); return; }

  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.retrieve(payoutAccount.providerAccountId);

  const payoutsEnabled = account.payouts_enabled ? 1 : 0;
  const chargesEnabled = account.charges_enabled ? 1 : 0;
  const onboardingComplete = payoutsEnabled;

  await db.update(payoutAccountsTable).set({
    payoutsEnabled,
    chargesEnabled,
    onboardingComplete,
  }).where(eq(payoutAccountsTable.userId, userId));

  res.json({
    hasAccount: true,
    onboardingComplete: !!onboardingComplete,
    payoutsEnabled: !!payoutsEnabled,
  });
});

// ─── GET /api/wallet/publishable-key ─────────────────────────────────────────

router.get("/publishable-key", async (_req, res) => {
  const key = await getStripePublishableKey();
  res.json({ publishableKey: key });
});

export default router;

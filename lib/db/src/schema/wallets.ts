import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { daresTable } from "./dares";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  availableBalance: integer("available_balance").notNull().default(0), // cents
  pendingBalance: integer("pending_balance").notNull().default(0),     // cents
  withdrawableBalance: integer("withdrawable_balance").notNull().default(0), // cents
  lifetimeDeposited: integer("lifetime_deposited").notNull().default(0),
  lifetimeWithdrawn: integer("lifetime_withdrawn").notNull().default(0),
  lifetimeWon: integer("lifetime_won").notNull().default(0),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  // deposit | withdrawal | prize_win | dare_entry_fee | refund
  // dare_fund | dare_win_credit | dare_creator_credit | platform_fee
  // dare_pool_transfer_out | dare_pool_transfer_in
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"), // pending | completed | failed
  amount: integer("amount").notNull(), // cents, always positive
  currency: text("currency").notNull().default("usd"),
  processor: text("processor").notNull().default("stripe"),
  processorReferenceId: text("processor_reference_id"),
  relatedDareId: integer("related_dare_id"),
  relatedEntryId: integer("related_entry_id"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const poolContributionsTable = pgTable("pool_contributions", {
  id: serial("id").primaryKey(),
  dareId: integer("dare_id").notNull().references(() => daresTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: integer("amount").notNull(), // dollars (same unit as prizePool)
  walletTransactionId: integer("wallet_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payoutAccountsTable = pgTable("payout_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  provider: text("provider").notNull().default("stripe_connect"),
  providerAccountId: text("provider_account_id").notNull(),
  onboardingComplete: integer("onboarding_complete").notNull().default(0), // 0 | 1
  payoutsEnabled: integer("payouts_enabled").notNull().default(0),
  chargesEnabled: integer("charges_enabled").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: integer("amount").notNull(), // cents
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  providerPayoutId: text("provider_payout_id"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Wallet = typeof walletsTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
export type PayoutAccount = typeof payoutAccountsTable.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
export type PoolContribution = typeof poolContributionsTable.$inferSelect;

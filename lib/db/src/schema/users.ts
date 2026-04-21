import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  strikeCount: integer("strike_count").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  totalEntries: integer("total_entries").notNull().default(0),
  totalVotesCast: integer("total_votes_cast").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  currentWinStreak: integer("current_win_streak").notNull().default(0),
  bestWinStreak: integer("best_win_streak").notNull().default(0),
  totalPrizeEarnings: integer("total_prize_earnings").notNull().default(0),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  lastActiveAt: timestamp("last_active_at"),
  lastUsernameChangeAt: timestamp("last_username_change_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  emailVerified: boolean("email_verified").notNull().default(false),
  // Legal acceptance
  termsAcceptedAt: timestamp("terms_accepted_at"),
  guidelinesAcceptedAt: timestamp("guidelines_accepted_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  riskAcceptedAt: timestamp("risk_accepted_at"),
  acceptedPolicyVersion: text("accepted_policy_version"),
  // Privacy settings
  privateAccount: boolean("private_account").notNull().default(false),
  commentPrivacyDares: text("comment_privacy_dares").notNull().default("everyone"),
  commentPrivacySubmissions: text("comment_privacy_submissions").notNull().default("everyone"),
  messagePrivacy: text("message_privacy").notNull().default("everyone"),
  hideEarnings: boolean("hide_earnings").notNull().default(false),
  allowBoosts: boolean("allow_boosts").notNull().default(true),
  // Content preferences
  dataSaverEnabled: boolean("data_saver_enabled").notNull().default(false),
  autoplayEnabled: boolean("autoplay_enabled").notNull().default(true),
  mutedByDefault: boolean("muted_by_default").notNull().default(false),
  language: text("language").notNull().default("en"),
  theme: text("theme").notNull().default("dark"),
  // Soft delete
  deletedAt: timestamp("deleted_at"),
});

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  notifyDareFunded: boolean("notify_dare_funded").notNull().default(true),
  notifyNewSubmission: boolean("notify_new_submission").notNull().default(true),
  notifyNewDareComment: boolean("notify_new_dare_comment").notNull().default(true),
  notifyNewSubmissionComment: boolean("notify_new_submission_comment").notNull().default(true),
  notifyBoostOnMyDare: boolean("notify_boost_on_my_dare").notNull().default(true),
  notifyDareWon: boolean("notify_dare_won").notNull().default(true),
  notifyPoolTransferred: boolean("notify_pool_transferred").notNull().default(true),
  notifyWalletDeposit: boolean("notify_wallet_deposit").notNull().default(true),
  notifyWithdrawalStatus: boolean("notify_withdrawal_status").notNull().default(true),
  notifySecurityAlerts: boolean("notify_security_alerts").notNull().default(true),
  notifyMarketing: boolean("notify_marketing").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const blockedUsersTable = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  blockedUserId: integer("blocked_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  isAdmin: true,
  isBanned: true,
  strikeCount: true,
  wins: true,
  totalEntries: true,
  totalVotesCast: true,
  totalComments: true,
  currentWinStreak: true,
  bestWinStreak: true,
  totalPrizeEarnings: true,
  bio: true,
  avatarUrl: true,
  lastActiveAt: true,
  lastUsernameChangeAt: true,
  createdAt: true,
  emailVerified: true,
  termsAcceptedAt: true,
  guidelinesAcceptedAt: true,
  privacyAcceptedAt: true,
  riskAcceptedAt: true,
  acceptedPolicyVersion: true,
  privateAccount: true,
  commentPrivacyDares: true,
  commentPrivacySubmissions: true,
  messagePrivacy: true,
  hideEarnings: true,
  allowBoosts: true,
  dataSaverEnabled: true,
  autoplayEnabled: true,
  mutedByDefault: true,
  language: true,
  theme: true,
  displayName: true,
  deletedAt: true,
});

export const registerSchema = z.object({
  username: z.string().min(2).max(24).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  email: z.email(),
  password: z.string().min(6).max(72),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const updateProfileSchema = z.object({
  bio: z.string().trim().max(200, "Bio must be 200 characters or less.").optional(),
  avatarUrl: z.string().trim().max(500).optional(),
  displayName: z.string().trim().max(50).optional(),
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters.")
    .max(24, "Username must be 24 characters or less.")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores are allowed.")
    .optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, "passwordHash" | "email">;

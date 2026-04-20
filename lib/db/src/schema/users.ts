import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
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

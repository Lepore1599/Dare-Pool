import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Purchased profile badges: "bronze" | "silver" | "gold" | "premium"
export const userBadgesTable = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  badgeId: text("badge_id").notNull(), // e.g. "bronze", "silver", "gold", "premium"
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  equippedAt: timestamp("equipped_at"), // null = not equipped; non-null = currently equipped
});

export type UserBadge = typeof userBadgesTable.$inferSelect;

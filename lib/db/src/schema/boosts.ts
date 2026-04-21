import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { daresTable } from "./dares";

// Boost tiers: "tier1" ($1.99 / 2h), "tier2" ($4.99 / 10h), "tier3" ($9.99 / 24h)
export const boostsTable = pgTable("boosts", {
  id: serial("id").primaryKey(),
  dareId: integer("dare_id").notNull().references(() => daresTable.id),
  purchasedByUserId: integer("purchased_by_user_id").notNull().references(() => usersTable.id),
  // tier1 | tier2 | tier3
  boostTier: text("boost_tier").notNull(),
  amountPaid: integer("amount_paid").notNull(), // cents
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
  // active | expired | canceled
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Boost = typeof boostsTable.$inferSelect;

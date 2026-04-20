import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const daresTable = pgTable("dares", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  prizePool: integer("prize_pool").notNull().default(0),
  createdByUserId: integer("created_by_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("active"), // active | expired | reported | removed
  winnerEntryId: integer("winner_entry_id"),
  isFeatured: boolean("is_featured").notNull().default(false),
  reportCount: integer("report_count").notNull().default(0),
});

export const insertDareSchema = createInsertSchema(daresTable).omit({
  id: true,
  status: true,
  winnerEntryId: true,
  isFeatured: true,
  reportCount: true,
  createdAt: true,
});

export const createDareSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(500),
  prizePool: z.number().int().min(1),
});

export type InsertDare = z.infer<typeof insertDareSchema>;
export type Dare = typeof daresTable.$inferSelect;

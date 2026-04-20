import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { daresTable } from "./dares";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  dareId: integer("dare_id").references(() => daresTable.id),
  entryId: integer("entry_id"), // nullable
  reportedByUserId: integer("reported_by_user_id").notNull().references(() => usersTable.id),
  reason: text("reason").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status").notNull().default("open"), // open | reviewed | dismissed | actioned
});

export const submitReportSchema = z.object({
  dareId: z.number().int().optional(),
  entryId: z.number().int().optional(),
  reason: z.enum([
    "dangerous",
    "illegal",
    "harassment",
    "hate_speech",
    "sexual",
    "offensive",
    "spam",
    "other",
  ]),
  details: z.string().max(500).optional(),
});

export type Report = typeof reportsTable.$inferSelect;

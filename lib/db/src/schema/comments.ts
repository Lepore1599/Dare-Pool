import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { entriesTable } from "./entries";
import { daresTable } from "./dares";

export const commentsTable = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    // Exactly one of entryId / dareId must be set (enforced at app level)
    entryId: integer("entry_id").references(() => entriesTable.id),
    dareId: integer("dare_id").references(() => daresTable.id),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    content: text("content").notNull(),
    status: text("status").notNull().default("active"), // active | flagged | removed
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    entryIdx: index("comments_entry_idx").on(t.entryId),
    dareIdx: index("comments_dare_idx").on(t.dareId),
  })
);

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment can't be empty.").max(500, "Comment is too long (500 max)."),
});

export const reportCommentSchema = z.object({
  reason: z.enum(["harassment", "hate_speech", "offensive", "spam", "sexual", "other"]),
});

export type Comment = typeof commentsTable.$inferSelect;

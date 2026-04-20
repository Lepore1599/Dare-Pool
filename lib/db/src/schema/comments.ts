import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { entriesTable } from "./entries";

export const commentsTable = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id").notNull().references(() => entriesTable.id),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    entryIdx: index("comments_entry_idx").on(t.entryId),
  })
);

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment can't be empty.").max(500, "Comment is too long (500 max)."),
});

export type Comment = typeof commentsTable.$inferSelect;

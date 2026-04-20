import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { daresTable } from "./dares";

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  dareId: integer("dare_id").notNull().references(() => daresTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  videoUrl: text("video_url").notNull(),
  videoType: text("video_type").notNull().default("link"), // link | upload
  createdAt: timestamp("created_at").notNull().defaultNow(),
  voteCount: integer("vote_count").notNull().default(0),
  status: text("status").notNull().default("active"), // active | removed | flagged | winner
});

export const submitEntrySchema = z.object({
  videoUrl: z.string().min(1, "Video URL is required"),
  videoType: z.enum(["link", "upload"]),
});

export type Entry = typeof entriesTable.$inferSelect;

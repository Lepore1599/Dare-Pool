import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { daresTable } from "./dares";
import { entriesTable } from "./entries";

export const votesTable = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    dareId: integer("dare_id").notNull().references(() => daresTable.id),
    entryId: integer("entry_id").notNull().references(() => entriesTable.id),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("one_vote_per_dare").on(table.dareId, table.userId),
  ]
);

export type Vote = typeof votesTable.$inferSelect;

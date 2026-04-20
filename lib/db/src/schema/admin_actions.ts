import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminActionsTable = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull().references(() => usersTable.id),
  actionType: text("action_type").notNull(),
  targetType: text("target_type").notNull(), // dare | entry | user | report
  targetId: integer("target_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminAction = typeof adminActionsTable.$inferSelect;

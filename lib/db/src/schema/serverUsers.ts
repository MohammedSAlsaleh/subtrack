import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Server-side user accounts — durable identity across reinstalls */
export const serverUsers = pgTable("server_users", {
  email:        text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  /** Display name — stored so it can be restored after a reinstall */
  name:         text("name").notNull().default(""),
  /** Stable client-generated user ID — kept so reinstalled app gets the same ID */
  userId:       text("user_id"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type ServerUser = typeof serverUsers.$inferSelect;

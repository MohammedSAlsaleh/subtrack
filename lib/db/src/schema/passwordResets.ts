import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One-time password-reset codes — expire after 15 minutes */
export const passwordResets = pgTable("password_resets", {
  email:     text("email").primaryKey(),
  code:      text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordReset = typeof passwordResets.$inferSelect;

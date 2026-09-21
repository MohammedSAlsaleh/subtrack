import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const premiumEntitlements = pgTable("premium_entitlements", {
  /** User email — the durable identifier across reinstalls */
  email: text("email").primaryKey(),
  isPremium: boolean("is_premium").notNull().default(false),
  grantedAt: timestamp("granted_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PremiumEntitlement = typeof premiumEntitlements.$inferSelect;

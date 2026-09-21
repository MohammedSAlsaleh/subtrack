import { Router } from "express";
import { db, premiumEntitlements } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireJwt, type AuthRequest } from "../middlewares/jwtAuth";
import { withDbRetry, TransientDbError, PRODUCTION_BACKOFF } from "../lib/dbRetry";

const router = Router();

/**
 * GET /api/premium/:email
 * Requires Bearer JWT. Returns premium status for the authenticated user.
 * The email param must match the JWT subject.
 */
router.get("/premium/:email", requireJwt, async (req: AuthRequest, res) => {
  const email = decodeURIComponent(String(req.params.email)).toLowerCase();
  if (req.authEmail !== email) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    await withDbRetry(async () => {
      const rows = await db
        .select()
        .from(premiumEntitlements)
        .where(eq(premiumEntitlements.email, email))
        .limit(1);

      res.json({ isPremium: rows.length > 0 && rows[0].isPremium === true });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Failed to check entitlement" });
    }
  }
});

/**
 * POST /api/premium/:email
 * Requires Bearer JWT scoped to the same email.
 * DEV-ONLY simulation — disabled in production.
 * In production, premium is granted exclusively via RevenueCat server webhook.
 */
router.post("/premium/:email", requireJwt, async (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Direct premium grants are not permitted in production. Use the purchase flow." });
    return;
  }

  const email = decodeURIComponent(String(req.params.email)).toLowerCase();
  if (req.authEmail !== email) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    await withDbRetry(async () => {
      await db
        .insert(premiumEntitlements)
        .values({ email, isPremium: true, grantedAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: premiumEntitlements.email,
          set: { isPremium: true, grantedAt: new Date(), updatedAt: new Date() },
        });

      res.json({ isPremium: true });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Failed to grant entitlement" });
    }
  }
});

/**
 * DELETE /api/premium/:email
 * Requires Bearer JWT scoped to the same email.
 * DEV-ONLY simulation — disabled in production.
 */
router.delete("/premium/:email", requireJwt, async (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Direct premium revocation is not permitted in production." });
    return;
  }

  const email = decodeURIComponent(String(req.params.email)).toLowerCase();
  if (req.authEmail !== email) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    await withDbRetry(async () => {
      await db
        .insert(premiumEntitlements)
        .values({ email, isPremium: false, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: premiumEntitlements.email,
          set: { isPremium: false, updatedAt: new Date() },
        });

      res.json({ isPremium: false });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Failed to revoke entitlement" });
    }
  }
});

export default router;

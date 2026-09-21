import { Router } from "express";
import jwt from "jsonwebtoken";
import { db, serverUsers, passwordResets } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireJwt, type AuthRequest } from "../middlewares/jwtAuth";
import { withDbRetry, TransientDbError, PRODUCTION_BACKOFF } from "../lib/dbRetry";

const router = Router();
const TOKEN_TTL = "90d";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET environment variable is not set");
  return s;
}

/**
 * POST /api/auth/register
 * Body: { email, passwordHash, name?, userId? }
 * Idempotent — safe to retry after a network failure.
 */
router.post("/auth/register", async (req, res) => {
  const { email, passwordHash, name = "", userId } = req.body as {
    email: string; passwordHash: string; name?: string; userId?: string;
  };
  if (!email || !passwordHash) {
    res.status(400).json({ error: "email and passwordHash are required" });
    return;
  }
  const normalised = email.trim().toLowerCase();

  try {
    await withDbRetry(async () => {
      const existing = await db
        .select({ email: serverUsers.email, passwordHash: serverUsers.passwordHash })
        .from(serverUsers)
        .where(eq(serverUsers.email, normalised))
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].passwordHash === passwordHash) {
          res.status(200).json({ ok: true, existed: true });
        } else {
          res.status(409).json({ error: "An account with this email already exists." });
        }
        return;
      }

      await db
        .insert(serverUsers)
        .values({ email: normalised, passwordHash, name: name.trim(), userId });

      res.status(201).json({ ok: true });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

/**
 * POST /api/auth/login
 * Body: { email, passwordHash }
 * Returns: { token }
 */
router.post("/auth/login", async (req, res) => {
  const { email, passwordHash } = req.body as { email: string; passwordHash: string };
  if (!email || !passwordHash) {
    res.status(400).json({ error: "email and passwordHash are required" });
    return;
  }
  const normalised = email.trim().toLowerCase();

  try {
    await withDbRetry(async () => {
      const rows = await db
        .select()
        .from(serverUsers)
        .where(eq(serverUsers.email, normalised))
        .limit(1);

      if (rows.length === 0 || rows[0].passwordHash !== passwordHash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        { sub: normalised, email: normalised },
        getSecret(),
        { expiresIn: TOKEN_TTL },
      );
      res.json({ token });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
});

/**
 * GET /api/auth/profile
 * Requires Bearer JWT.
 * Returns the authenticated user's stored profile so a reinstalled app can
 * restore its local record without the user re-entering their name.
 */
router.get("/auth/profile", requireJwt, async (req: AuthRequest, res) => {
  try {
    await withDbRetry(async () => {
      const rows = await db
        .select()
        .from(serverUsers)
        .where(eq(serverUsers.email, req.authEmail!))
        .limit(1);

      if (rows.length === 0) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }
      const { email, name, userId } = rows[0];
      res.json({ email, name, userId });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Generates a 6-digit reset code valid for 15 minutes.
 * Returns { ok, code } — code is returned directly because no email service is configured.
 */
router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  const normalised = email.trim().toLowerCase();

  try {
    await withDbRetry(async () => {
      const user = await db
        .select({ email: serverUsers.email })
        .from(serverUsers)
        .where(eq(serverUsers.email, normalised))
        .limit(1);

      if (user.length === 0) {
        res.status(404).json({ error: "No account found with this email." });
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await db
        .insert(passwordResets)
        .values({ email: normalised, code, expiresAt })
        .onConflictDoUpdate({
          target: passwordResets.email,
          set: { code, expiresAt },
        });

      res.json({ ok: true, code });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Failed to send reset code" });
    }
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { email, code, newPasswordHash }
 * Validates the code and updates the user's password hash.
 */
router.post("/auth/reset-password", async (req, res) => {
  const { email, code, newPasswordHash } = req.body as {
    email: string; code: string; newPasswordHash: string;
  };
  if (!email || !code || !newPasswordHash) {
    res.status(400).json({ error: "email, code, and newPasswordHash are required" });
    return;
  }
  const normalised = email.trim().toLowerCase();

  try {
    await withDbRetry(async () => {
      const resets = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.email, normalised))
        .limit(1);

      if (resets.length === 0 || resets[0].code !== code) {
        res.status(400).json({ error: "Invalid code. Please check and try again." });
        return;
      }
      if (new Date() > resets[0].expiresAt) {
        res.status(400).json({ error: "This code has expired. Please request a new one." });
        return;
      }

      await db
        .update(serverUsers)
        .set({ passwordHash: newPasswordHash })
        .where(eq(serverUsers.email, normalised));

      await db.delete(passwordResets).where(eq(passwordResets.email, normalised));

      res.json({ ok: true });
    }, 200, PRODUCTION_BACKOFF);
  } catch (err) {
    if (err instanceof TransientDbError) {
      res.status(503).json({ error: "Service temporarily unavailable, please retry" });
    } else {
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
});

export default router;

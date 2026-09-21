/**
 * JWT Authentication Bypass test suite
 *
 * Purpose:
 *   Verify that every requireJwt-protected route enforces authentication so
 *   that a future route added without the middleware is immediately caught.
 *
 * Routes covered (all decorated with requireJwt):
 *   GET    /api/auth/profile
 *   GET    /api/premium/:email
 *   POST   /api/premium/:email
 *   DELETE /api/premium/:email
 *
 * Scenarios tested per route:
 *   1. No Authorization header           → 401
 *   2. Malformed header (no "Bearer ")   → 401
 *   3. Tampered token (bad signature)    → 401
 *   4. Expired token                     → 401
 *   5. Valid token for user A accessing
 *      resource scoped to user B         → 403
 *   6. Valid token for the correct user  → not 401 / not 403
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── Database mock ─────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => {
  type Resolve = (v: unknown) => unknown;
  type Reject  = (e: unknown) => unknown;

  return {
    _result: [] as unknown,
    _throws: false,
    setResult(r: unknown) { this._result = r; },
    setThrows(t: boolean) { this._throws = t; },
    reset()               { this._result = []; this._throws = false; },

    select: vi.fn().mockReturnThis(),
    from:   vi.fn().mockReturnThis(),
    where:  vi.fn().mockReturnThis(),
    limit:  vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set:    vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),

    then(resolve: Resolve, reject: Reject) {
      if (this._throws) return Promise.reject(new Error("DB error")).then(resolve, reject);
      return Promise.resolve(this._result).then(resolve, reject);
    },
  };
});

vi.mock("@workspace/db", () => ({
  db: mockDb,
  serverUsers:        { email: "email", passwordHash: "password_hash", name: "name", userId: "user_id" },
  passwordResets:     { email: "email", code: "code", expiresAt: "expires_at" },
  premiumEntitlements: { email: "email", isPremium: "is_premium" },
  eq: vi.fn(),
}));

// ── App (imported AFTER mock is registered) ───────────────────────────────────
import app from "../app.js";

// ── JWT helpers ───────────────────────────────────────────────────────────────
const TEST_SECRET  = "test-session-secret";
const OTHER_SECRET = "a-completely-different-secret";

process.env.SESSION_SECRET = TEST_SECRET;
process.env.NODE_ENV = "test"; // enables POST/DELETE premium routes

/** Valid token signed with the correct secret. */
function validToken(email: string): string {
  return jwt.sign({ sub: email, email }, TEST_SECRET, { expiresIn: "1h" });
}

/** Token signed with a different secret (tampered). */
function tamperedToken(email: string): string {
  return jwt.sign({ sub: email, email }, OTHER_SECRET, { expiresIn: "1h" });
}

/** Token that was valid but is already expired. */
function expiredToken(email: string): string {
  // expiresIn: 0 produces a token that expires immediately
  return jwt.sign({ sub: email, email }, TEST_SECRET, { expiresIn: 0 });
}

// ── Protected routes under test ───────────────────────────────────────────────
const USER_A = "alice@example.com";
const USER_B = "bob@example.com";

const PROTECTED_ROUTES = [
  {
    label: "GET /api/auth/profile",
    method: "get" as const,
    path: "/api/auth/profile",
    // No cross-user param — just needs a valid token for itself.
    crossUserPath: null,
    authorisedEmail: USER_A,
  },
  {
    label: "GET /api/premium/:email",
    method: "get" as const,
    path: `/api/premium/${encodeURIComponent(USER_A)}`,
    crossUserPath: `/api/premium/${encodeURIComponent(USER_B)}`,
    authorisedEmail: USER_A,
  },
  {
    label: "POST /api/premium/:email",
    method: "post" as const,
    path: `/api/premium/${encodeURIComponent(USER_A)}`,
    crossUserPath: `/api/premium/${encodeURIComponent(USER_B)}`,
    authorisedEmail: USER_A,
  },
  {
    label: "DELETE /api/premium/:email",
    method: "delete" as const,
    path: `/api/premium/${encodeURIComponent(USER_A)}`,
    crossUserPath: `/api/premium/${encodeURIComponent(USER_B)}`,
    authorisedEmail: USER_A,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("JWT authentication bypass — protected routes", () => {

  beforeEach(() => {
    mockDb.reset();
    // Default: no DB rows so the route doesn't short-circuit on data checks
    mockDb.setResult([]);
    for (const fn of [
      mockDb.select, mockDb.from, mockDb.where, mockDb.limit,
      mockDb.insert, mockDb.values, mockDb.onConflictDoUpdate,
      mockDb.update, mockDb.set, mockDb.delete,
    ]) {
      fn.mockClear();
    }
  });

  for (const route of PROTECTED_ROUTES) {
    describe(route.label, () => {

      // ── 1. No Authorization header ──────────────────────────────────────────
      it("returns 401 when no Authorization header is sent", async () => {
        const res = await request(app)[route.method](route.path);
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
      });

      // ── 2. Malformed header (missing "Bearer " prefix) ──────────────────────
      it("returns 401 when Authorization header lacks 'Bearer ' prefix", async () => {
        const res = await request(app)
          [route.method](route.path)
          .set("Authorization", `Token ${validToken(route.authorisedEmail)}`);
        expect(res.status).toBe(401);
      });

      // ── 3. Tampered token (signed with wrong secret) ─────────────────────────
      it("returns 401 when token is signed with the wrong secret", async () => {
        const res = await request(app)
          [route.method](route.path)
          .set("Authorization", `Bearer ${tamperedToken(route.authorisedEmail)}`);
        expect(res.status).toBe(401);
      });

      // ── 4. Expired token ─────────────────────────────────────────────────────
      it("returns 401 when token is expired", async () => {
        const res = await request(app)
          [route.method](route.path)
          .set("Authorization", `Bearer ${expiredToken(route.authorisedEmail)}`);
        expect(res.status).toBe(401);
      });

      // ── 5. Cross-user access (user A token, user B resource) ────────────────
      if (route.crossUserPath) {
        it("returns 403 when a valid token for user A tries to access user B's resource", async () => {
          // Token is valid for USER_A, but the route param refers to USER_B
          const tokenForA = validToken(USER_A);
          const res = await request(app)
            [route.method](route.crossUserPath!)
            .set("Authorization", `Bearer ${tokenForA}`);
          expect(res.status).toBe(403);
        });
      }

      // ── 6. Authorised request passes JWT gate ────────────────────────────────
      it("does not return 401 or 403 when a valid matching token is provided", async () => {
        const res = await request(app)
          [route.method](route.path)
          .set("Authorization", `Bearer ${validToken(route.authorisedEmail)}`);
        // JWT gate is cleared; route logic may still return 4xx for other
        // reasons (e.g. 404 if the profile doesn't exist), but NOT 401/403.
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });

    });
  }

});

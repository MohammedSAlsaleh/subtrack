/**
 * SQL Injection test suite — Auth routes
 *
 * Endpoints covered:
 *   POST /api/auth/register        fields: email, passwordHash, name, userId
 *   POST /api/auth/login           fields: email, passwordHash
 *   POST /api/auth/forgot-password fields: email
 *   POST /api/auth/reset-password  fields: email, code, newPasswordHash
 *
 * Attack categories (see __tests__/sqli-payloads.ts for full list):
 *   tautology, UNION exfiltration, stacked queries, comment bypass,
 *   boolean-blind, null byte, oversized input
 *
 * Why Drizzle ORM prevents these attacks:
 *   Every user-supplied value is bound as a parameterised query parameter by
 *   node-postgres ($1, $2, …).  The payload is treated as a literal string —
 *   it can never alter the query structure or introduce extra SQL statements.
 *
 * Mock strategy:
 *   @workspace/db is fully mocked so no real PostgreSQL connection is needed.
 *   The mock exposes a fluent query-builder chain that is itself thenable;
 *   each test configures the result via mockDb.setResult().
 *   vi.hoisted() is used so the mockDb instance is available when vi.mock()'s
 *   factory runs (vi.mock calls are hoisted to the top of the file by vitest).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Database mock ─────────────────────────────────────────────────────────────
// vi.hoisted ensures mockDb exists before the hoisted vi.mock factory runs.
const mockDb = vi.hoisted(() => {
  type Resolve = (v: unknown) => unknown;
  type Reject  = (e: unknown) => unknown;

  return {
    _result: [] as unknown,
    _throws: false,
    setResult(r: unknown) { this._result = r; },
    setThrows(t: boolean) { this._throws = t; },
    reset()               { this._result = []; this._throws = false; },

    // Fluent chain — every method returns `this` so db.select().from()… works.
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

    // Thenable: `await db.select()…limit()` resolves to _result.
    then(resolve: Resolve, reject: Reject) {
      if (this._throws) return Promise.reject(new Error("DB error")).then(resolve, reject);
      return Promise.resolve(this._result).then(resolve, reject);
    },
  };
});

vi.mock("@workspace/db", () => ({
  db: mockDb,
  serverUsers: {
    email: "email",
    passwordHash: "password_hash",
    name: "name",
    userId: "user_id",
  },
  passwordResets: {
    email: "email",
    code: "code",
    expiresAt: "expires_at",
  },
  premiumEntitlements: { email: "email" },
  eq: vi.fn(),
}));

// ── App & payload fixture (imported AFTER mock is registered) ─────────────────
import app from "../app.js";
import { SQLI_PAYLOADS } from "./__tests__/sqli-payloads.js";

// ── Ensure SESSION_SECRET is set (needed by jwt.sign in auth routes) ──────────
process.env.SESSION_SECRET = "test-session-secret";

// ── Helper: assert response body contains no SQL error text ──────────────────
const SQL_ERROR_PATTERNS = [
  /syntax error/i,
  /unterminated quoted/i,
  /pg_/i,
  /server_users/i,
  /password_resets/i,
  /column\s+\S+\s+does not exist/i,
  /relation\s+"\S+"\s+does not exist/i,
  /ERROR:/,
  /FATAL:/,
  /42601/,   // PostgreSQL syntax-error SQLSTATE
  /42P01/,   // undefined table SQLSTATE
];

function assertNoSqlLeak(body: string) {
  for (const pat of SQL_ERROR_PATTERNS) {
    expect(body, `Response must not leak SQL error matching ${pat}`).not.toMatch(pat);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Auth routes — SQL injection", () => {

  beforeEach(() => {
    mockDb.reset();
    mockDb.select.mockClear();
    mockDb.from.mockClear();
    mockDb.where.mockClear();
    mockDb.limit.mockClear();
    mockDb.insert.mockClear();
    mockDb.values.mockClear();
    mockDb.onConflictDoUpdate.mockClear();
    mockDb.update.mockClear();
    mockDb.set.mockClear();
    mockDb.delete.mockClear();
  });

  // ── POST /api/auth/register ──────────────────────────────────────────────

  describe("POST /api/auth/register — email field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/register")
          .send({ email: payload, passwordHash: "hash123" });

        expect(res.status, "Must not return 500").not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("POST /api/auth/register — passwordHash field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: passwordHash="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/register")
          .send({ email: "user@example.com", passwordHash: payload });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("POST /api/auth/register — name field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: name="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/register")
          .send({ email: "user@example.com", passwordHash: "hash123", name: payload });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("POST /api/auth/register — userId field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: userId="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/register")
          .send({ email: "user@example.com", passwordHash: "hash123", userId: payload });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────────

  describe("POST /api/auth/login — email field (user not found)", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no JWT / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        // DB returns no matching user — payload must NOT cause a token to be issued
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/login")
          .send({ email: payload, passwordHash: "hash123" });

        expect(res.status).not.toBe(500);
        expect(res.body.token, "No JWT must be issued for missing user").toBeUndefined();
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("POST /api/auth/login — passwordHash field (hash mismatch)", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no JWT / no SQL leak: passwordHash="${payload.slice(0, 60)}"`, async () => {
        // DB returns a row whose stored hash differs from the payload
        mockDb.setResult([{
          email: "real@example.com",
          passwordHash: "correct-hash",
          name: "Real User",
          userId: "uid-1",
        }]);
        const res = await request(app)
          .post("/api/auth/login")
          .send({ email: "real@example.com", passwordHash: payload });

        expect(res.status).not.toBe(500);
        expect(res.body.token, "No JWT must be issued when hash does not match").toBeUndefined();
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  // ── POST /api/auth/forgot-password ────────────────────────────────────────

  describe("POST /api/auth/forgot-password — email field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/forgot-password")
          .send({ email: payload });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  // ── POST /api/auth/reset-password ─────────────────────────────────────────

  describe("POST /api/auth/reset-password — email field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const res = await request(app)
          .post("/api/auth/reset-password")
          .send({ email: payload, code: "123456", newPasswordHash: "newhash" });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("POST /api/auth/reset-password — code field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: code="${payload.slice(0, 60)}"`, async () => {
        // DB returns a reset record whose code differs from the payload
        mockDb.setResult([{
          email: "user@example.com",
          code: "999999",
          expiresAt: new Date(Date.now() + 60_000),
        }]);
        const res = await request(app)
          .post("/api/auth/reset-password")
          .send({ email: "user@example.com", code: payload, newPasswordHash: "newhash" });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("POST /api/auth/reset-password — newPasswordHash field", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: newPasswordHash="${payload.slice(0, 60)}"`, async () => {
        // DB returns a valid, non-expired reset record so the UPDATE path is exercised
        mockDb.setResult([{
          email: "user@example.com",
          code: "123456",
          expiresAt: new Date(Date.now() + 60_000),
        }]);
        const res = await request(app)
          .post("/api/auth/reset-password")
          .send({ email: "user@example.com", code: "123456", newPasswordHash: payload });

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

});

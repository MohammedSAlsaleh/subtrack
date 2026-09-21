/**
 * SQL Injection test suite — Premium routes
 *
 * Endpoints covered:
 *   GET    /api/premium/:email   — checks entitlement
 *   POST   /api/premium/:email   — grants premium (dev only)
 *   DELETE /api/premium/:email   — revokes premium (dev only)
 *
 * The :email URL parameter is the sole user-supplied value that reaches the
 * database on these routes.  Both URL-encoded and double-encoded forms are
 * tested to cover clients that encode inconsistently.
 *
 * Attack categories (see __tests__/sqli-payloads.ts for full list):
 *   tautology, UNION exfiltration, stacked queries, comment bypass,
 *   boolean-blind, null byte, oversized input
 *
 * Why Drizzle ORM prevents these attacks:
 *   Drizzle binds every parameter through node-postgres's $1/$2/… placeholders.
 *   The full :email string — including SQL metacharacters — is sent as a bound
 *   value, so the database never parses it as SQL syntax.
 *
 * JWT stub:
 *   Routes require a Bearer JWT whose subject matches :email.  We sign tokens
 *   with the test SESSION_SECRET so JWT auth passes and the mocked DB call is
 *   actually reached with the injected value.
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
  premiumEntitlements: { email: "email", isPremium: "is_premium" },
  serverUsers:   { email: "email" },
  passwordResets: { email: "email" },
  eq: vi.fn(),
}));

// ── App & payload fixture ─────────────────────────────────────────────────────
import app from "../app.js";
import { SQLI_PAYLOADS } from "./__tests__/sqli-payloads.js";

// ── JWT helpers ───────────────────────────────────────────────────────────────
const TEST_SECRET = "test-session-secret";
process.env.SESSION_SECRET = TEST_SECRET;
process.env.NODE_ENV = "test"; // enables POST/DELETE premium routes (non-production)

/** Sign a JWT whose subject is `email`, valid for 1 hour. */
function makeToken(email: string): string {
  return jwt.sign({ sub: email, email }, TEST_SECRET, { expiresIn: "1h" });
}

// ── Leak detector ─────────────────────────────────────────────────────────────
const SQL_ERROR_PATTERNS = [
  /syntax error/i,
  /unterminated quoted/i,
  /pg_/i,
  /premium_entitlements/i,
  /column\s+\S+\s+does not exist/i,
  /relation\s+"\S+"\s+does not exist/i,
  /ERROR:/,
  /FATAL:/,
  /42601/,
  /42P01/,
];

function assertNoSqlLeak(body: string) {
  for (const pat of SQL_ERROR_PATTERNS) {
    expect(body, `Response must not leak SQL error matching ${pat}`).not.toMatch(pat);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Premium routes — SQL injection", () => {

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

  // ── GET /api/premium/:email ────────────────────────────────────────────────

  describe("GET /api/premium/:email — URL-encoded payloads", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        // JWT sub matches the raw payload; route decodes the param and lowercases it
        const token = makeToken(payload.toLowerCase());

        const res = await request(app)
          .get(`/api/premium/${encodeURIComponent(payload)}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status, "Must not return 500").not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  describe("GET /api/premium/:email — double-encoded payloads", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak (double-encoded): email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        // Double-encode simulates a client that encodes an already-percent-encoded string
        const doubleEncoded = encodeURIComponent(encodeURIComponent(payload));
        const token = makeToken(payload.toLowerCase());

        const res = await request(app)
          .get(`/api/premium/${doubleEncoded}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  // ── POST /api/premium/:email ───────────────────────────────────────────────

  describe("POST /api/premium/:email — URL-encoded payloads", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const token = makeToken(payload.toLowerCase());

        const res = await request(app)
          .post(`/api/premium/${encodeURIComponent(payload)}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

  // ── DELETE /api/premium/:email ────────────────────────────────────────────

  describe("DELETE /api/premium/:email — URL-encoded payloads", () => {
    for (const payload of SQLI_PAYLOADS) {
      it(`no 500 / no SQL leak: email="${payload.slice(0, 60)}"`, async () => {
        mockDb.setResult([]);
        const token = makeToken(payload.toLowerCase());

        const res = await request(app)
          .delete(`/api/premium/${encodeURIComponent(payload)}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).not.toBe(500);
        assertNoSqlLeak(JSON.stringify(res.body));
      });
    }
  });

});

/**
 * Unit tests for health routes.
 *
 * GET /api/healthz — liveness probe (no DB, always 200)
 * GET /api/health  — readiness probe (checks DB, 200 when up, 503 when down)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Pool mock ─────────────────────────────────────────────────────────────────
// Mocked before the app module is imported so the health route's `pool.connect`
// call resolves to a controlled stub.
const mockPool = vi.hoisted(() => {
  const client = {
    query: vi.fn<() => Promise<void>>(),
    release: vi.fn(),
  };

  return {
    _clientOk: true,
    setClientOk(ok: boolean) { this._clientOk = ok; },

    connect: vi.fn(function (this: typeof mockPool) {
      if (this._clientOk) return Promise.resolve(client);
      return Promise.reject(Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" }));
    }),

    client,
  };
});

vi.mock("@workspace/db", () => ({
  pool: mockPool,
  // Other exports needed by auth/premium routes (imported transitively via app)
  db: {
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
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve([]).then(resolve, reject);
    },
  },
  serverUsers:         { email: "email", passwordHash: "password_hash", name: "name", userId: "user_id" },
  passwordResets:      { email: "email", code: "code", expiresAt: "expires_at" },
  premiumEntitlements: { email: "email", isPremium: "is_premium" },
  eq: vi.fn(),
}));

import app from "../app.js";
import { resetDbStats, getDbStats, withDbRetry } from "../lib/dbRetry.js";

process.env.SESSION_SECRET = "test-session-secret";

// Reset counters before each test so they don't bleed across tests.
beforeEach(() => {
  resetDbStats();
  mockPool.setClientOk(true);
  mockPool.client.query.mockReset();
  mockPool.client.release.mockReset();
});

// ── GET /api/healthz ──────────────────────────────────────────────────────────

describe("GET /api/healthz", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ── GET /api/health ───────────────────────────────────────────────────────────

describe("GET /api/health — DB reachable", () => {
  it("returns 200 with db:reachable and zero stats when the pool connects and query succeeds", async () => {
    mockPool.client.query.mockResolvedValueOnce(undefined);

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "reachable" });
    expect(res.body.stats).toEqual({ transientErrors: 0, retries: 0, responses503: 0 });
    expect(mockPool.client.query).toHaveBeenCalledWith("SELECT 1");
    expect(mockPool.client.release).toHaveBeenCalled();
  });
});

describe("GET /api/health — DB unreachable (connect fails)", () => {
  it("returns 503 with db:unreachable and increments responses503", async () => {
    mockPool.setClientOk(false);

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "degraded", db: "unreachable" });
    expect(res.body.stats.responses503).toBe(1);
  });
});

describe("GET /api/health — DB unreachable (query fails)", () => {
  it("returns 503 with db:unreachable when SELECT 1 throws", async () => {
    mockPool.client.query.mockRejectedValueOnce(new Error("connection reset by peer"));

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "degraded", db: "unreachable" });
    // release() must still be called even when the query throws
    expect(mockPool.client.release).toHaveBeenCalled();
  });
});

// ── Counter increment tests ───────────────────────────────────────────────────

describe("DB stability counters — withDbRetry", () => {
  it("increments transientErrors and retries after a simulated transient error", async () => {
    const transientErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    let calls = 0;

    // First call throws transiently; second call (the retry) succeeds.
    await withDbRetry(async () => {
      calls += 1;
      if (calls === 1) throw transientErr;
    }, 0 /* no delay in tests */);

    const stats = getDbStats();
    expect(stats.transientErrors).toBe(1);
    expect(stats.retries).toBe(1);
    expect(calls).toBe(2);
  });

  it("increments transientErrors once even when the retry also fails", async () => {
    const transientErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });

    await expect(
      withDbRetry(async () => { throw transientErr; }, 0),
    ).rejects.toThrow("Database temporarily unavailable");

    const stats = getDbStats();
    expect(stats.transientErrors).toBe(1);
    expect(stats.retries).toBe(1);
  });

  it("responses503 increments when /api/health returns 503", async () => {
    mockPool.setClientOk(false);

    await request(app).get("/api/health");
    await request(app).get("/api/health");

    expect(getDbStats().responses503).toBe(2);
  });

  it("stats appear in the /api/health response body after retries have occurred", async () => {
    // Fire a transient error through withDbRetry to bump the counters.
    const transientErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    let calls = 0;
    await withDbRetry(async () => {
      calls += 1;
      if (calls === 1) throw transientErr;
    }, 0);

    // Now query health while the DB is reachable — counters should be visible.
    mockPool.client.query.mockResolvedValueOnce(undefined);
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({ transientErrors: 1, retries: 1 });
  });
});

// ── Auth/Premium routes — 503 on transient DB error ───────────────────────────

describe("Auth routes — 503 on transient DB error", () => {
  it("POST /api/auth/register returns 503 when DB connection is reset", async () => {
    // Replace the mock db with one that throws transiently
    const { db } = await import("@workspace/db");
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    (db as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.reject(transient).then(resolve, reject);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@example.com", passwordHash: "hash" });

    // Restore
    (db as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve([]).then(resolve, reject);

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/temporarily unavailable/i);
  });
});

describe("Premium routes — 503 on transient DB error", () => {
  it("GET /api/premium/:email returns 503 when DB pool is exhausted", async () => {
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { sub: "user@example.com", email: "user@example.com" },
      "test-session-secret",
      { expiresIn: "1h" },
    );

    const { db } = await import("@workspace/db");
    const transient = Object.assign(new Error("too many clients already"), {});
    (db as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.reject(transient).then(resolve, reject);

    const res = await request(app)
      .get(`/api/premium/${encodeURIComponent("user@example.com")}`)
      .set("Authorization", `Bearer ${token}`);

    // Restore
    (db as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve([]).then(resolve, reject);

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/temporarily unavailable/i);
  });
});

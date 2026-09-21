/**
 * Integration tests for DB retry behaviour under realistic flap patterns.
 *
 * These tests go beyond the single-retry unit tests in dbRetry.test.ts by
 * simulating conditions that occur in production:
 *
 *   • DB flaps: pool fails for several calls then recovers on its own
 *   • Mid-burst recovery: some concurrent requests land during the outage,
 *     later ones land after recovery — the server never restarts
 *   • Pool exhaustion clears: pool rejects with "too many clients" then
 *     drains and starts accepting again
 *   • Correct HTTP status codes: 503 (not 500) during the outage window,
 *     200 after recovery
 *
 * No real Postgres instance is required.  A `FlappingPool` / `FlappingDb`
 * simulator provides the realistic, stateful failure surface.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { withDbRetry, TransientDbError } from "./dbRetry.js";

// ─── FlappingPool ─────────────────────────────────────────────────────────────
//
// Simulates a pg.Pool that can be put into a "failing" state (mimicking a DB
// blip) and recovered later.  Tracks call counts so tests can assert on exact
// retry behaviour.

class FlappingPool {
  private _failing = false;
  private _failCount = 0;
  private _successCount = 0;
  private _failError: Error = Object.assign(new Error("ECONNRESET"), {
    code: "ECONNRESET",
  });

  /** Remaining automatic recoveries: if > 0 the pool recovers after this many
   *  failing connect() calls. */
  private _autoRecoverAfter = 0;

  setFailing(err?: Error) {
    this._failing = true;
    if (err) this._failError = err;
  }

  setHealthy() {
    this._failing = false;
    this._autoRecoverAfter = 0;
  }

  /** Pool will fail for `calls` connect() calls then auto-recover. */
  flap(calls: number, err?: Error) {
    this.setFailing(err);
    this._autoRecoverAfter = calls;
  }

  get failCount() {
    return this._failCount;
  }
  get successCount() {
    return this._successCount;
  }

  async connect(): Promise<{ query: () => Promise<void>; release: () => void }> {
    if (this._failing) {
      this._failCount++;
      if (this._autoRecoverAfter > 0) {
        this._autoRecoverAfter--;
        if (this._autoRecoverAfter === 0) this._failing = false;
      }
      throw this._failError;
    }
    this._successCount++;
    return {
      query: async () => {},
      release: () => {},
    };
  }

  resetCounters() {
    this._failCount = 0;
    this._successCount = 0;
  }
}

// ─── FlappingDb ───────────────────────────────────────────────────────────────
//
// Simulates a drizzle-orm-style `db` object whose query chain either resolves
// or throws with a transient error, controlled per-test.

class FlappingDb {
  private _failing = false;
  private _failError: Error = Object.assign(new Error("too many clients already"), {});
  private _callCount = 0;
  private _autoRecoverAfter = 0;

  setFailing(err?: Error) {
    this._failing = true;
    if (err) this._failError = err;
  }

  setHealthy() {
    this._failing = false;
    this._autoRecoverAfter = 0;
  }

  flap(calls: number, err?: Error) {
    this.setFailing(err);
    this._autoRecoverAfter = calls;
  }

  get callCount() {
    return this._callCount;
  }

  private _maybeThrow() {
    this._callCount++;
    if (this._failing) {
      if (this._autoRecoverAfter > 0) {
        this._autoRecoverAfter--;
        if (this._autoRecoverAfter === 0) this._failing = false;
      }
      throw this._failError;
    }
  }

  // Drizzle-style chainable query builder
  select() { return this; }
  from()   { return this; }
  where()  { return this; }
  limit()  { return this; }
  insert() { return this; }
  values() { return this; }
  onConflictDoUpdate() { return this; }
  update() { return this; }
  set()    { return this; }
  delete() { return this; }

  then(
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown,
  ): Promise<unknown> {
    try {
      this._maybeThrow();
      return Promise.resolve([]).then(resolve, reject);
    } catch (err) {
      return Promise.reject(err).then(resolve, reject);
    }
  }
}

// ─── withDbRetry — back-off strategy integration tests ───────────────────────
//
// These tests verify that the back-off strategy option works correctly under
// realistic pool-exhaustion scenarios.  All use baseMs: 0 so no real delays
// are incurred, but the strategy selection and delay computation are exercised
// end-to-end through withDbRetry.

describe("withDbRetry — back-off strategy option", () => {
  it("fixed strategy (explicit): behaves identically to the default one-retry path", async () => {
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const fn = vi.fn()
      .mockRejectedValueOnce(transient)
      .mockResolvedValueOnce("fixed-ok");

    const result = await withDbRetry(fn, 0, { kind: "fixed" });
    expect(result).toBe("fixed-ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exponential strategy: succeeds on retry when pool recovers during the (zero) back-off", async () => {
    const pool = new FlappingPool();
    // flap(1): fails on the first connect() call, auto-recovers after that
    pool.flap(1);

    // The first attempt fails; the back-off fires (0 ms here); the retry sees
    // a healthy pool and succeeds.
    const result = await withDbRetry(
      () => pool.connect() as Promise<unknown>,
      0,
      { kind: "exponential", baseMs: 0 },
    );

    expect(result).toBeDefined();
    expect(pool.failCount).toBe(1);
    expect(pool.successCount).toBe(1);
  });

  it("exponential strategy: throws TransientDbError when pool stays exhausted through retry", async () => {
    const pool = new FlappingPool();
    pool.setFailing(Object.assign(new Error("too many clients already"), {}));

    await expect(
      withDbRetry(
        () => pool.connect() as Promise<unknown>,
        0,
        { kind: "exponential", baseMs: 0 },
      ),
    ).rejects.toBeInstanceOf(TransientDbError);

    expect(pool.failCount).toBe(2);
  });

  it("exponential strategy: non-transient errors are still re-thrown immediately without retry", async () => {
    const appErr = new Error("relation does not exist");
    const fn = vi.fn().mockRejectedValue(appErr);

    const thrown = await withDbRetry(
      fn,
      0,
      { kind: "exponential", baseMs: 0 },
    ).catch((e) => e);

    expect(thrown).toBe(appErr);
    expect(thrown).not.toBeInstanceOf(TransientDbError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exponential strategy applies a longer delay than fixed for the same base (timing assertion)", async () => {
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const callTimes: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
      throw transient;
    });

    const baseMs = 40;
    // exponential: delay = baseMs * 2^1 = 80 ms, which is > fixed 40 ms
    await expect(
      withDbRetry(fn, baseMs, { kind: "exponential", baseMs }),
    ).rejects.toBeInstanceOf(TransientDbError);

    expect(fn).toHaveBeenCalledTimes(2);
    // Gap must be at least baseMs*2 (the exponential delay for attempt 1)
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(baseMs * 2);
  });

  it("exponential+jitter: retry fires within the expected window", async () => {
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const callTimes: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
      throw transient;
    });

    const baseMs = 60;
    const maxJitter = baseMs * 2; // 120 ms

    await expect(
      withDbRetry(fn, baseMs, { kind: "exponential", baseMs, jitter: true }),
    ).rejects.toBeInstanceOf(TransientDbError);

    expect(fn).toHaveBeenCalledTimes(2);
    // Jittered delay must be in [0, baseMs*2]
    const gap = callTimes[1] - callTimes[0];
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(maxJitter + 20); // +20 ms scheduling slack
  });

  it("exponential strategy: concurrent pool-exhaustion wave all receive TransientDbError", async () => {
    const pool = new FlappingPool();
    pool.setFailing(Object.assign(new Error("too many clients already"), {}));

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        withDbRetry(
          () => pool.connect() as Promise<unknown>,
          0,
          { kind: "exponential", baseMs: 0 },
        ),
      ),
    );

    for (const r of results) {
      expect(r.status).toBe("rejected");
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(TransientDbError);
    }
    // Each of the 8 calls should have made exactly 2 connect() attempts
    expect(pool.failCount).toBe(16);
  });

  it("exponential strategy: pool-exhaustion clears — outage wave fails, recovery wave succeeds", async () => {
    const db = new FlappingDb();

    // Phase 1 — sustained outage
    db.setFailing(Object.assign(new Error("too many clients already"), {}));
    const outageWave = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        withDbRetry(
          () => db as unknown as Promise<unknown>,
          0,
          { kind: "exponential", baseMs: 0 },
        ),
      ),
    );

    // Phase 2 — recovery (same process, no restart)
    db.setHealthy();
    const recoveryWave = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        withDbRetry(
          () => db as unknown as Promise<unknown>,
          0,
          { kind: "exponential", baseMs: 0 },
        ),
      ),
    );

    // Outage wave: all rejected as TransientDbError
    for (const r of outageWave) {
      expect(r.status).toBe("rejected");
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(TransientDbError);
    }

    // Recovery wave: all fulfilled
    for (const r of recoveryWave) {
      expect(r.status).toBe("fulfilled");
    }
  });
});

// ─── withDbRetry — flap-pattern tests ────────────────────────────────────────
//
// These tests drive withDbRetry directly with a stateful `fn` that mirrors
// what a pg query would do under repeated flaps.

describe("withDbRetry — DB flaps repeatedly", () => {
  it("succeeds when the DB recovers before the retry fires", async () => {
    // fn fails on first call (transient), succeeds on second (retry)
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls === 1) {
        throw Object.assign(new Error("connection terminated unexpectedly"), {});
      }
      return "recovered";
    };

    const result = await withDbRetry(fn, 0);
    expect(result).toBe("recovered");
    expect(calls).toBe(2);
  });

  it("throws TransientDbError (not a plain Error) when both attempts fail", async () => {
    const err = Object.assign(new Error("pool is draining"), {});
    const fn = vi.fn().mockRejectedValue(err);

    const thrown = await withDbRetry(fn, 0).catch((e) => e);
    expect(thrown).toBeInstanceOf(TransientDbError);
    // Inner cause must be the original transient error, not a generic Error
    expect((thrown as TransientDbError).cause).toBe(err);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("surfaces a non-transient error immediately — no retry attempt", async () => {
    const appErr = new Error("syntax error at or near SELECT");
    let calls = 0;
    const fn = async () => {
      calls++;
      throw appErr;
    };

    const thrown = await withDbRetry(fn, 0).catch((e) => e);
    expect(thrown).toBe(appErr);
    // Must NOT be wrapped; caller needs to distinguish 500 from 503
    expect(thrown).not.toBeInstanceOf(TransientDbError);
    expect(calls).toBe(1);
  });

  it("handles a pool-exhaustion flap: fails twice then recovers on third call", async () => {
    const exhausted = Object.assign(new Error("too many clients already"), {});
    let calls = 0;

    // Simulate: first two withDbRetry attempts exhaust the pool; third succeeds.
    // Each withDbRetry call issues up to 2 fn() calls — here we simulate two
    // consecutive withDbRetry invocations where the first always fails both
    // attempts and the second succeeds on its first try.
    const fn = async () => {
      calls++;
      if (calls < 3) throw exhausted;
      return "pool drained";
    };

    // First call: both attempts fail → TransientDbError
    await expect(withDbRetry(fn, 0)).rejects.toBeInstanceOf(TransientDbError);
    expect(calls).toBe(2);

    // Second call (simulates the next request after pool drains): succeeds
    const result = await withDbRetry(fn, 0);
    expect(result).toBe("pool drained");
    expect(calls).toBe(3);
  });

  it("handles a sustained burst of 10 concurrent calls during an outage — all get TransientDbError", async () => {
    const connErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const fn = vi.fn().mockRejectedValue(connErr);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => withDbRetry(fn, 0)),
    );

    for (const r of results) {
      expect(r.status).toBe("rejected");
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(TransientDbError);
    }
    // Each of the 10 calls should have attempted exactly 2 fn() invocations
    expect(fn).toHaveBeenCalledTimes(20);
  });

  it("recovers mid-burst: outage wave gets TransientDbError, recovery wave succeeds — same process", async () => {
    const flap = new FlappingPool();

    // ── Phase 1: sustained outage — pool rejects indefinitely ────────────────
    flap.setFailing(Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" }));

    // All first-wave requests land during the outage; withDbRetry exhausts
    // both attempts and gives up → every promise rejects with TransientDbError.
    const outageWave = await Promise.allSettled(
      Array.from({ length: 5 }, () => withDbRetry(() => flap.connect(), 0)),
    );

    // ── Phase 2: DB recovers — no server restart ──────────────────────────────
    flap.setHealthy();

    // Second wave hits after recovery; all should succeed without restarting.
    const recoveryWave = await Promise.allSettled(
      Array.from({ length: 5 }, () => withDbRetry(() => flap.connect(), 0)),
    );

    // Outage wave: all 5 rejected, all as TransientDbError (not plain Error)
    expect(outageWave.every((r) => r.status === "rejected")).toBe(true);
    for (const r of outageWave) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(TransientDbError);
    }

    // Recovery wave: all 5 fulfilled — same in-process pool, no restart
    expect(recoveryWave.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("resumes 200-equivalent results without restarting — recovery is in-process", async () => {
    // Simulates the guarantee: no server restart needed after DB recovers.
    let healthy = false;
    let calls = 0;
    const fn = async () => {
      calls++;
      if (!healthy) {
        throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
      }
      return `row-${calls}`;
    };

    // Phase 1 — outage: both attempts fail
    const phase1 = await withDbRetry(fn, 0).catch((e) => e);
    expect(phase1).toBeInstanceOf(TransientDbError);

    // DB recovers — no server restart
    healthy = true;

    // Phase 2 — recovery: same fn, same process, now succeeds
    const phase2 = await withDbRetry(fn, 0);
    expect(phase2).toMatch(/^row-/);
  });
});

// ─── HTTP layer — 503 vs 200 under flap patterns ─────────────────────────────
//
// These tests drive the Express app through supertest to verify that the HTTP
// status codes are correct (503, not 500) during an outage and that the server
// serves 200 after recovery without a restart.

// ── Pool mock (shared across HTTP tests) ─────────────────────────────────────
// vi.mock factories are hoisted before any module-level code, including class
// declarations.  vi.hoisted() runs even earlier, so we define the simulator
// instances inline there — the test code below can still reference them via
// the destructured names.

const { flappingDb, flappingPool } = vi.hoisted(() => {
  // ── inline FlappingPool ────────────────────────────────────────────────────
  let poolFailing = false;
  let poolFailError: Error = Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" });
  let poolFailCount = 0;
  let poolSuccessCount = 0;
  let poolAutoRecover = 0;

  const flappingPool = {
    setFailing(err?: Error) {
      poolFailing = true;
      if (err) poolFailError = err;
    },
    setHealthy() {
      poolFailing = false;
      poolAutoRecover = 0;
    },
    flap(calls: number, err?: Error) {
      poolFailing = true;
      if (err) poolFailError = err;
      poolAutoRecover = calls;
    },
    get failCount() { return poolFailCount; },
    get successCount() { return poolSuccessCount; },
    resetCounters() {
      poolFailCount = 0;
      poolSuccessCount = 0;
    },
    async connect() {
      if (poolFailing) {
        poolFailCount++;
        if (poolAutoRecover > 0) {
          poolAutoRecover--;
          if (poolAutoRecover === 0) poolFailing = false;
        }
        throw poolFailError;
      }
      poolSuccessCount++;
      return { query: async () => {}, release: () => {} };
    },
  };

  // ── inline FlappingDb ──────────────────────────────────────────────────────
  let dbFailing = false;
  let dbFailError: Error = Object.assign(new Error("too many clients already"), {});
  let dbAutoRecover = 0;

  const flappingDb = {
    setFailing(err?: Error) {
      dbFailing = true;
      if (err) dbFailError = err;
    },
    setHealthy() {
      dbFailing = false;
      dbAutoRecover = 0;
    },
    flap(calls: number, err?: Error) {
      dbFailing = true;
      if (err) dbFailError = err;
      dbAutoRecover = calls;
    },
    select() { return this; },
    from()   { return this; },
    where()  { return this; },
    limit()  { return this; },
    insert() { return this; },
    values() { return this; },
    onConflictDoUpdate() { return this; },
    update() { return this; },
    set()    { return this; },
    delete() { return this; },
    then(
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ): Promise<unknown> {
      if (dbFailing) {
        const err = dbFailError;
        if (dbAutoRecover > 0) {
          dbAutoRecover--;
          if (dbAutoRecover === 0) dbFailing = false;
        }
        return Promise.reject(err).then(resolve, reject);
      }
      return Promise.resolve([]).then(resolve, reject);
    },
  };

  return { flappingDb, flappingPool };
});

vi.mock("@workspace/db", () => ({
  pool: flappingPool,
  db: flappingDb,
  serverUsers:         { email: "email", passwordHash: "password_hash", name: "name", userId: "user_id" },
  passwordResets:      { email: "email", code: "code", expiresAt: "expires_at" },
  premiumEntitlements: { email: "email", isPremium: "is_premium" },
  eq: vi.fn(),
}));

// ── OpenAI mock (agent route) ─────────────────────────────────────────────────
// The agent route has no DB calls; it only streams via OpenAI.  We mock the
// OpenAI client so the integration tests stay self-contained and never need a
// real API key.

vi.mock("@workspace/integrations-openai-ai-server", () => {
  // Each call to create() must return a fresh async-iterable stream so that
  // supertest requests across multiple tests each get their own iterator.
  const create = vi.fn().mockImplementation(async () =>
    (async function* () {
      yield { choices: [{ delta: { content: "Hi" } }] };
      yield { choices: [{ delta: {} }] };
    })(),
  );
  return { openai: { chat: { completions: { create } } } };
});

import app from "../app.js";

process.env.SESSION_SECRET = "integration-test-secret";

describe("HTTP — 503 (not 500) during DB outage, 200 after recovery (no restart)", () => {
  beforeEach(() => {
    flappingDb.setHealthy();
    flappingPool.setHealthy();
    flappingPool.resetCounters();
  });

  it("POST /api/auth/register returns 503 during pool exhaustion, then 201 after recovery", async () => {
    // ── Phase 1: outage ───────────────────────────────────────────────────────
    flappingDb.setFailing(
      Object.assign(new Error("too many clients already"), {}),
    );

    const outageRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "flap@example.com", passwordHash: "h1" });

    expect(outageRes.status).toBe(503);
    expect(outageRes.body.error).toMatch(/temporarily unavailable/i);

    // ── Phase 2: recovery (same process, no restart) ──────────────────────────
    flappingDb.setHealthy();

    const recoveryRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "flap@example.com", passwordHash: "h1" });

    // 201 (or 200 if idempotent) — not 503 and not 500
    expect([200, 201]).toContain(recoveryRes.status);
  });

  it("POST /api/auth/login returns 503 on ECONNRESET, then 401 (normal flow) after recovery", async () => {
    const connErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    flappingDb.setFailing(connErr);

    const outageRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", passwordHash: "h1" });

    expect(outageRes.status).toBe(503);
    // Must be the 503 message, not a generic 500 crash message
    expect(outageRes.body.error).toMatch(/temporarily unavailable/i);

    // Recover
    flappingDb.setHealthy();

    const recoveryRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", passwordHash: "h1" });

    // DB now healthy → gets a real response (401 because user doesn't exist in mock)
    expect(recoveryRes.status).not.toBe(503);
    expect(recoveryRes.status).not.toBe(500);
  });

  it("GET /api/health returns 503 on connect failure, then 200 after recovery (pool-level)", async () => {
    // health route bypasses withDbRetry and hits pool.connect() directly
    flappingPool.setFailing(
      Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" }),
    );

    const outageRes = await request(app).get("/api/health");
    expect(outageRes.status).toBe(503);
    expect(outageRes.body).toMatchObject({ status: "degraded", db: "unreachable" });
    expect(flappingPool.failCount).toBeGreaterThanOrEqual(1);

    // Pool recovers
    flappingPool.setHealthy();

    const recoveryRes = await request(app).get("/api/health");
    expect(recoveryRes.status).toBe(200);
    expect(recoveryRes.body).toMatchObject({ status: "ok", db: "reachable" });
    expect(flappingPool.successCount).toBeGreaterThanOrEqual(1);
  });

  it("concurrent requests during outage all get 503, concurrent requests after recovery all get non-503", async () => {
    flappingDb.setFailing(
      Object.assign(new Error("remaining connection slots are reserved"), {}),
    );

    // Fire 5 concurrent register requests during the outage
    const outageResults = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post("/api/auth/register")
          .send({ email: `burst${i}@example.com`, passwordHash: "h" }),
      ),
    );

    for (const res of outageResults) {
      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/temporarily unavailable/i);
    }

    // DB recovers — no server restart
    flappingDb.setHealthy();

    // Fire 5 more concurrent requests after recovery
    const recoveryResults = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post("/api/auth/register")
          .send({ email: `burst${i}@example.com`, passwordHash: "h" }),
      ),
    );

    for (const res of recoveryResults) {
      expect(res.status).not.toBe(503);
      expect(res.status).not.toBe(500);
    }
  });

  it("server-closed-connection error (string pattern) maps to 503, not 500", async () => {
    flappingDb.setFailing(new Error("server closed the connection unexpectedly"));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "close@example.com", passwordHash: "h" });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/temporarily unavailable/i);
  });

  it("pool-is-draining error maps to 503, not 500", async () => {
    flappingDb.setFailing(new Error("pool is draining"));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "drain@example.com", passwordHash: "h" });

    expect(res.status).toBe(503);
  });

  it("non-transient DB error (constraint violation) maps to 500, not 503", async () => {
    // Ensures the 503/500 distinction is not lost after a recovery cycle
    flappingDb.setFailing(new Error("duplicate key value violates unique constraint"));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@example.com", passwordHash: "h" });

    // Non-transient errors must not be masqueraded as 503
    expect(res.status).toBe(500);
  });
});

// ─── Agent route — DB flap audit ─────────────────────────────────────────────
//
// Audit finding: artifacts/api-server/src/routes/agent.ts contains NO database
// calls.  The route builds a system prompt from request-body data and streams
// the OpenAI response over SSE.  Because the DB is never touched, a transient
// DB connection error cannot reach this route and therefore cannot produce a
// 500 or 503 from the DB layer.
//
// These tests confirm that invariant:
//   • During a sustained DB outage the agent endpoint still returns 200 (SSE).
//   • After DB recovery the endpoint continues to return 200.
//   • No path through the agent route returns 500 for a transient DB error.

const AGENT_BODY = {
  messages: [{ role: "user", content: "What is my biggest expense?" }],
  context: {
    income: 10000,
    monthlySubTotal: 200,
    monthlyBillTotal: 500,
    monthlyLoanPayments: 300,
    totalDebt: 5000,
    language: "en",
    subscriptions: [{ name: "Netflix", amount: 50, status: "active", category: "Entertainment" }],
    bills: [{ name: "Electricity", amount: 300, dueDayOfMonth: 1, category: "Utilities" }],
    loans: [],
  },
};

describe("HTTP — agent route is unaffected by DB flap (no DB calls)", () => {
  beforeEach(() => {
    flappingDb.setHealthy();
    flappingPool.setHealthy();
    flappingPool.resetCounters();
  });

  it("POST /api/agent/chat returns 200 SSE during a sustained DB outage", async () => {
    // Put the DB into a hard-failing state simulating ECONNRESET
    flappingDb.setFailing(
      Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" }),
    );

    const res = await request(app)
      .post("/api/agent/chat")
      .send(AGENT_BODY);

    // SSE endpoints always open with 200; the agent route touches no DB so the
    // outage is invisible to it — must never downgrade to 503 or crash to 500.
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(500);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
  });

  it("POST /api/agent/chat returns 200 SSE during pool-exhaustion outage", async () => {
    flappingPool.setFailing(
      Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" }),
    );

    const res = await request(app)
      .post("/api/agent/chat")
      .send(AGENT_BODY);

    expect(res.status).toBe(200);
    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(500);
  });

  it("POST /api/agent/chat continues to return 200 after DB recovers — no restart needed", async () => {
    // Phase 1: outage
    flappingDb.setFailing(new Error("server closed the connection unexpectedly"));

    const outageRes = await request(app)
      .post("/api/agent/chat")
      .send(AGENT_BODY);

    expect(outageRes.status).toBe(200);

    // Phase 2: recovery — same process, no restart
    flappingDb.setHealthy();

    const recoveryRes = await request(app)
      .post("/api/agent/chat")
      .send(AGENT_BODY);

    expect(recoveryRes.status).toBe(200);
    expect(recoveryRes.status).not.toBe(503);
    expect(recoveryRes.status).not.toBe(500);
  });

  it("SSE response body contains a done event — no DB error leaks into the stream", async () => {
    // DB is failing; the stream must complete normally since agent never queries it.
    flappingDb.setFailing(
      Object.assign(new Error("too many clients already"), {}),
    );

    const res = await request(app)
      .post("/api/agent/chat")
      .send(AGENT_BODY);

    expect(res.status).toBe(200);
    // The SSE body must contain the final "done" sentinel, not a DB error message.
    expect(res.text).toContain('"done":true');
    expect(res.text).not.toMatch(/temporarily unavailable/i);
    expect(res.text).not.toMatch(/ECONNRESET|too many clients/i);
  });
});

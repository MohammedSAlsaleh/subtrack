/**
 * Unit tests for dbRetry — transient error detection and one-shot retry.
 *
 * Covers:
 *   isTransient()    — recognises OS error codes and pg message patterns
 *   withDbRetry()    — succeeds on first attempt, retries on transient error,
 *                      throws TransientDbError when retry also fails,
 *                      re-throws immediately for non-transient errors
 *
 * All tests use retryDelayMs = 0 so no timer mocking is needed.
 */

import { describe, it, expect, vi } from "vitest";
import { isTransient, withDbRetry, TransientDbError, computeBackoff, BackoffStrategy } from "./dbRetry";

// ── isTransient ────────────────────────────────────────────────────────────────

describe("isTransient", () => {
  it("returns false for non-Error values", () => {
    expect(isTransient(null)).toBe(false);
    expect(isTransient("string error")).toBe(false);
    expect(isTransient(42)).toBe(false);
  });

  it("returns false for a plain application error", () => {
    expect(isTransient(new Error("column does not exist"))).toBe(false);
    expect(isTransient(new Error("duplicate key value violates unique constraint"))).toBe(false);
  });

  const transientCodes = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH"];
  for (const code of transientCodes) {
    it(`returns true for OS error code ${code}`, () => {
      const err = Object.assign(new Error("network error"), { code });
      expect(isTransient(err)).toBe(true);
    });
  }

  const transientMessages = [
    "timeout exceeded when trying to connect",
    "connection terminated unexpectedly",
    "connection reset by peer",
    "pool is draining",
    "pool is full",
    "pool is closed",
    "too many clients already",
    "remaining connection slots are reserved for replication",
    "connection refused",
    "server closed the connection",
    "ECONNRESET mentioned in message",
    "ETIMEDOUT mentioned in message",
  ];
  for (const msg of transientMessages) {
    it(`returns true for message containing "${msg.split(" ")[0]}"`, () => {
      expect(isTransient(new Error(msg))).toBe(true);
    });
  }
});

// ── withDbRetry ────────────────────────────────────────────────────────────────

describe("withDbRetry", () => {
  it("returns the result when the first attempt succeeds", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withDbRetry(fn, 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once after a transient error and returns the value if retry succeeds", async () => {
    const transient = Object.assign(new Error("connection reset by peer"), { code: "ECONNRESET" });
    const fn = vi.fn()
      .mockRejectedValueOnce(transient)
      .mockResolvedValueOnce("recovered");

    const result = await withDbRetry(fn, 0);

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws TransientDbError when both attempts fail with transient errors", async () => {
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const fn = vi.fn().mockRejectedValue(transient);

    await expect(withDbRetry(fn, 0)).rejects.toBeInstanceOf(TransientDbError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("re-throws non-transient errors immediately without retrying", async () => {
    const appErr = new Error("duplicate key value violates unique constraint");
    const fn = vi.fn().mockRejectedValue(appErr);

    await expect(withDbRetry(fn, 0)).rejects.toBe(appErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("TransientDbError exposes the underlying cause from the retry attempt", async () => {
    const cause = Object.assign(new Error("pool is draining"), { code: "EPIPE" });
    const fn = vi.fn().mockRejectedValue(cause);

    try {
      await withDbRetry(fn, 0);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TransientDbError);
      expect((err as TransientDbError).cause).toBe(cause);
    }
  });

  it("does not retry when first error is non-transient even if second would succeed", async () => {
    const appErr = new Error("relation does not exist");
    const fn = vi.fn()
      .mockRejectedValueOnce(appErr)
      .mockResolvedValueOnce("should not reach here");

    await expect(withDbRetry(fn, 0)).rejects.toBe(appErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies the retry delay before the second attempt", async () => {
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const callTimes: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
      throw transient;
    });

    const delayMs = 50;
    await expect(withDbRetry(fn, delayMs)).rejects.toBeInstanceOf(TransientDbError);

    expect(fn).toHaveBeenCalledTimes(2);
    // The gap between the two calls must be at least the configured delay.
    // Allow 5 ms of scheduling slack to avoid spurious failures on loaded CI runners.
    const slack = 5;
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(delayMs - slack);
  });

  it("accepts an explicit fixed strategy and behaves identically to the default", async () => {
    const transient = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const fn = vi.fn()
      .mockRejectedValueOnce(transient)
      .mockResolvedValueOnce("recovered");

    const result = await withDbRetry(fn, 0, { kind: "fixed" });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("accepts an exponential strategy and retries successfully when DB recovers during the back-off", async () => {
    const transient = Object.assign(new Error("connection reset by peer"), {});
    const fn = vi.fn()
      .mockRejectedValueOnce(transient)
      .mockResolvedValueOnce("recovered-after-backoff");

    const result = await withDbRetry(fn, 0, { kind: "exponential", baseMs: 0 });
    expect(result).toBe("recovered-after-backoff");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exponential strategy still throws TransientDbError when both attempts fail", async () => {
    const transient = Object.assign(new Error("too many clients already"), {});
    const fn = vi.fn().mockRejectedValue(transient);

    await expect(
      withDbRetry(fn, 0, { kind: "exponential", baseMs: 0 }),
    ).rejects.toBeInstanceOf(TransientDbError);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ── computeBackoff ─────────────────────────────────────────────────────────────

describe("computeBackoff", () => {
  it("fixed strategy returns retryDelayMs unchanged for any attempt", () => {
    expect(computeBackoff(200, { kind: "fixed" }, 1)).toBe(200);
    expect(computeBackoff(500, { kind: "fixed" }, 1)).toBe(500);
    expect(computeBackoff(0, { kind: "fixed" }, 1)).toBe(0);
    // attempt number doesn't affect fixed
    expect(computeBackoff(200, { kind: "fixed" }, 5)).toBe(200);
  });

  it("exponential strategy doubles baseMs for attempt 1 (base * 2^1)", () => {
    expect(computeBackoff(100, { kind: "exponential", baseMs: 100 }, 1)).toBe(200);
    expect(computeBackoff(0,   { kind: "exponential", baseMs: 500 }, 1)).toBe(1000);
  });

  it("exponential strategy falls back to retryDelayMs when baseMs is omitted", () => {
    // baseMs defaults to retryDelayMs → delay = retryDelayMs * 2^attempt
    expect(computeBackoff(100, { kind: "exponential" }, 1)).toBe(200);
    expect(computeBackoff(250, { kind: "exponential" }, 1)).toBe(500);
  });

  it("exponential strategy caps at maxMs", () => {
    expect(computeBackoff(0, { kind: "exponential", baseMs: 10_000, maxMs: 500 }, 1)).toBe(500);
    expect(computeBackoff(0, { kind: "exponential", baseMs: 100, maxMs: 150 }, 1)).toBe(150);
  });

  it("exponential strategy defaults maxMs to 30 000 ms", () => {
    // 20000 * 2^1 = 40000 > 30000 → capped at 30000
    expect(computeBackoff(0, { kind: "exponential", baseMs: 20_000 }, 1)).toBe(30_000);
  });

  it("exponential+jitter: delay is within [0, computed] inclusive", () => {
    const computed = 200; // baseMs:100 * 2^1
    for (let i = 0; i < 20; i++) {
      const delay = computeBackoff(0, { kind: "exponential", baseMs: 100, jitter: true }, 1);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(computed);
    }
  });

  it("exponential without jitter is deterministic for the same inputs", () => {
    const a = computeBackoff(100, { kind: "exponential", baseMs: 100 }, 1);
    const b = computeBackoff(100, { kind: "exponential", baseMs: 100 }, 1);
    expect(a).toBe(b);
    expect(a).toBe(200);
  });

  it("exponential strategy grows with attempt number", () => {
    const attempt1 = computeBackoff(0, { kind: "exponential", baseMs: 100 }, 1);
    const attempt2 = computeBackoff(0, { kind: "exponential", baseMs: 100 }, 2);
    const attempt3 = computeBackoff(0, { kind: "exponential", baseMs: 100 }, 3);
    // 200 < 400 < 800
    expect(attempt1).toBeLessThan(attempt2);
    expect(attempt2).toBeLessThan(attempt3);
  });

  it("exponential with baseMs: 0 always produces delay of 0", () => {
    expect(computeBackoff(0, { kind: "exponential", baseMs: 0 }, 1)).toBe(0);
    expect(computeBackoff(0, { kind: "exponential", baseMs: 0, jitter: true }, 1)).toBe(0);
  });
});

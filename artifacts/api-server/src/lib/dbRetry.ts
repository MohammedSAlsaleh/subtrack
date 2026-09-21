/**
 * dbRetry — transient-error detection and one-shot retry for DB calls.
 *
 * Transient errors are those caused by temporary infrastructure problems
 * (connection resets, pool exhaustion, timeouts) rather than by invalid
 * queries or application bugs.  When a transient error is detected the
 * operation is retried once after a back-off delay; if it fails again a
 * `TransientDbError` is thrown so the caller can return 503.
 *
 * Back-off strategies
 * -------------------
 * The optional `backoff` argument selects the delay algorithm used before the
 * single retry attempt.
 *
 *   { kind: 'fixed' }                  — wait exactly `retryDelayMs` (default)
 *   { kind: 'exponential', ... }       — wait baseMs * 2^attempt, capped at
 *                                        maxMs; add full-jitter when jitter:true
 *
 * The default behaviour (200 ms fixed, one retry) is unchanged so all
 * existing call sites continue to work without modification.
 */

/** Error codes from the OS / node-postgres that indicate a transient fault. */
const TRANSIENT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
]);

/** Patterns found in pg / node-postgres error messages for transient faults. */
const TRANSIENT_MESSAGE_PATTERNS = [
  /timeout exceeded when trying to connect/i,
  /connection terminated/i,
  /connection reset/i,
  /pool is (draining|full|closed)/i,
  /too many clients/i,
  /remaining connection slots are reserved/i,
  /connection refused/i,
  /server closed the connection/i,
  /ECONNRESET/,
  /ETIMEDOUT/,
];

/** Sentinel thrown when a DB call still fails after the automatic retry. */
export class TransientDbError extends Error {
  readonly cause: unknown;
  constructor(cause: unknown) {
    super("Database temporarily unavailable");
    this.name = "TransientDbError";
    this.cause = cause;
  }
}

// ── Back-off strategy ─────────────────────────────────────────────────────────

/**
 * Describes how `withDbRetry` should compute the wait before the retry.
 *
 * - `{ kind: 'fixed' }` — wait exactly `retryDelayMs` (the second argument to
 *   `withDbRetry`).  This is the default and preserves existing behaviour.
 *
 * - `{ kind: 'exponential', baseMs?, maxMs?, jitter? }` — compute
 *   `delay = baseMs * 2^attempt` capped at `maxMs`.  When `jitter` is true the
 *   actual delay is a uniformly-random value in `[0, delay]` (full-jitter),
 *   which spreads thundering-herd retries across time.
 *
 *   Defaults: `baseMs = retryDelayMs`, `maxMs = 30 000`, `jitter = false`.
 */
export type BackoffStrategy =
  | { kind: "fixed" }
  | {
      kind: "exponential";
      /** Base delay in ms. Defaults to `retryDelayMs`. */
      baseMs?: number;
      /** Maximum delay cap in ms. Defaults to 30 000. */
      maxMs?: number;
      /** When true, add full jitter: actual delay ∈ [0, computed]. */
      jitter?: boolean;
    };

/**
 * Compute the back-off delay for the given retry `attempt` (1-based).
 *
 * Exported for testing; not part of the public API surface.
 *
 * @param retryDelayMs  The fixed-delay baseline (passed to `withDbRetry`).
 * @param backoff       The chosen strategy.
 * @param attempt       The retry attempt number (1 = first retry).
 */
export function computeBackoff(
  retryDelayMs: number,
  backoff: BackoffStrategy,
  attempt: number,
): number {
  if (backoff.kind === "fixed") {
    return retryDelayMs;
  }

  // Exponential: base * 2^attempt, capped at maxMs
  const base = backoff.baseMs ?? retryDelayMs;
  const max = backoff.maxMs ?? 30_000;
  const exp = Math.min(base * Math.pow(2, attempt), max);

  if (backoff.jitter) {
    // Full-jitter: uniform in [0, exp]
    return Math.floor(Math.random() * (exp + 1));
  }
  return exp;
}

/**
 * Recommended back-off strategy for production route handlers.
 *
 * Under a sustained pool-exhaustion event (e.g. a migration holding
 * connections for several seconds), a flat 200 ms fixed delay is often not
 * enough for the pool to drain before the retry fires — the retry fails too
 * and the caller sees a 503.  This strategy uses exponential back-off with
 * full jitter so that:
 *
 *   • The retry waits a random amount in [0, 400 ms] (baseMs × 2^1 = 400 ms)
 *     by default, giving the pool a better chance to drain.
 *   • Full jitter (uniform random in [0, computed]) spreads concurrent retries
 *     across time, avoiding a "thundering herd" that would re-exhaust a
 *     recovering pool.
 *   • maxMs = 5 000 ensures the user-visible wait is still bounded even if
 *     the logic is ever extended to more than one retry.
 *
 * Import and pass as the third argument to every production `withDbRetry` call:
 *   `await withDbRetry(fn, 200, PRODUCTION_BACKOFF)`
 */
export const PRODUCTION_BACKOFF: BackoffStrategy = {
  kind: "exponential",
  baseMs: 200,
  maxMs: 5_000,
  jitter: true,
};

// ── In-process counters ────────────────────────────────────────────────────────
// Single-threaded JS means plain number increments are atomic enough for ops
// visibility.  Counters reset on process restart by design.

let _transientErrors = 0;
let _retries = 0;
let _responses503 = 0;

/** Returns a snapshot of the current DB stability counters. */
export function getDbStats(): {
  transientErrors: number;
  retries: number;
  responses503: number;
} {
  return {
    transientErrors: _transientErrors,
    retries: _retries,
    responses503: _responses503,
  };
}

/** Increment the 503-responses counter (called by route catch blocks). */
export function incResponses503(): void {
  _responses503 += 1;
}

/** Reset all counters — intended for test isolation only. */
export function resetDbStats(): void {
  _transientErrors = 0;
  _retries = 0;
  _responses503 = 0;
}

// ── Core helpers ───────────────────────────────────────────────────────────────

/** Returns true when `err` looks like a transient infrastructure failure. */
export function isTransient(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  if (code && TRANSIENT_CODES.has(code)) return true;
  return TRANSIENT_MESSAGE_PATTERNS.some((p) => p.test(err.message));
}

/**
 * Executes `fn` and, if a transient DB error occurs, waits for the computed
 * back-off delay then tries once more.  If the retry also fails a
 * `TransientDbError` is thrown; non-transient errors are re-thrown immediately.
 *
 * @param fn            The database operation to execute.
 * @param retryDelayMs  Base delay before the retry in milliseconds (default 200).
 *                      For the `'fixed'` strategy this is the exact wait time.
 *                      For `'exponential'` it is used as `baseMs` when `baseMs`
 *                      is not explicitly set on the strategy object.
 * @param backoff       Back-off strategy.  Defaults to `{ kind: 'fixed' }`,
 *                      which preserves the original 200 ms fixed behaviour.
 *
 * Side-effects: increments `transientErrors` on first detection and
 * `retries` before each retry attempt.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retryDelayMs = 200,
  backoff: BackoffStrategy = { kind: "fixed" },
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransient(err)) throw err;
    _transientErrors += 1;

    // Compute and apply back-off before the single retry
    const delay = computeBackoff(retryDelayMs, backoff, 1);
    if (delay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }

    _retries += 1;
    try {
      return await fn();
    } catch (retryErr) {
      throw new TransientDbError(retryErr);
    }
  }
}

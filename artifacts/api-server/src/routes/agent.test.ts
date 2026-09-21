/**
 * Unit tests for POST /api/agent/chat
 *
 * Covers two concerns:
 *
 * 1. Context validation — the route must return 400 (before SSE headers) when
 *    required numeric fields are missing or non-numeric, rather than letting
 *    toFixed() throw and producing a raw 500.
 *
 * 2. OpenAI error handling — when OpenAI is unavailable or returns an error,
 *    the SSE stream must emit {"error":"..."}, never {"done":true}, and always
 *    close cleanly. HTTP status stays 200 (SSE contract).
 *
 * No real OpenAI key or Postgres connection is required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { sanitizeOpenAIError } from "./agent.js";

// ── OpenAI mock ───────────────────────────────────────────────────────────────
// vi.hoisted() runs before vi.mock factories (which are themselves hoisted),
// so the mock object is available when the factory closure runs.

const mockCreate = vi.hoisted(() =>
  vi.fn(async (_body?: unknown, _options?: { signal?: AbortSignal }): Promise<AsyncGenerator<{ choices: { delta: { content?: string } }[] }>> =>
    (async function* () {
      yield { choices: [{ delta: { content: "ok" } }] };
    })(),
  ),
);

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mockCreate } } },
}));

// ── DB mock ───────────────────────────────────────────────────────────────────
// The agent route itself has no DB calls, but the Express app imports auth and
// health routes that do — so the module must be mocked before app is imported.

vi.mock("@workspace/db", () => ({
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
  pool: {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn(),
      release: vi.fn(),
    }),
  },
  serverUsers:         { email: "email", passwordHash: "password_hash", name: "name", userId: "user_id" },
  passwordResets:      { email: "email", code: "code", expiresAt: "expires_at" },
  premiumEntitlements: { email: "email", isPremium: "is_premium" },
  eq: vi.fn(),
}));

import app from "../app.js";

process.env.SESSION_SECRET = "test-session-secret";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a raw SSE response body into an array of parsed JSON objects. */
function parseSseEvents(body: string): unknown[] {
  return body
    .split("\n\n")
    .map(block => block.trim())
    .filter(block => block.startsWith("data: "))
    .map(block => JSON.parse(block.slice("data: ".length).trim()));
}

// ── Valid minimal context fixture ─────────────────────────────────────────────

const validContext = {
  monthlySubTotal: 100,
  monthlyBillTotal: 200,
  monthlyLoanPayments: 50,
  income: 3000,
  totalDebt: 0,
  language: "en",
  subscriptions: [],
  bills: [],
  loans: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// 400 validation tests
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — context validation", () => {
  it("returns 400 when context is missing entirely", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monthlySubTotal/);
    expect(res.body.error).toMatch(/monthlyBillTotal/);
    expect(res.body.error).toMatch(/monthlyLoanPayments/);
  });

  it("returns 400 when monthlySubTotal is missing", async () => {
    const { monthlySubTotal: _, ...ctx } = validContext;
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [], context: ctx });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monthlySubTotal/);
  });

  it("returns 400 when monthlyBillTotal is missing", async () => {
    const { monthlyBillTotal: _, ...ctx } = validContext;
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [], context: ctx });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monthlyBillTotal/);
  });

  it("returns 400 when monthlyLoanPayments is missing", async () => {
    const { monthlyLoanPayments: _, ...ctx } = validContext;
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [], context: ctx });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monthlyLoanPayments/);
  });

  it("returns 400 when a required field is a string instead of a number", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({
        messages: [],
        context: { ...validContext, monthlySubTotal: "100" },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monthlySubTotal/);
  });

  it("returns 400 when a required field is undefined explicitly", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({
        messages: [],
        context: { ...validContext, monthlyLoanPayments: undefined },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monthlyLoanPayments/);
  });

  it("returns 400, not 500, when multiple fields are absent", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [], context: { language: "en" } });

    expect(res.status).toBe(400);
    // Must not be a raw 500 — SSE stream must not have been started
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — happy path", () => {
  beforeEach(() => {
    mockCreate.mockImplementation(async () =>
      (async function* () {
        yield { choices: [{ delta: { content: "Great" } }] };
        yield { choices: [{ delta: { content: " job!" } }] };
        yield { choices: [{ delta: {} }] }; // empty delta — should be skipped
      })(),
    );
  });

  it("returns HTTP 200", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hello" }], context: validContext });
    expect(res.status).toBe(200);
  });

  it("Content-Type is text/event-stream", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hello" }], context: validContext });
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
  });

  it("emits content events then the {done:true} sentinel", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hello" }], context: validContext });
    const events = parseSseEvents(res.text);

    const contentEvents = events.filter((e: any) => "content" in e);
    const doneEvent     = events.find((e: any) => e.done === true);
    const errorEvent    = events.find((e: any) => "error" in e);

    expect(contentEvents.length).toBeGreaterThan(0);
    expect(doneEvent).toBeDefined();
    expect(errorEvent).toBeUndefined();
  });

  it("{done:true} is the last event in the stream", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hello" }], context: validContext });
    const events = parseSseEvents(res.text);
    const last = events[events.length - 1];
    expect((last as any).done).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI outage — error thrown before any chunk is produced
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — OpenAI outage (error before first chunk)", () => {
  beforeEach(() => {
    mockCreate.mockRejectedValue(
      Object.assign(new Error("Connection error"), { code: "ECONNRESET" }),
    );
  });

  it("still returns HTTP 200 (SSE contract — status is sent with headers before stream body)", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    expect(res.status).toBe(200);
  });

  it("emits an {error:'...'} event with a non-empty message", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    const errorEvent = events.find((e: any) => "error" in e) as any;

    expect(errorEvent).toBeDefined();
    expect(typeof errorEvent.error).toBe("string");
    expect(errorEvent.error.length).toBeGreaterThan(0);
  });

  it("does NOT emit {done:true} after an error", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    expect(events.find((e: any) => e.done === true)).toBeUndefined();
  });

  it("closes the stream cleanly (response body received — res.end() was called)", async () => {
    // supertest times out if the stream never closes, so this test passing
    // confirms the server called res.end().
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    expect(parseSseEvents(res.text).some((e: any) => "error" in e)).toBe(true);
  });

  it("error event is the last (and only) event in the stream", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    expect(events).toHaveLength(1);
    expect((events[0] as any).error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI quota / rate-limit error (HTTP 429 from OpenAI SDK)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — OpenAI quota / rate-limit error", () => {
  beforeEach(() => {
    const quotaErr = Object.assign(
      new Error("You exceeded your current quota, please check your plan"),
      { status: 429, code: "insufficient_quota" },
    );
    mockCreate.mockRejectedValue(quotaErr);
  });

  it("returns HTTP 200 (SSE contract)", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    expect(res.status).toBe(200);
  });

  it("error event message reflects the quota error text", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    const errorEvent = events.find((e: any) => "error" in e) as any;

    expect(errorEvent).toBeDefined();
    expect(errorEvent.error).toMatch(/quota/i);
  });

  it("does NOT emit {done:true}", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    expect(events.find((e: any) => e.done === true)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error mid-stream — thrown inside the async iterator after partial content
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — error mid-stream (thrown inside async iterator)", () => {
  beforeEach(() => {
    mockCreate.mockImplementation(async () =>
      (async function* () {
        yield { choices: [{ delta: { content: "Partial response" } }] };
        throw new Error("Stream interrupted by server");
      })(),
    );
  });

  it("returns HTTP 200", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    expect(res.status).toBe(200);
  });

  it("emits at least one content event before the error event", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);

    const contentEvents = events.filter((e: any) => "content" in e);
    const errorEvent    = events.find((e: any) => "error" in e);

    expect(contentEvents.length).toBeGreaterThan(0);
    expect(errorEvent).toBeDefined();
  });

  it("does NOT emit {done:true} after a mid-stream error", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    expect(events.find((e: any) => e.done === true)).toBeUndefined();
  });

  it("closes the stream cleanly after the mid-stream error", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    // Receiving a body at all means the connection was closed
    expect(res.text).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-Error throw — object without a .message property
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — non-Error thrown (no .message property)", () => {
  beforeEach(() => {
    // Throw a plain object — err.message will be undefined
    mockCreate.mockRejectedValue({ code: "TIMEOUT" });
  });

  it("falls back to 'Unknown error' in the error event", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    const events = parseSseEvents(res.text);
    const errorEvent = events.find((e: any) => "error" in e) as any;

    expect(errorEvent).toBeDefined();
    expect(errorEvent.error).toBe("Unknown error");
  });

  it("returns HTTP 200", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeOpenAIError — unit tests for each error category
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeOpenAIError — error category mapping", () => {
  it("returns a quota message for status 429", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("You exceeded your current quota"), { status: 429 }),
    );
    expect(result).toMatch(/quota/i);
  });

  it("returns a quota message for code 'insufficient_quota'", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("Quota exceeded"), { code: "insufficient_quota" }),
    );
    expect(result).toMatch(/quota/i);
  });

  it("returns a quota message when the raw message text mentions quota", () => {
    const result = sanitizeOpenAIError(new Error("Your quota has been exceeded"));
    expect(result).toMatch(/quota/i);
  });

  it("returns a safe message for auth failure (status 401)", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("Incorrect API key provided"), { status: 401 }),
    );
    // Must NOT expose the raw API-key text
    expect(result).not.toMatch(/api key/i);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a safe message for code 'invalid_api_key'", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("Invalid API key"), { code: "invalid_api_key" }),
    );
    expect(result).not.toMatch(/invalid api key/i);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a safe message for ECONNRESET network errors", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
    );
    // Must NOT expose the raw low-level error text
    expect(result).not.toMatch(/ECONNRESET/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a safe message for ECONNREFUSED network errors", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
    );
    expect(result).not.toMatch(/ECONNREFUSED/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a safe message for ETIMEDOUT network errors", () => {
    const result = sanitizeOpenAIError(
      Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }),
    );
    expect(result).not.toMatch(/ETIMEDOUT/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a safe generic message for an unknown Error with a message", () => {
    const rawText = "Something internal went wrong: req_abc123, model=gpt-5.6-luna";
    const result = sanitizeOpenAIError(new Error(rawText));
    // Must NOT forward internal details to the client
    expect(result).not.toContain(rawText);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns 'Unknown error' for a plain object with no .message", () => {
    expect(sanitizeOpenAIError({ code: "TIMEOUT" })).toBe("Unknown error");
  });

  it("returns 'Unknown error' for null", () => {
    expect(sanitizeOpenAIError(null)).toBe("Unknown error");
  });

  it("returns 'Unknown error' for a primitive string throw", () => {
    expect(sanitizeOpenAIError("something broke")).toBe("Unknown error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: raw SDK text must never reach the client
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — raw SDK text must not reach the client", () => {
  it("does not forward the raw quota error message text via SSE", async () => {
    const rawSdkText = "You exceeded your current quota, please check your plan and billing details";
    mockCreate.mockRejectedValue(
      Object.assign(new Error(rawSdkText), { status: 429, code: "insufficient_quota" }),
    );

    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    expect(res.text).not.toContain(rawSdkText);
    const errorEvent = parseSseEvents(res.text).find((e: any) => "error" in e) as any;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error).toMatch(/quota/i);
  });

  it("does not forward a raw network error message via SSE", async () => {
    const rawSdkText = "read ECONNRESET — internal socket detail";
    mockCreate.mockRejectedValue(
      Object.assign(new Error(rawSdkText), { code: "ECONNRESET" }),
    );

    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    expect(res.text).not.toContain(rawSdkText);
    const errorEvent = parseSseEvents(res.text).find((e: any) => "error" in e) as any;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error.length).toBeGreaterThan(0);
  });

  it("does not forward a raw auth error message via SSE", async () => {
    const rawSdkText = "Incorrect API key provided: sk-proj-...abc. You can find your API key at openai.com";
    mockCreate.mockRejectedValue(
      Object.assign(new Error(rawSdkText), { status: 401 }),
    );

    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    expect(res.text).not.toContain(rawSdkText);
    const errorEvent = parseSseEvents(res.text).find((e: any) => "error" in e) as any;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Inactivity timeout — stream stalls mid-flight and produces no new chunks
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/agent/chat — inactivity timeout", () => {
  beforeEach(() => {
    // Use a very short timeout so the test completes quickly.
    process.env.AGENT_INACTIVITY_TIMEOUT_MS = "50";

    // Mock a generator that stalls longer than the timeout.
    // It respects the AbortSignal passed via the `signal` option so that
    // abortController.abort() actually interrupts the for-await loop —
    // matching what the real OpenAI SDK does.
    mockCreate.mockImplementation(
      async (_body, { signal } = {}) =>
        (async function* () {
          // Yield one chunk immediately so SSE headers are already flushed,
          // then stall until the abort fires.
          yield { choices: [{ delta: { content: "..." } }] };
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(resolve, 5_000); // far beyond the 50 ms timeout
            signal?.addEventListener("abort", () => {
              clearTimeout(t);
              const err = new Error("The operation was aborted");
              (err as any).name = "AbortError";
              reject(err);
            });
          });
        })(),
    );
  });

  afterEach(() => {
    delete process.env.AGENT_INACTIVITY_TIMEOUT_MS;
  });

  it("emits {error:'Response timed out'} when the stream stalls", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    const events = parseSseEvents(res.text);
    const errorEvent = events.find((e: any) => "error" in e) as any;

    expect(errorEvent).toBeDefined();
    expect(errorEvent.error).toBe("Response timed out");
  });

  it("does NOT emit {done:true} after a timeout", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    const events = parseSseEvents(res.text);
    expect(events.find((e: any) => e.done === true)).toBeUndefined();
  });

  it("closes the stream cleanly after timeout (res.end() was called)", async () => {
    // supertest hangs if the server never calls res.end() — test completing
    // is itself proof the connection was closed.
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    expect(parseSseEvents(res.text).some((e: any) => "error" in e)).toBe(true);
  });

  it("returns HTTP 200 (SSE contract — status flushed with headers)", async () => {
    const res = await request(app)
      .post("/api/agent/chat")
      .send({ messages: [{ role: "user", content: "Hi" }], context: validContext });

    expect(res.status).toBe(200);
  });
});

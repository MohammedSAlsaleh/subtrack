/**
 * Tests: AI advisor chat screen error-handling behaviour
 *
 * Exercises the SSE-parsing and error-handling logic used in agent.tsx
 * (the sendText function). All logic is replicated as pure JS — no React,
 * no fetch, no Expo dependencies — so the suite runs in plain Node.
 *
 * Run with:  node artifacts/mobile/__tests__/agent-chat-error-handling.test.js
 *
 * Confirms:
 *   1. An SSE {"error":"..."} event surfaces a user-friendly message
 *   2. The streaming flag is cleared in the finally block (input re-enabled)
 *   3. The loading indicator is dismissed on error
 *   4. Successful content is accumulated and displayed correctly
 *   5. HTTP-level errors are caught and produce a friendly message
 *   6. Malformed SSE lines are skipped without crashing
 *   7. Arabic friendly message is shown when isRTL is true
 *   8. A mix of valid content followed by an error discards partial content
 */

'use strict';

const assert = require('node:assert/strict');

// ── Replica of the SSE-parsing + state-management core of sendText ────────────
//
// Returns { displayedText, streamingAfter, errorOccurred }
//   displayedText  — what the agent bubble would show
//   streamingAfter — value of the `streaming` flag after the call settles
//   errorOccurred  — true when the catch block ran

async function runSendText({ rawSseBody, httpOk = true, isRTL = false }) {
  const EN_ERROR = 'Sorry, something went wrong. Please try again.';
  const AR_ERROR = 'عذراً، حدث خطأ أثناء الاتصال. حاول مرة أخرى.';

  // Mirrors the state variables
  let streaming = true;   // set true before the fetch; cleared in finally
  let agentText = '';     // mirrors the agent bubble's text
  let errorOccurred = false;

  let fullContent = '';
  try {
    // Simulate fetch / res.ok check
    if (!httpOk) throw new Error('HTTP 500');

    // SSE parsing (exact replica from agent.tsx lines 154-168)
    const lines = rawSseBody.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          fullContent += data.content;
        }
        if (data.error) throw new Error(data.error);
      } catch (parseErr) {
        // JSON.parse throws SyntaxError; our own throw new Error(data.error)
        // is a plain Error — re-throw only non-SyntaxError errors.
        if (!(parseErr instanceof SyntaxError)) throw parseErr;
        // skip malformed SSE line
      }
    }

    // Success path: update agent bubble
    agentText = fullContent;
  } catch (_err) {
    // catch block (agent.tsx lines 173-180)
    errorOccurred = true;
    const errMsg = isRTL ? AR_ERROR : EN_ERROR;
    fullContent = errMsg;
    agentText = errMsg;
  } finally {
    // finally block (agent.tsx lines 181-188)
    streaming = false;  // always clears — re-enables input and dismisses loading
  }

  return { displayedText: agentText, streamingAfter: streaming, errorOccurred };
}

// ── Test infrastructure ───────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Test suite ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nAI advisor chat — SSE error-handling\n');

  // 1. SSE error event → friendly English message in the bubble
  await test('SSE {"error":"..."} event shows English friendly message', async () => {
    const sseBody = 'data: {"error":"OpenAI quota exceeded"}\n';
    const { displayedText, errorOccurred } = await runSendText({ rawSseBody: sseBody });
    assert.equal(errorOccurred, true, 'catch block should have run');
    assert.equal(displayedText, 'Sorry, something went wrong. Please try again.');
  });

  // 2. SSE error → streaming flag cleared (input re-enabled, loading dismissed)
  await test('streaming flag is false after SSE error (input re-enabled)', async () => {
    const sseBody = 'data: {"error":"timeout"}\n';
    const { streamingAfter } = await runSendText({ rawSseBody: sseBody });
    assert.equal(streamingAfter, false, 'streaming must be false so input becomes editable');
  });

  // 3. HTTP 500 → friendly message + streaming cleared
  await test('HTTP error shows friendly message and clears streaming', async () => {
    const { displayedText, streamingAfter, errorOccurred } = await runSendText({
      rawSseBody: '',
      httpOk: false,
    });
    assert.equal(errorOccurred, true);
    assert.equal(displayedText, 'Sorry, something went wrong. Please try again.');
    assert.equal(streamingAfter, false);
  });

  // 4. Arabic friendly message when isRTL is true
  await test('SSE error shows Arabic message when isRTL=true', async () => {
    const sseBody = 'data: {"error":"service unavailable"}\n';
    const { displayedText } = await runSendText({ rawSseBody: sseBody, isRTL: true });
    assert.equal(displayedText, 'عذراً، حدث خطأ أثناء الاتصال. حاول مرة أخرى.');
  });

  // 5. Successful response accumulates content and does NOT trigger error path
  await test('successful SSE stream accumulates content without error', async () => {
    const sseBody = [
      'data: {"content":"Hello"}',
      'data: {"content":", how"}',
      'data: {"content":" can I help?"}',
    ].join('\n');
    const { displayedText, errorOccurred, streamingAfter } = await runSendText({ rawSseBody: sseBody });
    assert.equal(errorOccurred, false);
    assert.equal(displayedText, 'Hello, how can I help?');
    assert.equal(streamingAfter, false);
  });

  // 6. Streaming flag clears even on success (finally always runs)
  await test('streaming flag is false after successful response', async () => {
    const sseBody = 'data: {"content":"All good"}\n';
    const { streamingAfter } = await runSendText({ rawSseBody: sseBody });
    assert.equal(streamingAfter, false);
  });

  // 7. Malformed JSON lines are skipped; valid lines still processed
  await test('malformed SSE lines are skipped and valid content is accumulated', async () => {
    const sseBody = [
      'data: not-json-at-all',
      'data: {"content":"valid chunk"}',
      'data: {broken',
    ].join('\n');
    const { displayedText, errorOccurred } = await runSendText({ rawSseBody: sseBody });
    assert.equal(errorOccurred, false, 'malformed lines must not trigger error path');
    assert.equal(displayedText, 'valid chunk');
  });

  // 8. Error event after partial content → error message replaces content
  await test('error after partial content shows friendly message, not partial text', async () => {
    const sseBody = [
      'data: {"content":"Here is some partial"}',
      'data: {"error":"upstream failure"}',
    ].join('\n');
    const { displayedText, errorOccurred } = await runSendText({ rawSseBody: sseBody });
    assert.equal(errorOccurred, true);
    assert.equal(displayedText, 'Sorry, something went wrong. Please try again.');
    // Partial content must NOT be shown to the user
    assert.ok(!displayedText.includes('partial'), 'partial content must not leak through on error');
  });

  // 9. Lines not starting with "data: " are ignored entirely
  await test('non-data SSE lines (comments, event:, empty) are ignored', async () => {
    const sseBody = [
      ': keep-alive',
      'event: message',
      '',
      'data: {"content":"answer"}',
    ].join('\n');
    const { displayedText, errorOccurred } = await runSendText({ rawSseBody: sseBody });
    assert.equal(errorOccurred, false);
    assert.equal(displayedText, 'answer');
  });

  // 10. Empty SSE body → no content, no error, streaming cleared
  await test('empty SSE body results in empty text and no error', async () => {
    const { displayedText, errorOccurred, streamingAfter } = await runSendText({ rawSseBody: '' });
    assert.equal(errorOccurred, false);
    assert.equal(displayedText, '');
    assert.equal(streamingAfter, false);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });

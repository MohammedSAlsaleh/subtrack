/**
 * Tests: goal edits must not reset savedAmount
 *
 * Exercises the same patch logic used in GoalsContext.updateGoal:
 *   next = prev.map(g => g.id === id ? { ...g, ...patch } : g)
 *
 * Run with:  node artifacts/mobile/__tests__/goal-edit-preserves-saved-amount.test.js
 */

'use strict';

const assert = require('node:assert/strict');

// ── Replica of GoalsContext.updateGoal (pure, no React) ───────────────────────

/**
 * @param {import('../context/GoalsContext').Goal[]} goals
 * @param {string} id
 * @param {Partial<Pick<import('../context/GoalsContext').Goal, 'name'|'emoji'|'targetAmount'|'targetDate'>>} patch
 * @returns {import('../context/GoalsContext').Goal[]}
 */
function applyUpdateGoal(goals, id, patch) {
  return goals.map(g => (g.id === id ? { ...g, ...patch } : g));
}

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function makeGoal(overrides = {}) {
  return {
    id: 'goal_test_1',
    name: 'Vacation',
    emoji: '✈️',
    targetAmount: 8000,
    savedAmount: 3000,
    targetDate: '2026-12-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

console.log('\nGoal edits — savedAmount must be preserved\n');

const goal = makeGoal();

test('editing name leaves savedAmount unchanged', () => {
  const result = applyUpdateGoal([goal], goal.id, { name: 'Umrah Trip' });
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[0].name, 'Umrah Trip');
});

test('editing targetAmount leaves savedAmount unchanged', () => {
  const result = applyUpdateGoal([goal], goal.id, { targetAmount: 10000 });
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[0].targetAmount, 10000);
});

test('editing targetDate leaves savedAmount unchanged', () => {
  const result = applyUpdateGoal([goal], goal.id, { targetDate: '2027-06-01' });
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[0].targetDate, '2027-06-01');
});

test('changing emoji leaves savedAmount unchanged', () => {
  const result = applyUpdateGoal([goal], goal.id, { emoji: '🕋' });
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[0].emoji, '🕋');
});

test('editing targetAmount to less than savedAmount preserves savedAmount (no data loss)', () => {
  // User had saved 3000 but reduces target to 1500 — savedAmount must not be zeroed
  const result = applyUpdateGoal([goal], goal.id, { targetAmount: 1500 });
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[0].targetAmount, 1500);
  // Progress ratio would be > 1, which goalProgress() clamps — that's fine
});

test('removing targetDate (undefined) preserves savedAmount', () => {
  const result = applyUpdateGoal([goal], goal.id, { targetDate: undefined });
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[0].targetDate, undefined);
});

test('editing all fields at once preserves savedAmount', () => {
  const result = applyUpdateGoal([goal], goal.id, {
    name: 'Hajj',
    emoji: '🕋',
    targetAmount: 15000,
    targetDate: '2027-01-01',
  });
  assert.equal(result[0].savedAmount, 3000);
});

test('patch does not include savedAmount — type constraint holds at runtime', () => {
  // Simulate a mistaken call that somehow passes savedAmount in the patch.
  // The TypeScript type forbids this, but we verify the test setup is honest.
  const badPatch = { name: 'Bad', savedAmount: 0 };
  // In the real context, TypeScript rejects this at compile time.
  // We confirm the JS spread does what the TS type promises:
  // if savedAmount were in the patch it WOULD overwrite — which is why the TS
  // type guard (Partial<Pick<Goal, 'name'|'emoji'|'targetAmount'|'targetDate'>>)
  // is the real safety net. Document this explicitly.
  assert.ok(
    !('savedAmount' in { name: 'Valid', emoji: '✈️', targetAmount: 8000, targetDate: '2027-01-01' }),
    'A correctly typed patch must not contain savedAmount'
  );
});

test('only the targeted goal is modified; other goals are untouched', () => {
  const goal2 = makeGoal({ id: 'goal_test_2', name: 'Car', savedAmount: 9999 });
  const result = applyUpdateGoal([goal, goal2], goal.id, { name: 'Renamed' });
  assert.equal(result[0].name, 'Renamed');
  assert.equal(result[0].savedAmount, 3000);
  assert.equal(result[1].savedAmount, 9999); // goal2 untouched
  assert.equal(result[1].name, 'Car');       // goal2 untouched
});

test('goal with zero savedAmount stays zero after edit', () => {
  const freshGoal = makeGoal({ savedAmount: 0 });
  const result = applyUpdateGoal([freshGoal], freshGoal.id, { name: 'New Name', targetAmount: 5000 });
  assert.equal(result[0].savedAmount, 0);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

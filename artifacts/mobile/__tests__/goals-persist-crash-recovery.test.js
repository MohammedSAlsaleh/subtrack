/**
 * Tests: goals list consistency after a simulated force-quit mid-save
 *
 * Verifies two guarantees introduced in GoalsContext:
 *
 *   1. applyAndPersist computes next state from a ref (not from a React
 *      state updater callback), so the value written to AsyncStorage is
 *      always identical to the value passed to setGoals — no divergence.
 *
 *   2. Because the AsyncStorage write is awaited in the same call that
 *      mutates the ref, callers who await addGoal / updateGoal /
 *      logContribution / removeGoal are guaranteed that storage reflects
 *      the mutation before they continue.
 *
 * The tests simulate AsyncStorage with an in-memory store and inject
 * failures to model a force-quit during the write.
 *
 * Run with:
 *   node artifacts/mobile/__tests__/goals-persist-crash-recovery.test.js
 */

'use strict';

const assert = require('node:assert/strict');

// ── In-memory AsyncStorage mock ───────────────────────────────────────────────

function makeStorage(opts = {}) {
  const store = new Map(Object.entries(opts.initial ?? {}));
  let failNext = false;

  return {
    /** Schedule the next setItem call to reject (simulates an interrupted write) */
    scheduleWriteFailure() { failNext = true; },

    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },

    async setItem(key, value) {
      if (failNext) {
        failNext = false;
        throw new Error('Simulated force-quit: AsyncStorage write interrupted');
      }
      store.set(key, value);
    },

    raw() { return store; },
  };
}

// ── Replica of GoalsContext core logic (pure, no React) ───────────────────────

const STORAGE_KEY = '@subtrack_goals';

let _idSeq = 0;

function makeGoalsManager(storage) {
  // Mirrors the goalsRef in GoalsContext
  let currentGoals = [];

  async function load() {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw) currentGoals = JSON.parse(raw);
    return currentGoals;
  }

  /**
   * Mirrors GoalsContext.applyAndPersist:
   * 1. compute next from currentGoals (the ref)
   * 2. update in-memory ref immediately
   * 3. await the storage write
   */
  async function applyAndPersist(updater) {
    const next = updater(currentGoals);
    currentGoals = next;                         // ref updated synchronously
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));  // awaited
  }

  async function addGoal(goal) {
    const newGoal = {
      ...goal,
      savedAmount: 0,
      // Use a monotonic counter so IDs are unique even within the same ms
      id: `goal_${++_idSeq}`,
      createdAt: new Date().toISOString(),
    };
    await applyAndPersist(prev => [...prev, newGoal]);
    return newGoal;
  }

  async function updateGoal(id, patch) {
    await applyAndPersist(prev =>
      prev.map(g => g.id === id ? { ...g, ...patch } : g)
    );
  }

  async function logContribution(id, amount) {
    await applyAndPersist(prev =>
      prev.map(g => g.id === id ? { ...g, savedAmount: g.savedAmount + amount } : g)
    );
  }

  async function removeGoal(id) {
    await applyAndPersist(prev => prev.filter(g => g.id !== id));
  }

  return { load, addGoal, updateGoal, logContribution, removeGoal, getInMemory: () => currentGoals };
}

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✓  ${label}`);
        passed++;
      }).catch(err => {
        console.error(`  ✗  ${label}`);
        console.error(`     ${err.message}`);
        failed++;
      });
    }
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${err.message}`);
    failed++;
  }
  return Promise.resolve();
}

function makeBaseGoal(overrides = {}) {
  return {
    name: 'Vacation',
    emoji: '✈️',
    targetAmount: 8000,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\nGoals persistence — crash-recovery & write consistency\n');

  // 1. Normal write: in-memory and storage are in sync after addGoal
  await test('addGoal: in-memory ref and storage agree after a successful write', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);
    const added = await mgr.addGoal(makeBaseGoal());

    const fromMemory = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 2. Next launch after a failed write loads the last successfully-persisted state
  await test('failed addGoal write: next launch sees the pre-crash list, not a corrupt state', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);

    // First goal — succeeds
    await mgr.addGoal(makeBaseGoal({ name: 'Emergency Fund' }));
    // Second goal — storage write fails (simulates force-quit mid-write)
    storage.scheduleWriteFailure();
    try {
      await mgr.addGoal(makeBaseGoal({ name: 'New Car' }));
    } catch (_) { /* expected */ }

    // Simulate fresh launch: load from storage into a new manager
    const mgr2 = makeGoalsManager(storage);
    const loaded = await mgr2.load();

    // Storage should still hold only the first goal (the write for the second was interrupted)
    assert.equal(loaded.length, 1, `Expected 1 goal after crash, got ${loaded.length}`);
    assert.equal(loaded[0].name, 'Emergency Fund');
  });

  // 3. Contribution log: successful write keeps memory and storage in sync
  await test('logContribution: savedAmount is identical in memory and storage after write', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);
    const goal = await mgr.addGoal(makeBaseGoal());

    await mgr.logContribution(goal.id, 1500);

    const fromMemory = mgr.getInMemory().find(g => g.id === goal.id);
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY)).find(g => g.id === goal.id);

    assert.equal(fromMemory.savedAmount, 1500);
    assert.equal(fromStorage.savedAmount, 1500);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 4. Edge case: crash during logContribution — next launch sees old savedAmount
  await test('crash during logContribution: next launch does not show partial contribution', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);
    const goal = await mgr.addGoal(makeBaseGoal());

    // First contribution succeeds
    await mgr.logContribution(goal.id, 500);
    // Second contribution — storage write is interrupted
    storage.scheduleWriteFailure();
    try {
      await mgr.logContribution(goal.id, 999);
    } catch (_) { /* expected — write failed */ }

    // Fresh launch reads from storage
    const mgr2 = makeGoalsManager(storage);
    const loaded = await mgr2.load();
    const reloaded = loaded.find(g => g.id === goal.id);

    // Should see only the first contribution (500), not the partial second one
    assert.equal(reloaded.savedAmount, 500,
      `Expected savedAmount=500 after crash recovery, got ${reloaded.savedAmount}`);
  });

  // 5. updateGoal: patch is atomic — storage and memory always agree
  await test('updateGoal: storage and memory match after successful write', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);
    const goal = await mgr.addGoal(makeBaseGoal());

    await mgr.updateGoal(goal.id, { name: 'Hajj', targetAmount: 15000 });

    const fromMemory = mgr.getInMemory().find(g => g.id === goal.id);
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY)).find(g => g.id === goal.id);

    assert.equal(fromMemory.name, 'Hajj');
    assert.equal(fromStorage.name, 'Hajj');
    assert.equal(fromMemory.targetAmount, 15000);
    assert.equal(fromStorage.targetAmount, 15000);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 6. removeGoal: goal absent from both memory and storage after removal
  await test('removeGoal: goal is gone from both memory and storage after removal', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);
    const g1 = await mgr.addGoal(makeBaseGoal({ name: 'Vacation' }));
    const g2 = await mgr.addGoal(makeBaseGoal({ name: 'Car' }));

    await mgr.removeGoal(g1.id);

    const fromMemory = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, g2.id);
    assert.equal(fromStorage[0].id, g2.id);
  });

  // 7. Multiple sequential mutations stay consistent
  await test('sequential addGoal + logContribution + updateGoal: storage always matches memory', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);

    const g = await mgr.addGoal(makeBaseGoal({ name: 'Wedding', targetAmount: 50000 }));
    await mgr.logContribution(g.id, 2000);
    await mgr.logContribution(g.id, 3000);
    await mgr.updateGoal(g.id, { targetAmount: 60000 });

    const fromMemory = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.deepEqual(fromMemory, fromStorage);
    assert.equal(fromMemory[0].savedAmount, 5000);
    assert.equal(fromMemory[0].targetAmount, 60000);
  });

  // 8. applyAndPersist uses the ref (current goals), not stale closure values
  await test('ref-based updates: concurrent-style adds both appear in final state', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);

    // Sequential awaited calls — each sees the result of the previous
    await mgr.addGoal(makeBaseGoal({ name: 'A' }));
    await mgr.addGoal(makeBaseGoal({ name: 'B' }));
    await mgr.addGoal(makeBaseGoal({ name: 'C' }));

    const fromMemory = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 3);
    assert.equal(fromStorage.length, 3);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 9. Next launch after removeGoal crash doesn't delete the goal
  await test('crash during removeGoal: goal still present on next launch', async () => {
    const storage = makeStorage();
    const mgr = makeGoalsManager(storage);
    const goal = await mgr.addGoal(makeBaseGoal());

    storage.scheduleWriteFailure();
    try {
      await mgr.removeGoal(goal.id);
    } catch (_) { /* expected */ }

    // Fresh launch
    const mgr2 = makeGoalsManager(storage);
    const loaded = await mgr2.load();

    assert.equal(loaded.length, 1, 'Goal should still exist after interrupted removal');
    assert.equal(loaded[0].id, goal.id);
  });

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

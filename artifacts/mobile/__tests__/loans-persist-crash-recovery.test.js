/**
 * Tests: loans list consistency after a simulated force-quit mid-save
 *
 * Verifies two guarantees introduced in LoanContext:
 *
 *   1. persist() computes next state from a ref (not from a stale React
 *      state closure), so the value written to AsyncStorage is always
 *      identical to the latest in-memory list.
 *
 *   2. Because the AsyncStorage write is awaited in persist(), callers who
 *      await addLoan / updateLoan / removeLoan are guaranteed that storage
 *      reflects the mutation before they continue.
 *
 * The tests simulate AsyncStorage with an in-memory store and inject
 * failures to model a force-quit during the write.
 *
 * Run with:
 *   node artifacts/mobile/__tests__/loans-persist-crash-recovery.test.js
 */

'use strict';

const assert = require('node:assert/strict');

// ── In-memory AsyncStorage mock ───────────────────────────────────────────────

function makeStorage(opts = {}) {
  const store = new Map(Object.entries(opts.initial ?? {}));
  let failNext = false;

  return {
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

    async removeItem(key) {
      store.delete(key);
    },

    raw() { return store; },
  };
}

// ── Replica of LoanContext core logic (pure, no React) ────────────────────────

const STORAGE_KEY = '@subtrack_loans';

let _idSeq = 0;

function makeLoansManager(storage) {
  // Mirrors the loansRef in LoanContext
  let currentLoans = [];

  async function load() {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw) currentLoans = JSON.parse(raw);
    return currentLoans;
  }

  /**
   * Mirrors LoanContext.persist:
   * 1. update in-memory ref immediately
   * 2. schedule state update (omitted in pure replica)
   * 3. await the storage write
   */
  async function persist(next) {
    currentLoans = next;
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function addLoan(loan) {
    const newLoan = {
      ...loan,
      id: `loan_${++_idSeq}`,
      createdAt: new Date().toISOString(),
    };
    await persist([...currentLoans, newLoan]);
    return newLoan;
  }

  async function updateLoan(id, updates) {
    await persist(currentLoans.map(l => l.id === id ? { ...l, ...updates } : l));
  }

  async function removeLoan(id) {
    await persist(currentLoans.filter(l => l.id !== id));
  }

  async function clearAll() {
    currentLoans = [];
    await storage.removeItem(STORAGE_KEY);
  }

  return { load, addLoan, updateLoan, removeLoan, clearAll, getInMemory: () => currentLoans };
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

function makeBaseLoan(overrides = {}) {
  return {
    name: 'Platinum Visa',
    lender: 'Al Rajhi Bank',
    type: 'credit_card',
    currency: 'SAR',
    currentBalance: 12500,
    originalAmount: 25000,
    creditLimit: 25000,
    interestRate: 24,
    minimumPayment: 625,
    nextPaymentDate: '2026-09-01',
    nextPaymentAmount: 625,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\nLoans persistence — crash-recovery & write consistency\n');

  // 1. Normal write: in-memory and storage agree after addLoan
  await test('addLoan: in-memory ref and storage agree after a successful write', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);
    const added = await mgr.addLoan(makeBaseLoan());

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 2. Failed write: next launch sees the pre-crash list
  await test('failed addLoan write: next launch sees pre-crash list, not a corrupt state', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);

    await mgr.addLoan(makeBaseLoan({ name: 'Platinum Visa' }));

    storage.scheduleWriteFailure();
    try {
      await mgr.addLoan(makeBaseLoan({ name: 'Samsung TV Tabby' }));
    } catch (_) { /* expected */ }

    const mgr2  = makeLoansManager(storage);
    const loaded = await mgr2.load();

    assert.equal(loaded.length, 1, `Expected 1 loan after crash, got ${loaded.length}`);
    assert.equal(loaded[0].name, 'Platinum Visa');
  });

  // 3. updateLoan: storage and memory match after successful write
  await test('updateLoan: storage and memory match after successful write', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);
    const loan = await mgr.addLoan(makeBaseLoan());

    await mgr.updateLoan(loan.id, { currentBalance: 8000, interestRate: 22 });

    const fromMemory  = mgr.getInMemory().find(l => l.id === loan.id);
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY)).find(l => l.id === loan.id);

    assert.equal(fromMemory.currentBalance, 8000);
    assert.equal(fromStorage.currentBalance, 8000);
    assert.equal(fromMemory.interestRate, 22);
    assert.equal(fromStorage.interestRate, 22);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 4. Crash during updateLoan: next launch sees the old value
  await test('crash during updateLoan: next launch sees pre-crash balance', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);
    const loan = await mgr.addLoan(makeBaseLoan({ currentBalance: 12500 }));

    storage.scheduleWriteFailure();
    try {
      await mgr.updateLoan(loan.id, { currentBalance: 0 });
    } catch (_) { /* expected */ }

    const mgr2  = makeLoansManager(storage);
    const loaded = await mgr2.load();
    const reloaded = loaded.find(l => l.id === loan.id);

    assert.equal(reloaded.currentBalance, 12500,
      `Expected currentBalance=12500 after crash recovery, got ${reloaded.currentBalance}`);
  });

  // 5. removeLoan: loan absent from both memory and storage
  await test('removeLoan: loan is gone from both memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);
    const l1 = await mgr.addLoan(makeBaseLoan({ name: 'Visa' }));
    const l2 = await mgr.addLoan(makeBaseLoan({ name: 'BNPL' }));

    await mgr.removeLoan(l1.id);

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, l2.id);
    assert.equal(fromStorage[0].id, l2.id);
  });

  // 6. Crash during removeLoan: loan still present on next launch
  await test('crash during removeLoan: loan still present on next launch', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);
    const loan = await mgr.addLoan(makeBaseLoan());

    storage.scheduleWriteFailure();
    try {
      await mgr.removeLoan(loan.id);
    } catch (_) { /* expected */ }

    const mgr2  = makeLoansManager(storage);
    const loaded = await mgr2.load();

    assert.equal(loaded.length, 1, 'Loan should still exist after interrupted removal');
    assert.equal(loaded[0].id, loan.id);
  });

  // 7. Ref-based updates: sequential adds all appear in final state
  await test('ref-based updates: sequential adds all appear in final state', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);

    await mgr.addLoan(makeBaseLoan({ name: 'Visa' }));
    await mgr.addLoan(makeBaseLoan({ name: 'BNPL 1' }));
    await mgr.addLoan(makeBaseLoan({ name: 'BNPL 2' }));

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 3);
    assert.equal(fromStorage.length, 3);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 8. Multiple mutations stay consistent
  await test('sequential add + update + remove: storage always matches memory', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);

    const l1 = await mgr.addLoan(makeBaseLoan({ name: 'Visa', currentBalance: 12500 }));
    const l2 = await mgr.addLoan(makeBaseLoan({ name: 'MacBook BNPL', currentBalance: 2667 }));
    await mgr.updateLoan(l1.id, { currentBalance: 10000 });
    await mgr.removeLoan(l2.id);

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.deepEqual(fromMemory, fromStorage);
    assert.equal(fromMemory.length, 1);
    assert.equal(fromMemory[0].currentBalance, 10000);
  });

  // 9. clearAll resets the ref — a subsequent addLoan starts from empty
  await test('clearAll then addLoan: only the new loan is in memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeLoansManager(storage);

    await mgr.addLoan(makeBaseLoan({ name: 'Visa' }));
    await mgr.addLoan(makeBaseLoan({ name: 'BNPL' }));
    await mgr.clearAll();

    assert.equal(mgr.getInMemory().length, 0, 'In-memory ref should be empty after clearAll');
    assert.equal(await storage.getItem(STORAGE_KEY), null, 'Storage key should be absent after clearAll');

    const added = await mgr.addLoan(makeBaseLoan({ name: 'New Loan' }));

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1, 'Only the new loan should exist after clearAll + add');
    assert.equal(fromStorage.length, 1, 'Only the new loan should be in storage after clearAll + add');
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.equal(fromMemory[0].name, 'New Loan');
  });

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

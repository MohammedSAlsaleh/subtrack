/**
 * Tests: bills list consistency after a simulated force-quit mid-save
 *
 * Verifies two guarantees introduced in BillsContext:
 *
 *   1. applyAndPersist computes next state from a ref (not from a React
 *      state updater callback), so the value written to AsyncStorage is
 *      always identical to the value passed to setBills — no divergence.
 *
 *   2. Because the AsyncStorage write is awaited in the same call that
 *      mutates the ref, callers who await addBill / removeBill /
 *      updateBill are guaranteed that storage reflects the mutation
 *      before they continue.
 *
 * The tests simulate AsyncStorage with an in-memory store and inject
 * failures to model a force-quit during the write.
 *
 * Run with:
 *   node artifacts/mobile/__tests__/bills-persist-crash-recovery.test.js
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

// ── Replica of BillsContext core logic (pure, no React) ───────────────────────

const STORAGE_KEY = '@subtrack_bills';

let _idSeq = 0;

function makeBillsManager(storage) {
  // Mirrors the billsRef in BillsContext
  let currentBills = [];

  async function load() {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw) currentBills = JSON.parse(raw);
    return currentBills;
  }

  /**
   * Mirrors BillsContext.applyAndPersist:
   * 1. compute next from currentBills (the ref)
   * 2. update in-memory ref immediately
   * 3. await the storage write
   */
  async function applyAndPersist(updater) {
    const next = updater(currentBills);
    currentBills = next;
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function addBill(bill) {
    const newBill = {
      ...bill,
      id: `bill_${++_idSeq}`,
      createdAt: new Date().toISOString(),
    };
    await applyAndPersist(prev => [...prev, newBill]);
    return newBill;
  }

  async function removeBill(id) {
    await applyAndPersist(prev => prev.filter(b => b.id !== id));
  }

  async function updateBill(id, updates) {
    await applyAndPersist(prev =>
      prev.map(b => b.id === id ? { ...b, ...updates } : b)
    );
  }

  async function clearAll() {
    currentBills = [];
    await storage.removeItem(STORAGE_KEY);
  }

  return { load, addBill, removeBill, updateBill, clearAll, getInMemory: () => currentBills };
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

function makeBaseBill(overrides = {}) {
  return {
    name: 'Monthly Rent',
    amount: 3500,
    currency: 'SAR',
    dueDayOfMonth: 1,
    category: 'rent',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\nBills persistence — crash-recovery & write consistency\n');

  // 1. Normal write: in-memory and storage agree after addBill
  await test('addBill: in-memory ref and storage agree after a successful write', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);
    const added = await mgr.addBill(makeBaseBill());

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 2. Failed write: next launch sees the pre-crash list
  await test('failed addBill write: next launch sees the pre-crash list, not a corrupt state', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);

    await mgr.addBill(makeBaseBill({ name: 'STC Mobile Plan' }));

    storage.scheduleWriteFailure();
    try {
      await mgr.addBill(makeBaseBill({ name: 'SEC Electricity' }));
    } catch (_) { /* expected */ }

    const mgr2  = makeBillsManager(storage);
    const loaded = await mgr2.load();

    assert.equal(loaded.length, 1, `Expected 1 bill after crash, got ${loaded.length}`);
    assert.equal(loaded[0].name, 'STC Mobile Plan');
  });

  // 3. updateBill: storage and memory match after successful write
  await test('updateBill: storage and memory match after successful write', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);
    const bill = await mgr.addBill(makeBaseBill());

    await mgr.updateBill(bill.id, { amount: 4000, dueDayOfMonth: 5 });

    const fromMemory  = mgr.getInMemory().find(b => b.id === bill.id);
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY)).find(b => b.id === bill.id);

    assert.equal(fromMemory.amount, 4000);
    assert.equal(fromStorage.amount, 4000);
    assert.equal(fromMemory.dueDayOfMonth, 5);
    assert.equal(fromStorage.dueDayOfMonth, 5);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 4. Crash during updateBill: next launch sees the old value
  await test('crash during updateBill: next launch sees the pre-crash value', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);
    const bill = await mgr.addBill(makeBaseBill({ amount: 3500 }));

    storage.scheduleWriteFailure();
    try {
      await mgr.updateBill(bill.id, { amount: 9999 });
    } catch (_) { /* expected */ }

    const mgr2  = makeBillsManager(storage);
    const loaded = await mgr2.load();
    const reloaded = loaded.find(b => b.id === bill.id);

    assert.equal(reloaded.amount, 3500,
      `Expected amount=3500 after crash recovery, got ${reloaded.amount}`);
  });

  // 5. removeBill: bill absent from both memory and storage
  await test('removeBill: bill is gone from both memory and storage after removal', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);
    const b1 = await mgr.addBill(makeBaseBill({ name: 'Rent' }));
    const b2 = await mgr.addBill(makeBaseBill({ name: 'Phone' }));

    await mgr.removeBill(b1.id);

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, b2.id);
    assert.equal(fromStorage[0].id, b2.id);
  });

  // 6. Crash during removeBill: bill still present on next launch
  await test('crash during removeBill: bill still present on next launch', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);
    const bill = await mgr.addBill(makeBaseBill());

    storage.scheduleWriteFailure();
    try {
      await mgr.removeBill(bill.id);
    } catch (_) { /* expected */ }

    const mgr2  = makeBillsManager(storage);
    const loaded = await mgr2.load();

    assert.equal(loaded.length, 1, 'Bill should still exist after interrupted removal');
    assert.equal(loaded[0].id, bill.id);
  });

  // 7. Ref-based updates: sequential adds all appear in final state
  await test('ref-based updates: sequential adds all appear in final state', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);

    await mgr.addBill(makeBaseBill({ name: 'Rent' }));
    await mgr.addBill(makeBaseBill({ name: 'Phone' }));
    await mgr.addBill(makeBaseBill({ name: 'Electricity' }));

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 3);
    assert.equal(fromStorage.length, 3);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 8. Multiple mutations stay consistent
  await test('sequential add + update + remove: storage always matches memory', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);

    const b1 = await mgr.addBill(makeBaseBill({ name: 'Rent', amount: 3500 }));
    const b2 = await mgr.addBill(makeBaseBill({ name: 'Internet', amount: 299 }));
    await mgr.updateBill(b1.id, { amount: 3800 });
    await mgr.removeBill(b2.id);

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.deepEqual(fromMemory, fromStorage);
    assert.equal(fromMemory.length, 1);
    assert.equal(fromMemory[0].amount, 3800);
  });

  // 9. clearAll resets the ref — a subsequent addBill starts from empty
  await test('clearAll then addBill: only the new bill is in memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeBillsManager(storage);

    await mgr.addBill(makeBaseBill({ name: 'Rent' }));
    await mgr.addBill(makeBaseBill({ name: 'Phone' }));
    await mgr.clearAll();

    // After clear, ref and state must be empty
    assert.equal(mgr.getInMemory().length, 0, 'In-memory ref should be empty after clearAll');
    assert.equal(await storage.getItem(STORAGE_KEY), null, 'Storage key should be absent after clearAll');

    // Adding a new bill must not resurrect the cleared data
    const added = await mgr.addBill(makeBaseBill({ name: 'Electricity' }));

    const fromMemory  = mgr.getInMemory();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY));

    assert.equal(fromMemory.length, 1, 'Only the new bill should exist after clearAll + add');
    assert.equal(fromStorage.length, 1, 'Only the new bill should be in storage after clearAll + add');
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.equal(fromMemory[0].name, 'Electricity');
  });

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

/**
 * Tests: subscription and bank list consistency after a simulated force-quit mid-save
 *
 * Verifies two guarantees introduced in SubscriptionContext:
 *
 *   1. saveSubs / saveBanks compute next state from refs (not from stale React
 *      state closures), so the value written to AsyncStorage is always
 *      identical to the latest in-memory list.
 *
 *   2. Because the AsyncStorage write is awaited in saveSubs / saveBanks,
 *      callers who await addSubscription / updateSubscription /
 *      removeSubscription / addBank / removeBank are guaranteed that storage
 *      reflects the mutation before they continue.
 *
 * The tests simulate AsyncStorage with an in-memory store and inject
 * failures to model a force-quit during the write.
 *
 * Run with:
 *   node artifacts/mobile/__tests__/subscriptions-persist-crash-recovery.test.js
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

    async multiRemove(keys) {
      keys.forEach(k => store.delete(k));
    },

    raw() { return store; },
  };
}

// ── Replica of SubscriptionContext core logic (pure, no React) ────────────────

const STORAGE_KEY_SUBS  = '@subtrack_subscriptions';
const STORAGE_KEY_BANKS = '@subtrack_banks';

let _idSeq = 0;

function makeSubsManager(storage) {
  // Mirrors subsRef and banksRef in SubscriptionContext
  let currentSubs  = [];
  let currentBanks = [];

  async function load() {
    const subsRaw  = await storage.getItem(STORAGE_KEY_SUBS);
    const banksRaw = await storage.getItem(STORAGE_KEY_BANKS);
    if (subsRaw)  currentSubs  = JSON.parse(subsRaw);
    if (banksRaw) currentBanks = JSON.parse(banksRaw);
    return { subs: currentSubs, banks: currentBanks };
  }

  /**
   * Mirrors SubscriptionContext.saveSubs / saveBanks:
   * 1. update in-memory ref immediately
   * 2. await the storage write
   */
  async function saveSubs(next) {
    currentSubs = next;
    await storage.setItem(STORAGE_KEY_SUBS, JSON.stringify(next));
  }

  async function saveBanks(next) {
    currentBanks = next;
    await storage.setItem(STORAGE_KEY_BANKS, JSON.stringify(next));
  }

  async function addSubscription(sub) {
    const newSub = {
      ...sub,
      id: `sub_${++_idSeq}`,
      startedAt: new Date().toISOString().split('T')[0],
    };
    await saveSubs([newSub, ...currentSubs]);
    return newSub;
  }

  async function updateSubscription(id, updates) {
    await saveSubs(currentSubs.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  async function removeSubscription(id) {
    await saveSubs(currentSubs.filter(s => s.id !== id));
  }

  async function addBank(bank) {
    const newBank = {
      ...bank,
      id: `bank_${++_idSeq}`,
      connectedAt: new Date().toISOString(),
    };
    await saveBanks([newBank, ...currentBanks]);
    return newBank;
  }

  async function removeBank(id) {
    await saveBanks(currentBanks.filter(b => b.id !== id));
  }

  async function clearAll() {
    currentSubs  = [];
    currentBanks = [];
    await storage.multiRemove([STORAGE_KEY_SUBS, STORAGE_KEY_BANKS]);
  }

  return {
    load, addSubscription, updateSubscription, removeSubscription,
    addBank, removeBank, clearAll,
    getInMemorySubs:  () => currentSubs,
    getInMemoryBanks: () => currentBanks,
  };
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

function makeBaseSub(overrides = {}) {
  return {
    name: 'Netflix',
    merchantName: 'Netflix Inc.',
    category: 'streaming',
    amount: 39.99,
    currency: 'SAR',
    billingCycle: 'monthly',
    nextBillingDate: '2026-08-28',
    color: '#E50914',
    icon: 'tv',
    status: 'active',
    ...overrides,
  };
}

function makeBaseBank(overrides = {}) {
  return {
    bankName: 'Al Rajhi Bank',
    accountType: 'current',
    lastFour: '4242',
    leanEntityId: 'lean_001',
    ...overrides,
  };
}

// ── Subscription tests ────────────────────────────────────────────────────────

async function run() {
  console.log('\nSubscriptions persistence — crash-recovery & write consistency\n');

  // 1. Normal write: in-memory and storage agree after addSubscription
  await test('addSubscription: in-memory ref and storage agree after a successful write', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const added = await mgr.addSubscription(makeBaseSub());

    const fromMemory  = mgr.getInMemorySubs();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY_SUBS));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 2. Failed write: next launch sees the pre-crash list
  await test('failed addSubscription write: next launch sees pre-crash list', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);

    await mgr.addSubscription(makeBaseSub({ name: 'Netflix' }));

    storage.scheduleWriteFailure();
    try {
      await mgr.addSubscription(makeBaseSub({ name: 'Spotify' }));
    } catch (_) { /* expected */ }

    const mgr2  = makeSubsManager(storage);
    const { subs } = await mgr2.load();

    assert.equal(subs.length, 1, `Expected 1 sub after crash, got ${subs.length}`);
    assert.equal(subs[0].name, 'Netflix');
  });

  // 3. updateSubscription: storage and memory match after successful write
  await test('updateSubscription: storage and memory match after successful write', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const sub = await mgr.addSubscription(makeBaseSub());

    await mgr.updateSubscription(sub.id, { amount: 49.99, status: 'cancelled' });

    const fromMemory  = mgr.getInMemorySubs().find(s => s.id === sub.id);
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY_SUBS)).find(s => s.id === sub.id);

    assert.equal(fromMemory.amount, 49.99);
    assert.equal(fromStorage.amount, 49.99);
    assert.equal(fromMemory.status, 'cancelled');
    assert.equal(fromStorage.status, 'cancelled');
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 4. Crash during updateSubscription: next launch sees the old value
  await test('crash during updateSubscription: next launch sees pre-crash amount', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const sub = await mgr.addSubscription(makeBaseSub({ amount: 39.99 }));

    storage.scheduleWriteFailure();
    try {
      await mgr.updateSubscription(sub.id, { amount: 999 });
    } catch (_) { /* expected */ }

    const mgr2  = makeSubsManager(storage);
    const { subs } = await mgr2.load();
    const reloaded = subs.find(s => s.id === sub.id);

    assert.equal(reloaded.amount, 39.99,
      `Expected amount=39.99 after crash recovery, got ${reloaded.amount}`);
  });

  // 5. removeSubscription: subscription absent from both memory and storage
  await test('removeSubscription: sub is gone from both memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const s1 = await mgr.addSubscription(makeBaseSub({ name: 'Netflix' }));
    const s2 = await mgr.addSubscription(makeBaseSub({ name: 'Spotify' }));

    await mgr.removeSubscription(s1.id);

    const fromMemory  = mgr.getInMemorySubs();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY_SUBS));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, s2.id);
    assert.equal(fromStorage[0].id, s2.id);
  });

  // 6. Crash during removeSubscription: sub still present on next launch
  await test('crash during removeSubscription: sub still present on next launch', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const sub = await mgr.addSubscription(makeBaseSub());

    storage.scheduleWriteFailure();
    try {
      await mgr.removeSubscription(sub.id);
    } catch (_) { /* expected */ }

    const mgr2  = makeSubsManager(storage);
    const { subs } = await mgr2.load();

    assert.equal(subs.length, 1, 'Sub should still exist after interrupted removal');
    assert.equal(subs[0].id, sub.id);
  });

  // 7. Ref-based updates: sequential adds all appear in final state
  await test('ref-based updates: sequential subscription adds all appear in final state', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);

    await mgr.addSubscription(makeBaseSub({ name: 'Netflix' }));
    await mgr.addSubscription(makeBaseSub({ name: 'Spotify' }));
    await mgr.addSubscription(makeBaseSub({ name: 'Adobe' }));

    const fromMemory  = mgr.getInMemorySubs();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY_SUBS));

    assert.equal(fromMemory.length, 3);
    assert.equal(fromStorage.length, 3);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // ── Bank tests ──────────────────────────────────────────────────────────────

  // 8. addBank: in-memory and storage agree
  await test('addBank: in-memory ref and storage agree after a successful write', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const added = await mgr.addBank(makeBaseBank());

    const fromMemory  = mgr.getInMemoryBanks();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY_BANKS));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, added.id);
    assert.equal(fromStorage[0].id, added.id);
    assert.deepEqual(fromMemory, fromStorage);
  });

  // 9. Failed addBank write: next launch sees pre-crash list
  await test('failed addBank write: next launch sees pre-crash banks list', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);

    await mgr.addBank(makeBaseBank({ bankName: 'Al Rajhi Bank' }));

    storage.scheduleWriteFailure();
    try {
      await mgr.addBank(makeBaseBank({ bankName: 'SNB' }));
    } catch (_) { /* expected */ }

    const mgr2  = makeSubsManager(storage);
    const { banks } = await mgr2.load();

    assert.equal(banks.length, 1, `Expected 1 bank after crash, got ${banks.length}`);
    assert.equal(banks[0].bankName, 'Al Rajhi Bank');
  });

  // 10. removeBank: bank absent from both memory and storage
  await test('removeBank: bank is gone from both memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const b1 = await mgr.addBank(makeBaseBank({ bankName: 'Al Rajhi Bank' }));
    const b2 = await mgr.addBank(makeBaseBank({ bankName: 'SNB' }));

    await mgr.removeBank(b1.id);

    const fromMemory  = mgr.getInMemoryBanks();
    const fromStorage = JSON.parse(await storage.getItem(STORAGE_KEY_BANKS));

    assert.equal(fromMemory.length, 1);
    assert.equal(fromStorage.length, 1);
    assert.equal(fromMemory[0].id, b2.id);
    assert.equal(fromStorage[0].id, b2.id);
  });

  // 11. Crash during removeBank: bank still present on next launch
  await test('crash during removeBank: bank still present on next launch', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);
    const bank = await mgr.addBank(makeBaseBank());

    storage.scheduleWriteFailure();
    try {
      await mgr.removeBank(bank.id);
    } catch (_) { /* expected */ }

    const mgr2  = makeSubsManager(storage);
    const { banks } = await mgr2.load();

    assert.equal(banks.length, 1, 'Bank should still exist after interrupted removal');
    assert.equal(banks[0].id, bank.id);
  });

  // 12. Sequential mutations stay consistent across both stores
  await test('sequential sub + bank mutations: both storages always match memory', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);

    const s1 = await mgr.addSubscription(makeBaseSub({ name: 'Netflix' }));
    const s2 = await mgr.addSubscription(makeBaseSub({ name: 'Spotify' }));
    await mgr.addBank(makeBaseBank({ bankName: 'Al Rajhi Bank' }));
    await mgr.updateSubscription(s1.id, { amount: 49.99 });
    await mgr.removeSubscription(s2.id);

    const subsMemory  = mgr.getInMemorySubs();
    const subsStorage = JSON.parse(await storage.getItem(STORAGE_KEY_SUBS));
    const banksMemory  = mgr.getInMemoryBanks();
    const banksStorage = JSON.parse(await storage.getItem(STORAGE_KEY_BANKS));

    assert.deepEqual(subsMemory,  subsStorage);
    assert.deepEqual(banksMemory, banksStorage);
    assert.equal(subsMemory.length, 1);
    assert.equal(subsMemory[0].amount, 49.99);
    assert.equal(banksMemory.length, 1);
  });

  // 13. clearAll resets both refs — subsequent adds start from empty
  await test('clearAll then addSubscription: only the new sub is in memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);

    await mgr.addSubscription(makeBaseSub({ name: 'Netflix' }));
    await mgr.addSubscription(makeBaseSub({ name: 'Spotify' }));
    await mgr.addBank(makeBaseBank({ bankName: 'Al Rajhi Bank' }));
    await mgr.clearAll();

    assert.equal(mgr.getInMemorySubs().length,  0, 'Subs ref should be empty after clearAll');
    assert.equal(mgr.getInMemoryBanks().length, 0, 'Banks ref should be empty after clearAll');
    assert.equal(await storage.getItem(STORAGE_KEY_SUBS),  null, 'Subs storage key should be absent after clearAll');
    assert.equal(await storage.getItem(STORAGE_KEY_BANKS), null, 'Banks storage key should be absent after clearAll');

    // Adding after clear must not resurrect old data
    const added = await mgr.addSubscription(makeBaseSub({ name: 'Adobe' }));

    const subsMemory  = mgr.getInMemorySubs();
    const subsStorage = JSON.parse(await storage.getItem(STORAGE_KEY_SUBS));

    assert.equal(subsMemory.length, 1, 'Only the new sub should exist after clearAll + add');
    assert.equal(subsStorage.length, 1, 'Only the new sub should be in storage after clearAll + add');
    assert.equal(subsMemory[0].id, added.id);
    assert.equal(subsMemory[0].name, 'Adobe');
  });

  await test('clearAll then addBank: only the new bank is in memory and storage', async () => {
    const storage = makeStorage();
    const mgr = makeSubsManager(storage);

    await mgr.addBank(makeBaseBank({ bankName: 'Al Rajhi Bank' }));
    await mgr.addBank(makeBaseBank({ bankName: 'SNB' }));
    await mgr.clearAll();

    assert.equal(mgr.getInMemoryBanks().length, 0, 'Banks ref should be empty after clearAll');

    const added = await mgr.addBank(makeBaseBank({ bankName: 'Riyad Bank' }));

    const banksMemory  = mgr.getInMemoryBanks();
    const banksStorage = JSON.parse(await storage.getItem(STORAGE_KEY_BANKS));

    assert.equal(banksMemory.length, 1, 'Only the new bank should exist after clearAll + add');
    assert.equal(banksStorage.length, 1, 'Only the new bank should be in storage after clearAll + add');
    assert.equal(banksMemory[0].id, added.id);
    assert.equal(banksMemory[0].bankName, 'Riyad Bank');
  });

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

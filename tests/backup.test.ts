import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, readBackup, backupFilename, MAX_BACKUP_SIZE } from '../src/core/backup.ts';
import { emptyBudget } from '../src/core/budget.ts';
import { BUDGET_KEY, UNDO_KEY, restoreSavedBudget, undoSavedRestore } from '../src/core/restoreStorage.ts';
import type { Storage } from '../src/core/restoreStorage.ts';
function fixture() {
  const b = emptyBudget();
  b.goal = 50000;
  b.paychecks = [{ id: 'p', name: 'Job', date: '2026-10-15', amount: 140000, status: 'received' }];
  b.income = [{ id: 'i', name: 'Uber', date: '2026-10-15', amount: 5000, status: 'expected', paycheckId: 'p' }];
  b.schedules = [{ id: 's', name: 'Rent', kind: 'bill', amount: 35000, category: 'Housing', anchorDate: '2026-10-15', cadence: 'monthly', nextIndex: 1, active: false, endDate: null }];
  b.bills = [{ id: 'b', name: 'Rent', amount: 35000, dueDate: '2026-10-15', category: 'Housing', paid: true, paycheckId: 'p', scheduleId: 's' }];
  return b;
}
function memory(failKey?: string, failRemove = false) {
  const data = new Map<string, string>(); const calls: string[] = [];
  const storage: Storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, raw) => { calls.push(key); if (key === failKey) throw new Error('disk full'); data.set(key, raw); },
    removeItem: async key => { if (failRemove) throw new Error('remove failed'); data.delete(key); },
  };
  return { data, calls, storage };
}
test('backup round-trip preserves exact amounts, ids, paid/received states, links, schedules and goals', () => {
  const b = fixture(); const raw = createBackup(b, '2026-10-15T15:00:00.000Z');
  const parsed = readBackup(raw);
  assert.deepEqual(parsed.budget, b); assert.equal(parsed.exportedAt, '2026-10-15T15:00:00.000Z');
  parsed.budget.paychecks[0].amount = 1; assert.equal(b.paychecks[0].amount, 140000);
});
test('empty and legacy V2 budgets are valid exports without migration or balance changes', () => {
  const b = emptyBudget(); delete b.schedules;
  assert.deepEqual(readBackup(createBackup(b)).budget, b);
});
test('malformed, wrong-version, oversized and financially invalid backups are rejected', () => {
  const valid = JSON.parse(createBackup(fixture()));
  for (const raw of ['{', 'null', '{}', JSON.stringify(fixture()), JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, exportedAt: 'bad' }), ' '.repeat(MAX_BACKUP_SIZE + 1)]) assert.throws(() => readBackup(raw));
  valid.budget.income[0].paycheckId = 'missing'; assert.throws(() => readBackup(JSON.stringify(valid)));
});
test('backup filenames are portable and date-stamped', () => {
  assert.equal(backupFilename(new Date('2026-10-15T15:00:00.000Z')), 'rilo-backup-2026-10-15T15-00-00-000Z.json');
});
test('restore saves recovery first, replaces rather than merges, then undo survives a simulated restart', async () => {
  const { storage, data, calls } = memory(); const original = fixture(); const incoming = emptyBudget();
  data.set(BUDGET_KEY, JSON.stringify(original));
  const restored = await restoreSavedBudget(storage, original, incoming);
  assert.deepEqual(calls, [UNDO_KEY, BUDGET_KEY]); assert.deepEqual(restored, incoming);
  assert.deepEqual(JSON.parse(data.get(UNDO_KEY)!), original);
  assert.deepEqual(JSON.parse(data.get(BUDGET_KEY)!), incoming);
  const result = await undoSavedRestore(storage);
  assert.deepEqual(result.budget, original); assert.equal(result.cleanupFailed, false); assert.equal(data.has(UNDO_KEY), false);
});
test('failed recovery save never overwrites the current budget', async () => {
  const { storage, data, calls } = memory(UNDO_KEY); const b = fixture();
  data.set(BUDGET_KEY, JSON.stringify(b));
  await assert.rejects(restoreSavedBudget(storage, b, emptyBudget()));
  assert.deepEqual(calls, [UNDO_KEY]); assert.deepEqual(JSON.parse(data.get(BUDGET_KEY)!), b);
});
test('failed replacement keeps original data and a usable recovery copy', async () => {
  const { storage, data } = memory(BUDGET_KEY); const b = fixture();
  data.set(BUDGET_KEY, JSON.stringify(b));
  await assert.rejects(restoreSavedBudget(storage, b, emptyBudget()));
  assert.deepEqual(JSON.parse(data.get(BUDGET_KEY)!), b); assert.deepEqual(JSON.parse(data.get(UNDO_KEY)!), b);
});
test('invalid restore payload performs no writes', async () => {
  const { storage, calls } = memory(); const bad = fixture(); bad.bills[0].amount = -1;
  await assert.rejects(restoreSavedBudget(storage, emptyBudget(), bad)); assert.deepEqual(calls, []);
});
test('undo rejects missing or corrupt recovery data without replacing budget', async () => {
  const { storage, data, calls } = memory();
  await assert.rejects(undoSavedRestore(storage)); data.set(UNDO_KEY, '{');
  await assert.rejects(undoSavedRestore(storage)); assert.deepEqual(calls, []);
});
test('undo write failure keeps recovery; cleanup failure reports the applied budget accurately', async () => {
  const failed = memory(BUDGET_KEY); failed.data.set(UNDO_KEY, JSON.stringify(fixture()));
  await assert.rejects(undoSavedRestore(failed.storage)); assert.equal(failed.data.has(UNDO_KEY), true);
  const cleanup = memory(undefined, true); cleanup.data.set(UNDO_KEY, JSON.stringify(fixture()));
  const result = await undoSavedRestore(cleanup.storage);
  assert.equal(result.cleanupFailed, true); assert.deepEqual(result.budget, fixture());
  assert.deepEqual(JSON.parse(cleanup.data.get(BUDGET_KEY)!), fixture());
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, decodeBudget, emptyBudget, plan, today } from '../src/core/budget.ts';
import { expandSchedules, occurrenceDate, startSchedule } from '../src/core/recurrence.ts';
import type { Budget } from '../src/core/budget.ts';

function fixture(kind: 'bill' | 'paycheck' = 'bill'): Budget {
  return { ...emptyBudget(),
    schedules: [{ id: 's', kind, name: 'Test', amount: 35000, category: 'Housing', anchorDate: '2026-01-31', cadence: 'monthly', nextIndex: 1, active: true, endDate: null }],
    ...(kind === 'bill' ? { bills: [{ id: 'seed', name: 'Test', amount: 35000, category: 'Housing', dueDate: '2026-01-31', paid: true, paycheckId: null, scheduleId: 's' }] } : { paychecks: [{ id: 'seed', name: 'Test', amount: 35000, date: '2026-01-31', status: 'received', scheduleId: 's' }] }) };
}
test('monthly dates clamp to each month but retain original month-end anchor', () => {
  assert.equal(occurrenceDate('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(occurrenceDate('2026-01-31', 'monthly', 2), '2026-03-31');
  assert.equal(occurrenceDate('2028-01-31', 'monthly', 1), '2028-02-29');
  assert.equal(occurrenceDate('2026-12-30', 'monthly', 2), '2027-02-28');
});
test('weekly and biweekly cadence crosses calendar years', () => {
  assert.equal(occurrenceDate('2026-12-25', 'biweekly', 1), '2027-01-08');
  assert.equal(occurrenceDate('2026-12-25', 'weekly', 2), '2027-01-08');
});
test('paid seed creates unpaid bills, with automatic assignments and stable unique ids', () => {
  const input = fixture(); const b = expandSchedules(input, '2026-04-30');
  assert.deepEqual(b.bills.map(x => x.dueDate), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(b.bills[0].paid, true); assert.ok(b.bills.slice(1).every(x => !x.paid && x.paycheckId === null));
  assert.equal(input.bills.length, 1); assert.equal(input.schedules![0].nextIndex, 1);
  assert.equal(expandSchedules(b, '2026-04-30'), b);
  assert.equal(decodeBudget(JSON.stringify(b)).bills.length, 4);
});
test('received seed creates only expected paychecks; generated money is not spendable', () => {
  const b = expandSchedules(fixture('paycheck'), '2026-03-31');
  assert.equal(b.paychecks[0].status, 'received');
  assert.ok(b.paychecks.slice(1).every(x => x.status === 'expected'));
  assert.equal(plan(b, b.paychecks[1].id).received, 0);
  assert.equal(plan(b, b.paychecks[1].id).forecast, 35000);
});
test('editing, receiving, or deleting generated entries is preserved across reload and expansion', () => {
  const b = expandSchedules(fixture('paycheck'), '2026-03-31');
  b.paychecks[1].date = '2026-02-27'; b.paychecks[1].amount = 41000; b.paychecks[1].status = 'received';
  b.paychecks.splice(2, 1);
  const reloaded = expandSchedules(decodeBudget(JSON.stringify(b)), '2026-03-31');
  assert.equal(reloaded.paychecks.length, 2); assert.equal(reloaded.paychecks[1].date, '2026-02-27');
  assert.equal(reloaded.paychecks[1].amount, 41000); assert.equal(reloaded.paychecks[1].status, 'received');
});
test('paused schedules create no entries; resume catches up; end dates are inclusive', () => {
  const b = fixture(); b.schedules![0].active = false;
  assert.equal(expandSchedules(b, '2026-05-31'), b);
  b.schedules![0].active = true; b.schedules![0].endDate = '2026-03-31';
  const next = expandSchedules(b, '2026-05-31');
  assert.deepEqual(next.bills.map(x => x.dueDate), ['2026-01-31', '2026-02-28', '2026-03-31']);
});
test('future settings do not rewrite existing entries, paid history, or per-entry edits', () => {
  let b = expandSchedules(fixture(), '2026-02-28');
  b.schedules![0].amount = 42000; b.schedules![0].name = 'New rent';
  b = expandSchedules(b, '2026-03-31');
  assert.equal(b.bills[0].paid, true); assert.equal(b.bills[1].amount, 35000);
  assert.equal(b.bills[2].amount, 42000); assert.equal(b.bills[2].name, 'New rent');
});
test('existing matching manual occurrences are not duplicated or overwritten', () => {
  const b = fixture('paycheck'); b.paychecks.push({ id: 'manual', name: 'Test', amount: 35000, date: '2026-02-28', status: 'received' });
  const next = expandSchedules(b, '2026-03-31');
  assert.equal(next.paychecks.length, 3); assert.equal(next.paychecks[1].id, 'manual'); assert.equal(next.paychecks[1].status, 'received');
});
test('old Core V2 data loads unchanged with no generated entries until a schedule is added', () => {
  const b = emptyBudget(); delete b.schedules;
  assert.deepEqual(decodeBudget(JSON.stringify(b)), b);
  assert.equal(expandSchedules(b, '2026-12-31'), b);
});
test('converting an existing entry keeps the seed id, status, amount and assignments', () => {
  const b = emptyBudget(); b.paychecks = [{ id: 'p', name: 'Job', amount: 140000, date: today(), status: 'received' }];
  b.bills = [{ id: 'b', name: 'Rent', amount: 35000, category: 'Housing', dueDate: today(), paid: true, paycheckId: 'p' }];
  const next = startSchedule(b, 'bill', 'b', 'monthly', 's');
  assert.deepEqual(next.bills[0], { ...b.bills[0], scheduleId: 's' });
  assert.throws(() => startSchedule(next, 'bill', 'b', 'monthly', 's2'));
  assert.equal(expandSchedules(next, addDays(today(), 90)).bills[0].paycheckId, 'p');
});
test('schedule schema rejects corrupt dates, cursors, frequency, and orphan references', () => {
  for (const change of [
    (b: Budget) => { b.schedules![0].nextIndex = -1; },
    (b: Budget) => { b.schedules![0].anchorDate = '2026-02-30'; },
    (b: Budget) => { b.schedules![0].cadence = 'daily' as 'weekly'; },
    (b: Budget) => { b.schedules![0].endDate = '2020-01-01'; },
    (b: Budget) => { b.bills[0].scheduleId = 'missing'; },
  ]) { const b = fixture(); change(b); assert.throws(() => decodeBudget(JSON.stringify(b))); }
});

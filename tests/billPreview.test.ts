import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBudget } from '../src/core/budget.ts';
import { nextBillOccurrences, nextScheduleOccurrences } from '../src/core/billPreview.ts';
import type { Schedule } from '../src/core/recurrence.ts';
const schedule: Schedule = { id: 'rent', kind: 'bill', name: 'Rent', amount: 35000, category: 'Housing', cadence: 'monthly', anchorDate: '2026-01-31', nextIndex: 4, active: true, endDate: null };
test('three-date preview uses actual edited occurrences then supplements past the planning horizon', () => {
  const b = emptyBudget();
  b.bills = [{ id: 'edited', name: 'Rent', amount: 40000, category: 'Housing', dueDate: '2026-04-29', paid: true, paycheckId: null, scheduleId: 'rent' }];
  const preview = nextBillOccurrences(b, schedule, '2026-04-01');
  assert.deepEqual(preview.map(x => x.date), ['2026-04-29', '2026-05-31', '2026-06-30']);
  assert.equal(preview[0].amount, 40000); assert.equal(preview[0].paid, true);
  assert.equal(preview[1].id, undefined); assert.equal(b.bills.length, 1);
});
test('preview respects deletion cursor, paused schedules and the end date', () => {
  const b = emptyBudget();
  assert.deepEqual(nextBillOccurrences(b, schedule, '2026-04-01').map(x => x.date), ['2026-05-31', '2026-06-30', '2026-07-31']);
  assert.deepEqual(nextBillOccurrences(b, { ...schedule, active: false }, '2026-04-01'), []);
  assert.deepEqual(nextBillOccurrences(b, { ...schedule, endDate: '2026-06-30' }, '2026-04-01').map(x => x.date), ['2026-05-31', '2026-06-30']);
});
test('preview stays scoped to its bill and shows only three upcoming dates in order', () => {
  const b = emptyBudget();
  b.bills = ['2026-04-30', '2026-02-28', '2026-03-31', '2026-01-31'].map((date, i) => ({ id: String(i), name: 'Rent', amount: 35000, category: 'Housing', dueDate: date, paid: false, paycheckId: null, scheduleId: 'rent' }));
  b.bills.push({ ...b.bills[0], id: 'other', dueDate: '2026-03-01', scheduleId: 'other' });
  assert.deepEqual(nextBillOccurrences(b, schedule, '2026-03-01').map(x => x.date), ['2026-03-31', '2026-04-30', '2026-05-31']);
});

test('income preview groups one source with its real dates, received status and edited amounts', () => {
  const b = emptyBudget();
  const payroll: Schedule = { ...schedule, id: 'payroll', kind: 'paycheck', name: 'Job', amount: 140000, cadence: 'biweekly', anchorDate: '2026-10-02', nextIndex: 3 };
  b.paychecks = [
    { id: 'a', name: 'Job', amount: 145000, date: '2026-10-15', status: 'received', scheduleId: 'payroll' },
    { id: 'b', name: 'Job', amount: 140000, date: '2026-10-30', status: 'expected', scheduleId: 'payroll' },
    { id: 'other', name: 'Other job', amount: 50000, date: '2026-10-16', status: 'received', scheduleId: 'other' },
  ];
  const entries = nextScheduleOccurrences(b, payroll, '2026-10-15');
  assert.deepEqual(entries.map(x => x.date), ['2026-10-15', '2026-10-30', '2026-11-13']);
  assert.equal(entries[0].amount, 145000); assert.equal(entries[0].status, 'received');
  assert.equal(entries[1].status, 'expected'); assert.equal(entries[2].id, undefined);
  assert.equal(b.paychecks.length, 3);
});
test('income preview respects paused schedules and never revives deleted paydays', () => {
  const payroll: Schedule = { ...schedule, kind: 'paycheck', anchorDate: '2026-10-02', cadence: 'biweekly', nextIndex: 3 };
  const b = emptyBudget();
  assert.deepEqual(nextScheduleOccurrences(b, payroll, '2026-10-15').map(x => x.date), ['2026-11-13', '2026-11-27', '2026-12-11']);
  assert.deepEqual(nextScheduleOccurrences(b, { ...payroll, active: false }, '2026-10-15'), []);
});

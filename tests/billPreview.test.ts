import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBudget } from '../src/core/budget.ts';
import { nextBillOccurrences } from '../src/core/billPreview.ts';
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

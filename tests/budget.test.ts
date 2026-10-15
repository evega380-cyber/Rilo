import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, assignedCheck, cents, decodeBudget, emptyBudget, plan, removePaycheck, validDate } from '../src/core/budget.ts';
import type { Budget } from '../src/core/budget.ts';
function fixture(): Budget { return { ...emptyBudget(), paychecks: [{ id: 'p1', name: 'Job', date: '2026-10-02', amount: 140000, status: 'received' }, { id: 'p2', name: 'Job', date: '2026-10-16', amount: 140000, status: 'expected' }], bills: [{ id: 'b1', name: 'Rent', category: 'Housing', dueDate: '2026-10-10', amount: 35000, paid: false, paycheckId: null }] }; }
test('decimal input converts precisely to cents; rejects unsafe and malformed values', () => {
  assert.equal(cents('153.30'), 15330); assert.equal(cents('0.29'), 29);
  for (const value of ['-1', '0', 'NaN', 'Infinity', '1.001', '1e4', '', '$10', '1000000001']) assert.throws(() => cents(value));
});
test('calendar dates and biweekly dates cross month and leap-year boundaries', () => {
  for (const d of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', 'x']) assert.equal(validDate(d), false);
  assert.equal(validDate('2028-02-29'), true); assert.equal(addDays('2026-12-25', 14), '2027-01-08');
});
test('expected income never inflates available cash; received extra updates all totals once', () => {
  const b = fixture(); b.income = [{ id: 'i', name: 'Uber', date: '2026-10-08', paycheckId: 'p1', amount: 5000, status: 'expected' }];
  assert.equal(plan(b, 'p1').available, 105000); assert.equal(plan(b, 'p1').forecast, 110000); assert.equal(plan(b, 'p1').extraReceived, 0);
  b.income[0].status = 'received'; assert.equal(plan(b, 'p1').available, 110000); assert.equal(plan(b, 'p1').extraReceived, 5000);
  assert.equal(plan(b, 'p2').received, 0);
});
test('paid bills stay reserved so marking paid does not create spendable money', () => {
  const b = fixture(); const before = plan(b, 'p1'); b.bills[0].paid = true;
  assert.equal(plan(b, 'p1').available, before.available); assert.equal(plan(b, 'p1').unpaid, 0); assert.equal(plan(b, 'p1').paid, 35000);
});
test('automatic assignment uses due-date boundary; manual assignment overrides; early bills stay unassigned', () => {
  const b = fixture(); b.bills[0].dueDate = '2026-10-16'; assert.equal(assignedCheck(b, b.bills[0]), 'p2');
  b.bills[0].paycheckId = 'p1'; assert.equal(assignedCheck(b, b.bills[0]), 'p1');
  b.bills[0].paycheckId = null; b.bills[0].dueDate = '2026-10-01'; assert.equal(assignedCheck(b, b.bills[0]), null);
});
test('editing and removing income and bills immediately changes the derived plan', () => {
  const b = fixture(); b.bills[0].amount = 160000;
  assert.equal(plan(b, 'p1').forecast, -20000); assert.equal(plan(b, 'p1').percent, 100);
  b.bills = []; assert.equal(plan(b, 'p1').available, 140000);
});
test('deleting a paycheck with assignments is blocked; an empty paycheck can be deleted', () => {
  const b = fixture(); assert.throws(() => removePaycheck(b, 'p1')); assert.equal(removePaycheck(b, 'p2').paychecks.length, 1);
  b.income = [{ id: 'i', name: 'Tips', amount: 100, date: '2026-10-16', status: 'received', paycheckId: 'p2' }]; assert.throws(() => removePaycheck(b, 'p2'));
});
test('saved data round-trips and rejects broken references, invalid money, duplicates and bad versions', () => {
  const b = fixture(); assert.deepEqual(decodeBudget(JSON.stringify(b)), b);
  for (const change of [(x: Budget) => { x.version = 1 as 2; }, (x: Budget) => { x.bills[0].amount = 1.1; }, (x: Budget) => { x.bills[0].paycheckId = 'missing'; }, (x: Budget) => { x.bills[0].id = 'p1'; }]) { const x = fixture(); change(x); assert.throws(() => decodeBudget(JSON.stringify(x))); }
  assert.throws(() => decodeBudget('{')); assert.throws(() => decodeBudget('null'));
});
test('empty budget yields finite zero totals', () => {
  const p = plan(emptyBudget(), 'none'); assert.equal(p.available, 0); assert.equal(p.percent, 0); assert.equal(p.forecast, 0);
});

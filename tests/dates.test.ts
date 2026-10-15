import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateInput, displayDate, parseDateInput } from '../src/core/dates.ts';

test('month/day/year input round-trips into unchanged calendar storage', () => {
  assert.equal(parseDateInput('10/15/2026'), '2026-10-15');
  assert.equal(parseDateInput('1/2/2027'), '2027-01-02');
  assert.equal(dateInput('2026-10-15'), '10/15/2026');
  assert.equal(displayDate('2026-10-15'), 'Oct 15, 2026');
});
test('date input rejects impossible dates and ambiguous old formats', () => {
  for (const input of ['02/29/2026', '13/01/2026', '04/31/2026', '2026-10-15', '', '15/10/2026']) assert.equal(parseDateInput(input), null);
  assert.equal(parseDateInput('02/29/2028'), '2028-02-29');
});
test('date-only display never changes the day near year and month boundaries', () => {
  assert.equal(displayDate('2027-01-01'), 'Jan 1, 2027');
  assert.equal(displayDate('2028-02-29'), 'Feb 29, 2028');
  assert.equal(displayDate(undefined), ''); assert.equal(dateInput(''), '');
});

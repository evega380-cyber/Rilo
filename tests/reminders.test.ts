import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBudget } from '../src/core/budget.ts';
import { billReminderGroups, buildReminderEvents, decodeReminderSettings, defaultReminderSettings, parseReminderTime, reminderChanges, REMINDER_SCOPE } from '../src/core/reminders.ts';
function fixture() {
  const b = emptyBudget(); b.bills = [
    { id: 'due', name: 'Rent', amount: 35000, dueDate: '2026-10-15', category: '', paid: false, paycheckId: null },
    { id: 'old', name: 'Phone', amount: 6000, dueDate: '2026-10-14', category: '', paid: false, paycheckId: null },
    { id: 'soon', name: 'Car', amount: 37800, dueDate: '2026-10-22', category: '', paid: false, paycheckId: null },
    { id: 'later', name: 'Light', amount: 15000, dueDate: '2026-10-23', category: '', paid: false, paycheckId: null },
    { id: 'paid', name: 'Paid bill', amount: 1000, dueDate: '2026-10-15', category: '', paid: true, paycheckId: null },
  ]; return b;
}
const enabled = { ...defaultReminderSettings, enabled: true };
test('reminder list partitions overdue/today/upcoming with inclusive 7/30 day limits and ignores paid bills', () => {
  const b = fixture(); const groups = billReminderGroups(b, '2026-10-15');
  assert.deepEqual(groups.overdue.map(x => x.id), ['old']); assert.deepEqual(groups.today.map(x => x.id), ['due']); assert.deepEqual(groups.upcoming.map(x => x.id), ['soon']);
  assert.equal(billReminderGroups(b, '2026-10-15', 30).upcoming.length, 2);
});
test('alerts default off; enabled creates advance and due-day events only in the future', () => {
  const b = fixture(); const now = new Date(2026, 9, 15, 10);
  assert.deepEqual(buildReminderEvents(b, defaultReminderSettings, now), []);
  const events = buildReminderEvents(b, enabled, now);
  assert.ok(events.every(x => x.fireAt > now.getTime()));
  assert.ok(events.every(x => !['paid', 'old', 'due'].includes(x.billId)));
  assert.deepEqual(events.filter(x => x.billId === 'soon').map(x => x.leadDays), [3, 0]);
});
test('due-day-only setting has no duplicate advance alert and respects selected local time', () => {
  const b = fixture(); b.bills = [b.bills[0]];
  const events = buildReminderEvents(b, { ...enabled, leadDays: 0, hour: 18, minute: 30 }, new Date(2026, 9, 15, 9));
  assert.equal(events.length, 1); assert.equal(new Date(events[0].fireAt).getHours(), 18); assert.equal(new Date(events[0].fireAt).getMinutes(), 30);
});
test('unchanged queue is idempotent; duplicate owned alerts are removed and other notifications left alone', () => {
  const events = buildReminderEvents(fixture(), enabled, new Date(2026, 9, 10));
  const existing = events.map((e, i) => ({ id: String(i), scope: REMINDER_SCOPE, key: e.key }));
  const same = reminderChanges(existing, events); assert.deepEqual(same.add, []); assert.deepEqual(same.cancel, []);
  const changed = reminderChanges([...existing, { ...existing[0], id: 'duplicate' }, { id: 'other', scope: 'calendar', key: 'x' }], events);
  assert.deepEqual(changed.cancel, ['duplicate']);
});
test('paying, deleting, editing, or restoring bills removes old alerts and adds only new event keys', () => {
  const b = fixture(); const now = new Date(2026, 9, 10); const old = buildReminderEvents(b, enabled, now);
  b.bills[0].paid = true; b.bills = b.bills.filter(x => x.id !== 'old'); b.bills.find(x => x.id === 'soon')!.dueDate = '2026-10-25';
  const next = buildReminderEvents(b, enabled, now);
  const diff = reminderChanges(old.map(e => ({ id: e.key, key: e.key, scope: REMINDER_SCOPE })), next);
  assert.ok(diff.cancel.includes(old.find(x => x.billId === 'due')!.key)); assert.ok(diff.add.some(x => x.billId === 'soon'));
  const restore = reminderChanges(next.map(e => ({ id: e.key, key: e.key, scope: REMINDER_SCOPE })), []);
  assert.equal(restore.cancel.length, next.length);
});
test('turning off cancels all owned pending alerts while leaving unrelated notifications', () => {
  const diff = reminderChanges([{ id: 'owned', scope: REMINDER_SCOPE, key: 'old' }, { id: 'other', scope: 'other' }], []);
  assert.deepEqual(diff.cancel, ['owned']); assert.equal(diff.count, 0);
});
test('queue limit uses earliest reminders and reports remaining capacity without duplicates', () => {
  const events = buildReminderEvents(fixture(), enabled, new Date(2026, 9, 10));
  const diff = reminderChanges([], events, 2);
  assert.deepEqual(diff.add, events.slice(0, 2)); assert.equal(diff.remaining, events.length - 2);
  assert.equal(reminderChanges([], events, -2).count, 0);
});
test('time/settings validation rejects malformed and unsupported values', () => {
  assert.deepEqual(parseReminderTime('9:05'), { hour: 9, minute: 5 }); assert.deepEqual(parseReminderTime('00:00'), { hour: 0, minute: 0 });
  for (const t of ['24:00', '12:60', '9', '9:5', '-1:00', 'bad']) assert.equal(parseReminderTime(t), null);
  assert.deepEqual(decodeReminderSettings(JSON.stringify(enabled)), enabled);
  for (const invalid of [{ ...enabled, leadDays: 2 }, { ...enabled, hour: 24 }, { ...enabled, minute: -1 }, { ...enabled, enabled: 'yes' }, { ...enabled, version: 2 }]) assert.throws(() => decodeReminderSettings(JSON.stringify(invalid)));
});
test('advance reminders preserve 9 AM across the daylight-saving boundary and year rollover', () => {
  const original = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const b = fixture(); b.bills = [{ ...b.bills[0], dueDate: '2026-11-03' }];
    const events = buildReminderEvents(b, enabled, new Date(2026, 9, 30));
    assert.equal(events.length, 2); assert.ok(events.every(e => new Date(e.fireAt).getHours() === 9));
    assert.equal(events[1].fireAt - events[0].fireAt, 73 * 60 * 60 * 1000);
    b.bills[0].dueDate = '2027-01-02';
    const year = buildReminderEvents(b, enabled, new Date(2026, 11, 28));
    assert.equal(new Date(year[0].fireAt).getFullYear(), 2026); assert.equal(new Date(year[1].fireAt).getFullYear(), 2027);
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

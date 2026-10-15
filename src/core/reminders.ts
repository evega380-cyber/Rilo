import { addDays, validDate } from './budget.ts';
import type { Bill, Budget } from './budget';
export type ReminderSettings = { version: 1; enabled: boolean; leadDays: 0 | 1 | 3 | 7; hour: number; minute: number };
export const defaultReminderSettings: ReminderSettings = { version: 1, enabled: false, leadDays: 3, hour: 9, minute: 0 };
export const REMINDER_SCOPE = 'rilo-bills-v1';
export const REMINDER_LIMIT = 60;
export type ReminderEvent = { key: string; billId: string; name: string; dueDate: string; leadDays: number; fireAt: number };
export function decodeReminderSettings(raw: string): ReminderSettings {
  const s = JSON.parse(raw);
  if (!s || s.version !== 1 || typeof s.enabled !== 'boolean' || ![0, 1, 3, 7].includes(s.leadDays) ||
    !Number.isInteger(s.hour) || s.hour < 0 || s.hour > 23 || !Number.isInteger(s.minute) || s.minute < 0 || s.minute > 59) throw new Error('Invalid reminder settings.');
  return { version: 1, enabled: s.enabled, leadDays: s.leadDays, hour: s.hour, minute: s.minute };
}
export function parseReminderTime(text: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}
export function billReminderGroups(budget: Budget, date: string, days = 7): { overdue: Bill[]; today: Bill[]; upcoming: Bill[] } {
  const unpaid = budget.bills.filter(b => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  return { overdue: unpaid.filter(b => b.dueDate < date), today: unpaid.filter(b => b.dueDate === date), upcoming: unpaid.filter(b => b.dueDate > date && b.dueDate <= addDays(date, days)) };
}
// Calendar-day subtraction first; local construction preserves the user's chosen clock time across DST.
export function buildReminderEvents(budget: Budget, settings: ReminderSettings, now: Date): ReminderEvent[] {
  if (!settings.enabled) return [];
  const events: ReminderEvent[] = [];
  for (const bill of budget.bills) {
    if (bill.paid || !validDate(bill.dueDate)) continue;
    for (const leadDays of settings.leadDays ? [settings.leadDays, 0] : [0]) {
      const [year, month, day] = addDays(bill.dueDate, -leadDays).split('-').map(Number);
      const fireAt = new Date(year, month - 1, day, settings.hour, settings.minute, 0, 0).getTime();
      if (fireAt <= now.getTime()) continue;
      const key = JSON.stringify([bill.id, bill.name, bill.dueDate, leadDays, fireAt]);
      events.push({ key, billId: bill.id, name: bill.name, dueDate: bill.dueDate, leadDays, fireAt });
    }
  }
  return events.sort((a, b) => a.fireAt - b.fireAt || a.key.localeCompare(b.key));
}
export type PendingReminder = { id: string; scope?: unknown; key?: unknown };
// Leave unrelated notifications alone and deduplicate only this feature's queue.
export function reminderChanges(existing: PendingReminder[], desired: ReminderEvent[], capacity = REMINDER_LIMIT) {
  const wanted = desired.slice(0, Math.max(0, capacity));
  const keys = new Set(wanted.map(e => e.key));
  const retained = new Set<string>();
  const cancel: string[] = [];
  for (const pending of existing) {
    if (pending.scope !== REMINDER_SCOPE) continue;
    if (typeof pending.key === 'string' && keys.has(pending.key) && !retained.has(pending.key)) retained.add(pending.key);
    else cancel.push(pending.id);
  }
  return { cancel, add: wanted.filter(e => !retained.has(e.key)), count: wanted.length, remaining: desired.length - wanted.length };
}

import { addDays, today, validDate } from './budget.ts';
import type { Bill, Budget, Paycheck } from './budget';

export type Cadence = 'weekly' | 'biweekly' | 'monthly';
export type Schedule = {
  id: string;
  kind: 'bill' | 'paycheck';
  name: string;
  amount: number;
  category: string;
  cadence: Cadence;
  anchorDate: string;
  nextIndex: number;
  active: boolean;
  endDate: string | null;
};
export const cadenceLabel = (c: Cadence) => ({ weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' })[c];

// Calculate every occurrence from the original date, so Jan 31 -> Feb 28 -> Mar 31.
export function occurrenceDate(anchor: string, cadence: Cadence, index: number): string {
  if (cadence !== 'monthly') return addDays(anchor, index * (cadence === 'weekly' ? 7 : 14));
  const date = new Date(`${anchor}T12:00:00Z`);
  const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index, 1, 12));
  const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  month.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return month.toISOString().slice(0, 10);
}

export function startSchedule(budget: Budget, kind: Schedule['kind'], entryId: string, cadence: Cadence, id: string): Budget {
  const item = kind === 'bill' ? budget.bills.find(b => b.id === entryId) : budget.paychecks.find(p => p.id === entryId);
  if (!item) throw new Error('This entry no longer exists.');
  if (item.scheduleId) throw new Error('This entry already belongs to a schedule.');
  const anchorDate = 'dueDate' in item ? item.dueDate : item.date;
  if (anchorDate < addDays(today(), -366)) throw new Error('Start a schedule from an entry within the past year or a future entry.');
  const schedule: Schedule = { id, kind, name: item.name, amount: item.amount, category: 'category' in item ? item.category : '', cadence, anchorDate, nextIndex: 1, active: true, endDate: null };
  const next: Budget = { ...budget, schedules: [...(budget.schedules ?? []), schedule] };
  if (kind === 'bill') next.bills = budget.bills.map(b => b.id === entryId ? { ...b, scheduleId: id } : b);
  else next.paychecks = budget.paychecks.map(p => p.id === entryId ? { ...p, scheduleId: id } : p);
  return next;
}

// Append-only generation. A persisted cursor prevents deleted or edited occurrences reappearing.
// Each generated entry starts unpaid / expected, regardless of the seed entry's state.
export function expandSchedules(budget: Budget, through: string): Budget {
  if (!validDate(through)) throw new Error('Invalid planning horizon.');
  let result = budget;
  const paychecks = [...budget.paychecks];
  const bills = [...budget.bills];
  const ids = new Set([...paychecks, ...bills, ...budget.income].map(i => i.id));
  const schedules = (budget.schedules ?? []).map(schedule => {
    if (!schedule.active) return schedule;
    let index = schedule.nextIndex;
    for (let count = 0; count < 20000; count++) {
      const date = occurrenceDate(schedule.anchorDate, schedule.cadence, index);
      if (date > through || (schedule.endDate && date > schedule.endDate)) break;
      const id = `repeat:${schedule.id}:${index}`;
      const exists = schedule.kind === 'paycheck'
        ? paychecks.some(p => p.date === date && p.name === schedule.name && p.amount === schedule.amount)
        : bills.some(b => b.dueDate === date && b.name === schedule.name && b.amount === schedule.amount);
      if (!ids.has(id) && !exists) {
        const base = { id, name: schedule.name, amount: schedule.amount, scheduleId: schedule.id };
        if (schedule.kind === 'paycheck') paychecks.push({ ...base, date, status: 'expected' } satisfies Paycheck);
        else bills.push({ ...base, dueDate: date, category: schedule.category, paid: false, paycheckId: null } satisfies Bill);
        ids.add(id);
      }
      index++;
    }
    if (index === schedule.nextIndex) return schedule;
    result = { ...result };
    return { ...schedule, nextIndex: index };
  });
  return result === budget ? budget : { ...result, schedules, paychecks, bills };
}

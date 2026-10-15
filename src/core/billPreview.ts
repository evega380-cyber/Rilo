import type { Budget } from './budget';
import { occurrenceDate } from './recurrence.ts';
import type { Schedule } from './recurrence';

export type BillPreview = { date: string; amount: number; id?: string; paid?: boolean };
// Use real occurrences first, preserving edited dates/amounts and deletion cursors.
// Supplement beyond the planning window without creating spendable/planned records.
export function nextBillOccurrences(budget: Budget, schedule: Schedule, from: string): BillPreview[] {
  const entries: BillPreview[] = budget.bills.filter(b => b.scheduleId === schedule.id && b.dueDate >= from)
    .map(b => ({ date: b.dueDate, amount: b.amount, id: b.id, paid: b.paid }));
  if (schedule.active) {
    let added = 0;
    for (let index = schedule.nextIndex; index < 20000 && added < 3; index++) {
      const date = occurrenceDate(schedule.anchorDate, schedule.cadence, index);
      if (schedule.endDate && date > schedule.endDate) break;
      if (date < from) continue;
      const existing = budget.bills.some(b => b.dueDate === date && b.name === schedule.name && b.amount === schedule.amount);
      if (!existing) { entries.push({ date, amount: schedule.amount }); added++; }
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
}

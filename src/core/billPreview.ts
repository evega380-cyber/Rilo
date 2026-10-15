import type { Budget, Status } from './budget';
import { occurrenceDate } from './recurrence.ts';
import type { Schedule } from './recurrence';

export type BillPreview = { date: string; amount: number; id?: string; paid?: boolean; status?: Status };
// Use real occurrences first, preserving edited dates/amounts and deletion cursors.
// Supplement beyond the planning window without creating spendable/planned records.
export function nextScheduleOccurrences(budget: Budget, schedule: Schedule, from: string): BillPreview[] {
  const entries: BillPreview[] = schedule.kind === 'bill'
    ? budget.bills.filter(b => b.scheduleId === schedule.id && b.dueDate >= from)
      .map(b => ({ date: b.dueDate, amount: b.amount, id: b.id, paid: b.paid }))
    : budget.paychecks.filter(p => p.scheduleId === schedule.id && p.date >= from)
      .map(p => ({ date: p.date, amount: p.amount, id: p.id, status: p.status }));
  if (schedule.active) {
    let added = 0;
    for (let index = schedule.nextIndex; index < 20000 && added < 3; index++) {
      const date = occurrenceDate(schedule.anchorDate, schedule.cadence, index);
      if (schedule.endDate && date > schedule.endDate) break;
      if (date < from) continue;
      const existing = schedule.kind === 'bill'
        ? budget.bills.some(b => b.dueDate === date && b.name === schedule.name && b.amount === schedule.amount)
        : budget.paychecks.some(p => p.date === date && p.name === schedule.name && p.amount === schedule.amount);
      if (!existing) { entries.push({ date, amount: schedule.amount }); added++; }
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
}

// Compatibility alias for callers that only preview bills.
export const nextBillOccurrences = nextScheduleOccurrences;

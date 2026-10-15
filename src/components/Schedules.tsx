import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { cents, decodeBudget, money, today, validDate } from '../core/budget';
import type { Bill } from '../core/budget';
import { nextBillOccurrences } from '../core/billPreview';
import { cadenceLabel, occurrenceDate } from '../core/recurrence';
import type { Schedule } from '../core/recurrence';
import { useBudget } from '../state/BudgetProvider';
import { Button, Field } from './ui';
import { styles as s } from './styles';

export function Schedules({ kind, onEditBill }: { kind: Schedule['kind']; onEditBill?: (bill: Bill) => void }) {
  const { budget, update } = useBudget();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const schedules = (budget.schedules ?? []).filter(x => x.kind === kind);
  function edit(schedule: Schedule) {
    setEditing(schedule.id); setName(schedule.name); setAmount(String(schedule.amount / 100));
    setCategory(schedule.category); setEndDate(schedule.endDate ?? ''); setError('');
  }
  function save(schedule: Schedule) {
    try {
      if (!name.trim()) throw new Error('Enter a schedule name.');
      const value = cents(amount);
      if (endDate && (!validDate(endDate) || endDate < schedule.anchorDate)) throw new Error('End date must be a real date on or after the first occurrence.');
      const next = decodeBudget(JSON.stringify({ ...budget, schedules: (budget.schedules ?? []).map(x => x.id === schedule.id ? { ...x, name: name.trim(), amount: value, category: category.trim(), endDate: endDate || null } : x) }));
      update(() => next); setEditing(null); setError('');
    } catch (e) { setError((e as Error).message); }
  }
  if (!schedules.length) return null;
  return <View style={{ marginTop: 20 }}><Text style={s.sectionTitle}>Repeating {kind === 'bill' ? 'bills' : 'paychecks'}</Text><Text style={s.goalText}>{kind === 'bill' ? 'One card per repeating bill. Review the next three dates or manage individual payments.' : 'Rilo plans 90 days ahead. New paychecks are expected; existing entries keep their own edits and status.'}</Text>
    {schedules.map(schedule => {
      const next = occurrenceDate(schedule.anchorDate, schedule.cadence, schedule.nextIndex);
      const ended = !!schedule.endDate && next > schedule.endDate;
      const occurrences = budget.bills.filter(b => b.scheduleId === schedule.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const preview = kind === 'bill' ? nextBillOccurrences(budget, schedule, today()) : [];
      const overdue = occurrences.filter(b => !b.paid && b.dueDate < today()).length;
      return <View key={schedule.id} style={[s.section, { marginTop: 16 }]}>
        <Text style={s.itemTitle}>{schedule.name} · {money(schedule.amount)}</Text>
        <Text style={s.itemSubtitle}>{cadenceLabel(schedule.cadence)} · {(kind === 'bill' ? !!schedule.endDate && schedule.endDate < today() : ended) ? 'Ended' : schedule.active ? 'Active' : 'Paused'}</Text>
        {kind === 'bill' ? <>
          <Text style={[s.cardLabel, { marginTop: 18, fontSize: 12 }]}>NEXT 3 OCCURRENCES</Text>
          {!preview.length && <Text style={s.goalText}>No upcoming occurrences.</Text>}
          {preview.map((entry, i) => <View key={entry.id ?? `preview-${i}`} style={[s.rowBetween, { marginTop: 12, gap: 12 }]}>
            <View style={{ flex: 1 }}><Text style={s.itemTitle}>{entry.date}</Text><Text style={s.itemSubtitle}>{entry.id ? entry.paid ? 'Paid' : 'Unpaid' : 'Upcoming · not yet in your plan'}</Text></View>
            <Text style={s.itemAmount}>{money(entry.amount)}</Text>
          </View>)}
          {!!overdue && <Text style={[s.red, { marginTop: 14 }]}>{overdue} overdue payment(s)</Text>}
          <Button title={expanded === schedule.id ? 'Hide occurrences' : `Manage occurrences for ${schedule.name}`} secondary onPress={() => { setExpanded(expanded === schedule.id ? null : schedule.id); setDeleting(null); }} />
          {expanded === schedule.id && <View style={{ marginTop: 16 }}>
            <Text style={s.sectionTitle}>All payments</Text>
            {!occurrences.length && <Text style={s.goalText}>No saved payments. Future repeats follow this schedule.</Text>}
            {occurrences.map(bill => <View key={bill.id} style={{ borderTopWidth: 1, borderTopColor: '#17446D', marginTop: 16, paddingTop: 16 }}>
              <View style={s.rowBetween}><Text style={s.itemTitle}>{bill.dueDate}</Text><Text style={s.itemAmount}>{money(bill.amount)}</Text></View>
              <Text style={s.itemSubtitle}>{bill.name} · {bill.paid ? 'Paid' : bill.dueDate < today() ? 'Overdue' : 'Unpaid'}</Text>
              <Button title={bill.paid ? `Mark ${bill.dueDate} unpaid` : `Mark ${bill.dueDate} paid`} secondary onPress={() => update(b => ({ ...b, bills: b.bills.map(x => x.id === bill.id ? { ...x, paid: !x.paid } : x) }))} />
              <Button title={`Edit payment ${bill.dueDate}`} secondary onPress={() => onEditBill?.(bill)} />
              {deleting === bill.id ? <>
                <Text style={[s.red, { marginTop: 12 }]}>Delete only this payment?</Text>
                <Button title="Confirm delete payment" secondary onPress={() => { update(b => ({ ...b, bills: b.bills.filter(x => x.id !== bill.id) })); setDeleting(null); }} />
                <Button title="Keep payment" secondary onPress={() => setDeleting(null)} />
              </> : <Button title={`Delete payment ${bill.dueDate}`} secondary onPress={() => setDeleting(bill.id)} />}
            </View>)}
          </View>}
        </> : <>
          <Text style={s.itemSubtitle}>Next to generate: {ended ? 'None' : next}{schedule.endDate ? ` · Ends ${schedule.endDate}` : ''}</Text>
          <Text style={s.itemSubtitle}>Upcoming entries already appear in your paychecks below.</Text>
        </>}
        {editing === schedule.id ? <>
          <Field label="Schedule name" value={name} onChange={setName} />
          <Field label="Future amount ($)" numeric value={amount} onChange={setAmount} />
          {kind === 'bill' && <Field label="Future category" value={category} onChange={setCategory} />}
          <Field label="End date (YYYY-MM-DD; blank for no end)" value={endDate} onChange={setEndDate} />
          <Text style={s.goalText}>Settings apply only to occurrences not generated yet. Edit already listed entries individually, including any beyond a new end date.</Text>
          {!!error && <Text accessibilityRole="alert" style={s.red}>{error}</Text>}
          <Button title="Save future settings" onPress={() => save(schedule)} />
          <Button title="Cancel schedule edit" secondary onPress={() => setEditing(null)} />
        </> : <Button title={`Edit schedule for ${schedule.name}`} secondary onPress={() => edit(schedule)} />}
        {(kind !== 'bill' || editing === schedule.id) && <><Button title={schedule.active ? `Pause repeats for ${schedule.name}` : `Resume repeats for ${schedule.name}`} secondary onPress={() => update(b => ({ ...b, schedules: (b.schedules ?? []).map(x => x.id === schedule.id ? { ...x, active: !x.active } : x) }))} />
        <Text style={s.itemSubtitle}>Pausing leaves existing entries in place. Resuming also generates missed dates.</Text></>}
      </View>;
    })}
  </View>;
}

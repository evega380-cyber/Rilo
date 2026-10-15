import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { cents, decodeBudget, money, removePaycheck, today } from '../core/budget';
import { dateInput, displayDate, parseDateInput } from '../core/dates';
import type { Bill, Paycheck } from '../core/budget';
import { nextScheduleOccurrences } from '../core/billPreview';
import { cadenceLabel } from '../core/recurrence';
import type { Schedule } from '../core/recurrence';
import { useBudget } from '../state/BudgetProvider';
import { Button, Field } from './ui';
import { styles as s } from './styles';

export function Schedules({ kind, onEditEntry }: { kind: Schedule['kind']; onEditEntry: (entry: Bill | Paycheck) => void }) {
  const { budget, update } = useBudget();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manageError, setManageError] = useState('');
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
    setCategory(schedule.category); setEndDate(dateInput(schedule.endDate ?? '')); setError('');
  }
  function save(schedule: Schedule) {
    try {
      if (!name.trim()) throw new Error('Enter a schedule name.');
      const value = cents(amount);
      const isoEnd = endDate.trim() ? parseDateInput(endDate) : null;
      if (endDate.trim() && (!isoEnd || isoEnd < schedule.anchorDate)) throw new Error('Use MM/DD/YYYY for an end date on or after the first occurrence.');
      const next = decodeBudget(JSON.stringify({ ...budget, schedules: (budget.schedules ?? []).map(x => x.id === schedule.id ? { ...x, name: name.trim(), amount: value, category: category.trim(), endDate: isoEnd } : x) }));
      update(() => next); setEditing(null); setError('');
    } catch (e) { setError((e as Error).message); }
  }
  if (!schedules.length) return null;
  return <View style={{ marginTop: 20 }}><Text style={s.sectionTitle}>Repeating {kind === 'bill' ? 'bills' : 'income'}</Text><Text style={s.goalText}>{kind === 'bill' ? 'One card per repeating bill. Review the next three dates or manage individual payments.' : 'One card per repeating income source. Review the next three paydays or manage individual paychecks.'}</Text>
    {schedules.map(schedule => {
      const occurrences: (Bill | Paycheck)[] = kind === 'bill'
        ? budget.bills.filter(b => b.scheduleId === schedule.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        : budget.paychecks.filter(p => p.scheduleId === schedule.id).sort((a, b) => a.date.localeCompare(b.date));
      const preview = nextScheduleOccurrences(budget, schedule, today());
      const overdue = occurrences.filter(b => 'paid' in b && !b.paid && b.dueDate < today()).length;
      return <View key={schedule.id} style={[s.section, { marginTop: 16 }]}>
        <Text style={s.itemTitle}>{schedule.name} · {money(schedule.amount)}</Text>
        <Text style={s.itemSubtitle}>{cadenceLabel(schedule.cadence)} · {(!!schedule.endDate && schedule.endDate < today()) ? 'Ended' : schedule.active ? 'Active' : 'Paused'}</Text>
        <>
          <Text style={[s.cardLabel, { marginTop: 18, fontSize: 12 }]}>NEXT 3 OCCURRENCES</Text>
          {!preview.length && <Text style={s.goalText}>No upcoming occurrences.</Text>}
          {preview.map((entry, i) => <View key={entry.id ?? `preview-${i}`} style={[s.rowBetween, { marginTop: 12, gap: 12 }]}>
            <View style={{ flex: 1 }}><Text style={s.itemTitle}>{displayDate(entry.date)}</Text><Text style={s.itemSubtitle}>{entry.id ? kind === 'bill' ? entry.paid ? 'Paid' : 'Unpaid' : entry.status === 'received' ? 'Received' : 'Expected' : 'Upcoming · not yet in your plan'}</Text></View>
            <Text style={s.itemAmount}>{money(entry.amount)}</Text>
          </View>)}
          {!!overdue && <Text style={[s.red, { marginTop: 14 }]}>{overdue} overdue payment(s)</Text>}
          <Button title={expanded === schedule.id ? 'Hide occurrences' : `Manage occurrences for ${schedule.name}`} secondary onPress={() => { setExpanded(expanded === schedule.id ? null : schedule.id); setDeleting(null); setManageError(''); }} />
          {expanded === schedule.id && <View style={{ marginTop: 16 }}>
            <Text style={s.sectionTitle}>{kind === 'bill' ? 'All payments' : 'All paychecks'}</Text>
            {!!manageError && <Text accessibilityRole="alert" style={s.red}>{manageError}</Text>}
            {!occurrences.length && <Text style={s.goalText}>No saved occurrences. Future repeats follow this schedule.</Text>}
            {occurrences.map(entry => {
              const date = 'dueDate' in entry ? entry.dueDate : entry.date;
              const received = 'paid' in entry ? entry.paid : entry.status === 'received';
              return <View key={entry.id} style={{ borderTopWidth: 1, borderTopColor: '#17446D', marginTop: 16, paddingTop: 16 }}>
                <View style={s.rowBetween}><Text style={s.itemTitle}>{displayDate(date)}</Text><Text style={s.itemAmount}>{money(entry.amount)}</Text></View>
                <Text style={s.itemSubtitle}>{entry.name} · {'paid' in entry ? entry.paid ? 'Paid' : date < today() ? 'Overdue' : 'Unpaid' : entry.status === 'received' ? 'Received' : 'Expected'}</Text>
                <Button title={`Mark ${displayDate(date)} ${kind === 'bill' ? received ? 'unpaid' : 'paid' : received ? 'expected' : 'received'}`} secondary onPress={() => update(b => kind === 'bill'
                  ? { ...b, bills: b.bills.map(x => x.id === entry.id ? { ...x, paid: !x.paid } : x) }
                  : { ...b, paychecks: b.paychecks.map(x => x.id === entry.id ? { ...x, status: x.status === 'received' ? 'expected' : 'received' } : x) })} />
                <Button title={`Edit ${kind === 'bill' ? 'payment' : 'paycheck'} ${displayDate(date)}`} secondary onPress={() => onEditEntry(entry)} />
                {deleting === entry.id ? <>
                  <Text style={[s.red, { marginTop: 12 }]}>Delete only this occurrence?</Text>
                  <Button title="Confirm delete occurrence" secondary onPress={() => {
                    try {
                      const next = kind === 'bill' ? { ...budget, bills: budget.bills.filter(x => x.id !== entry.id) } : removePaycheck(budget, entry.id);
                      update(() => next); setDeleting(null); setManageError('');
                    } catch (e) { setManageError((e as Error).message); }
                  }} />
                  <Button title="Keep occurrence" secondary onPress={() => { setDeleting(null); setManageError(''); }} />
                </> : <Button title={`Delete ${kind === 'bill' ? 'payment' : 'paycheck'} ${displayDate(date)}`} secondary onPress={() => { setDeleting(entry.id); setManageError(''); }} />}
              </View>;
            })}
          </View>}
        </>
        {editing === schedule.id ? <>
          <Field label="Schedule name" value={name} onChange={setName} />
          <Field label="Future amount ($)" numeric value={amount} onChange={setAmount} />
          {kind === 'bill' && <Field label="Future category" value={category} onChange={setCategory} />}
          <Field label="End date (MM/DD/YYYY; blank for no end)" value={endDate} onChange={setEndDate} />
          <Text style={s.goalText}>Settings apply only to occurrences not generated yet. Edit already listed entries individually, including any beyond a new end date.</Text>
          {!!error && <Text accessibilityRole="alert" style={s.red}>{error}</Text>}
          <Button title="Save future settings" onPress={() => save(schedule)} />
          <Button title="Cancel schedule edit" secondary onPress={() => setEditing(null)} />
        </> : <Button title={`Edit schedule for ${schedule.name}`} secondary onPress={() => edit(schedule)} />}
        {editing === schedule.id && <><Button title={schedule.active ? `Pause repeats for ${schedule.name}` : `Resume repeats for ${schedule.name}`} secondary onPress={() => update(b => ({ ...b, schedules: (b.schedules ?? []).map(x => x.id === schedule.id ? { ...x, active: !x.active } : x) }))} />
        <Text style={s.itemSubtitle}>Pausing leaves existing entries in place. Resuming also generates missed dates.</Text></>}
      </View>;
    })}
  </View>;
}

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { cents, decodeBudget, money, validDate } from '../core/budget';
import { cadenceLabel, occurrenceDate } from '../core/recurrence';
import type { Schedule } from '../core/recurrence';
import { useBudget } from '../state/BudgetProvider';
import { Button, Field } from './ui';
import { styles as s } from './styles';

export function Schedules({ kind }: { kind: Schedule['kind'] }) {
  const { budget, update } = useBudget();
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
  return <View style={{ marginTop: 20 }}><Text style={s.sectionTitle}>Repeating {kind === 'bill' ? 'bills' : 'paychecks'}</Text><Text style={s.goalText}>Rilo plans 90 days ahead when you open or use the app. New paychecks are expected; new bills are unpaid. Existing entries keep their own edits and status.</Text>
    {schedules.map(schedule => {
      const next = occurrenceDate(schedule.anchorDate, schedule.cadence, schedule.nextIndex);
      const ended = !!schedule.endDate && next > schedule.endDate;
      return <View key={schedule.id} style={[s.section, { marginTop: 16 }]}>
        <Text style={s.itemTitle}>{schedule.name} · {money(schedule.amount)}</Text>
        <Text style={s.itemSubtitle}>{cadenceLabel(schedule.cadence)} · {ended ? 'Ended' : schedule.active ? 'Active' : 'Paused'}</Text>
        <Text style={s.itemSubtitle}>Next to generate: {ended ? 'None' : next}{schedule.endDate ? ` · Ends ${schedule.endDate}` : ''}</Text>
        <Text style={s.itemSubtitle}>Upcoming entries already appear in your {kind === 'bill' ? 'bills' : 'paychecks'} below.</Text>
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
        <Button title={schedule.active ? `Pause repeats for ${schedule.name}` : `Resume repeats for ${schedule.name}`} secondary onPress={() => update(b => ({ ...b, schedules: (b.schedules ?? []).map(x => x.id === schedule.id ? { ...x, active: !x.active } : x) }))} />
        <Text style={s.itemSubtitle}>Pausing leaves existing entries in place. Resuming also generates missed dates.</Text>
      </View>;
    })}
  </View>;
}

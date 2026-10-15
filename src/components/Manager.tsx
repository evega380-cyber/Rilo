import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useBudget } from '../state/BudgetProvider';
import { addDays, assignedCheck, Bill, cents, Income, money, orderedChecks, Paycheck, removePaycheck, Status, today } from '../core/budget';
import { Button, Choices, Field, Screen } from './ui';
import { Cadence, cadenceLabel, occurrenceDate, startSchedule } from '../core/recurrence';
import { dateInput, displayDate, parseDateInput } from '../core/dates';
import { Schedules } from './Schedules';
import { styles as s } from './styles';
type Kind = 'paychecks' | 'income' | 'bills';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function Manager({ kind }: { kind: Kind }) {
  const { budget, update } = useBudget();
  const checks = orderedChecks(budget);
  const scrollRef = useRef<ScrollView>(null);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>(kind === 'bills' ? 'monthly' : 'biweekly');
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dateText, setDate] = useState(dateInput(today()));
  const [status, setStatus] = useState<Status>('expected');
  const [category, setCategory] = useState('');
  const [assignment, setAssignment] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const items: (Paycheck | Income | Bill)[] = kind === 'paychecks' ? checks.filter(p => !p.scheduleId) : kind === 'income' ? budget.income : budget.bills.filter(b => !b.scheduleId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  function edit(item?: Paycheck | Income | Bill) {
    setEditing(item?.id ?? null); setName(item?.name ?? (kind === 'paychecks' ? 'Regular paycheck' : ''));
    setAmount(item ? String(item.amount / 100) : '');
    setDate(dateInput(item ? ('dueDate' in item ? item.dueDate : item.date) : today()));
    setStatus(item && 'status' in item ? item.status : 'expected');
    setCategory(item && 'category' in item ? item.category : '');
    setAssignment(item && 'paycheckId' in item ? item.paycheckId ?? '' : kind === 'income' ? checks[0]?.id ?? '' : '');
    setError(''); setOpen(true); setDeleting(null); setRepeating(null);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  }
  function save() {
    try {
      if (!name.trim()) throw new Error('Enter a name.');
      const date = parseDateInput(dateText);
      if (!date) throw new Error('Use a real date in MM/DD/YYYY format.');
      const value = cents(amount); const id = editing ?? uid();
      const scheduleId = kind === 'paychecks' ? budget.paychecks.find(x => x.id === id)?.scheduleId : budget.bills.find(x => x.id === id)?.scheduleId;
      if ((kind === 'income' || (kind === 'bills' && assignment)) && !checks.some(p => p.id === assignment)) throw new Error('Add and select a paycheck first.');
      if (kind === 'paychecks' && checks.some(p => p.date === date && p.name === name.trim() && p.id !== editing)) throw new Error('A paycheck with this name already exists on this date. Edit it or use a different name.');
      if (kind === 'paychecks') {
        const entry: Paycheck = { id, name: name.trim(), amount: value, date, status, ...(scheduleId ? { scheduleId } : {}) };
        update(b => ({ ...b, paychecks: editing ? b.paychecks.map(x => x.id === id ? entry : x) : [...b.paychecks, entry] }));
      } else if (kind === 'income') {
        const entry: Income = { id, name: name.trim(), amount: value, date, status, paycheckId: assignment };
        update(b => ({ ...b, income: editing ? b.income.map(x => x.id === id ? entry : x) : [...b.income, entry] }));
      } else {
        const entry: Bill = { id, name: name.trim(), amount: value, dueDate: date, category: category.trim(), paycheckId: assignment || null, paid: budget.bills.find(x => x.id === id)?.paid ?? false, ...(scheduleId ? { scheduleId } : {}) };
        update(b => ({ ...b, bills: editing ? b.bills.map(x => x.id === id ? entry : x) : [...b.bills, entry] }));
      }
      setOpen(false); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
  }
  function destroy(id: string) {
    try {
      if (kind === 'paychecks') { const next = removePaycheck(budget, id); update(() => next); }
      else update(b => kind === 'income' ? { ...b, income: b.income.filter(i => i.id !== id) } : { ...b, bills: b.bills.filter(i => i.id !== id) });
      setDeleting(null); setError('');
    } catch (e) { setError((e as Error).message); }
  }
  return <Screen scrollRef={scrollRef}><Text style={s.greetingText}>{kind === 'income' ? 'Income management' : kind === 'bills' ? 'Your bills' : 'Your paychecks'}</Text><Text style={s.subText}>{kind === 'bills' ? 'Add bills once, then set them to repeat. Automatic assignment follows your paycheck dates.' : kind === 'income' ? 'Track expected earnings, then mark them received. Each entry belongs to one paycheck plan.' : 'Add a paycheck and set a repeating schedule. Mark each paycheck received when it arrives.'}</Text>
    <Button title={`+ Add ${kind === 'paychecks' ? 'paycheck' : kind === 'income' ? 'income' : 'bill'}`} onPress={() => edit()} />
    {!!error && <Text accessibilityRole="alert" style={[s.red, { marginVertical: 12 }]}>{error}</Text>}
    {open && <View style={[s.section, { marginTop: 16 }]}><Text style={s.sectionTitle}>{editing ? 'Edit entry' : 'New entry'}</Text><Field label="Name" value={name} onChange={setName} /><Field label="Amount ($)" numeric value={amount} onChange={setAmount} /><Field label={kind === 'bills' ? 'Due date (MM/DD/YYYY)' : 'Date (MM/DD/YYYY)'} value={dateText} onChange={setDate} />
      {kind !== 'bills' ? <Choices label="Status" value={status} options={[{ value: 'expected', label: 'Expected' }, { value: 'received', label: 'Received' }]} onChange={v => setStatus(v as Status)} /> : <Field label="Category" value={category} onChange={setCategory} />}
      {kind !== 'paychecks' && <Choices label="Paycheck plan" value={assignment} options={[...(kind === 'bills' ? [{ value: '', label: 'Automatic by due date' }] : []), ...checks.map(p => ({ value: p.id, label: `${p.name} · ${displayDate(p.date)}` }))]} onChange={setAssignment} />}
      <Button title="Save entry" onPress={save} /><Button title="Cancel" secondary onPress={() => { setOpen(false); setError(''); }} /></View>}
    {kind !== 'income' && <Schedules kind={kind === 'bills' ? 'bill' : 'paycheck'} onEditEntry={edit} />}
    {!items.length && !(kind !== 'income' && (budget.schedules ?? []).some(s => s.kind === (kind === 'bills' ? 'bill' : 'paycheck'))) && <Text style={[s.goalText, { marginVertical: 24 }]}>No {kind} yet. Add your first entry to start your plan.</Text>}
    {items.map(item => <View key={item.id} style={[s.section, { marginTop: 16 }]}><View style={s.rowBetween}><Text style={[s.itemTitle, { flex: 1 }]}>{item.name}</Text><Text style={s.itemAmount}>{money(item.amount)}</Text></View><Text style={s.itemSubtitle}>{'dueDate' in item ? `${displayDate(item.dueDate)} · ${item.category || 'Bill'} · ${item.paid ? 'Paid' : item.dueDate < today() ? 'Overdue' : 'Unpaid'}` : `${displayDate(item.date)} · ${item.status}`}</Text>
      {'paycheckId' in item && <Text style={s.itemSubtitle}>Plan: {displayDate(checks.find(p => p.id === ('dueDate' in item ? assignedCheck(budget, item) : item.paycheckId))?.date) || 'Unassigned — add an earlier paycheck or select one'}</Text>}
      <Button title={`Edit ${item.name}`} secondary onPress={() => edit(item)} />
      {'paid' in item ? <Button title={item.paid ? 'Mark unpaid' : 'Mark paid'} secondary onPress={() => update(b => ({ ...b, bills: b.bills.map(x => x.id === item.id ? { ...x, paid: !x.paid } : x) }))} /> : <Button title={item.status === 'received' ? 'Mark expected' : 'Mark received'} secondary onPress={() => update(b => kind === 'paychecks' ? { ...b, paychecks: b.paychecks.map(x => x.id === item.id ? { ...x, status: x.status === 'received' ? 'expected' : 'received' } : x) } : { ...b, income: b.income.map(x => x.id === item.id ? { ...x, status: x.status === 'received' ? 'expected' : 'received' } : x) })} />}
      {kind === 'paychecks' && !('scheduleId' in item && item.scheduleId) && <Button title="Add next biweekly paycheck" secondary onPress={() => { edit(); setName(item.name); setAmount(String(item.amount / 100)); setDate(dateInput(addDays((item as Paycheck).date, 14))); }} />}
      {kind !== 'income' && !('scheduleId' in item && item.scheduleId) && <>
        <Button title={`Set repeats for ${item.name}`} secondary onPress={() => { setRepeating(item.id); setCadence(kind === 'bills' ? 'monthly' : 'biweekly'); setError(''); }} />
        {repeating === item.id && <View>
          <Choices label="Repeat frequency" value={cadence} options={(['weekly', 'biweekly', 'monthly'] as Cadence[]).map(c => ({ value: c, label: cadenceLabel(c) }))} onChange={v => setCadence(v as Cadence)} />
          <Text style={s.goalText}>Next dates: {[1, 2, 3].map(i => displayDate(occurrenceDate('dueDate' in item ? item.dueDate : (item as Paycheck).date, cadence, i))).join(' · ')}</Text>
          <Text style={s.itemSubtitle}>This entry stays as it is. Rilo adds future occurrences through the next 90 days. Future bills use automatic paycheck assignment.</Text>
          <Button title="Confirm repeating schedule" onPress={() => {
            try { const next = startSchedule(budget, kind === 'bills' ? 'bill' : 'paycheck', item.id, cadence, uid()); update(() => next); setRepeating(null); setError(''); }
            catch (e) { setError((e as Error).message); }
          }} />
          <Button title="Cancel repeats" secondary onPress={() => setRepeating(null)} />
        </View>}
      </>}
      {'scheduleId' in item && !!item.scheduleId && <Text style={[s.itemSubtitle, { marginTop: 12 }]}>Repeating occurrence · edits here affect only this entry.</Text>}
      {deleting === item.id ? <><Text style={[s.red, { marginTop: 16 }]}>Delete this entry permanently?</Text><Button title="Confirm delete" secondary onPress={() => destroy(item.id)} /><Button title="Keep entry" secondary onPress={() => setDeleting(null)} /></> : <Button title={`Delete ${item.name}`} secondary onPress={() => setDeleting(item.id)} />}
    </View>)}
  </Screen>;
}

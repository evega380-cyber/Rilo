import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useBudget } from '../state/BudgetProvider';
import { addDays, assignedCheck, Bill, cents, Income, money, orderedChecks, Paycheck, removePaycheck, Status, today, validDate } from '../core/budget';
import { Button, Choices, Field, Screen } from './ui';
import { styles as s } from './styles';
type Kind = 'paychecks' | 'income' | 'bills';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function Manager({ kind }: { kind: Kind }) {
  const { budget, update } = useBudget();
  const checks = orderedChecks(budget);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<Status>('expected');
  const [category, setCategory] = useState('');
  const [assignment, setAssignment] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const items: (Paycheck | Income | Bill)[] = kind === 'paychecks' ? checks : kind === 'income' ? budget.income : [...budget.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  function edit(item?: Paycheck | Income | Bill) {
    setEditing(item?.id ?? null); setName(item?.name ?? (kind === 'paychecks' ? 'Regular paycheck' : ''));
    setAmount(item ? String(item.amount / 100) : '');
    setDate(item ? ('dueDate' in item ? item.dueDate : item.date) : today());
    setStatus(item && 'status' in item ? item.status : 'expected');
    setCategory(item && 'category' in item ? item.category : '');
    setAssignment(item && 'paycheckId' in item ? item.paycheckId ?? '' : kind === 'income' ? checks[0]?.id ?? '' : '');
    setError(''); setOpen(true); setDeleting(null);
  }
  function save() {
    try {
      if (!name.trim()) throw new Error('Enter a name.');
      if (!validDate(date)) throw new Error('Use a real date in YYYY-MM-DD format.');
      const value = cents(amount); const id = editing ?? uid();
      if ((kind === 'income' || (kind === 'bills' && assignment)) && !checks.some(p => p.id === assignment)) throw new Error('Add and select a paycheck first.');
      if (kind === 'paychecks' && checks.some(p => p.date === date && p.id !== editing)) throw new Error('A paycheck already exists on this date. Edit it or choose another date.');
      if (kind === 'paychecks') {
        const entry: Paycheck = { id, name: name.trim(), amount: value, date, status };
        update(b => ({ ...b, paychecks: editing ? b.paychecks.map(x => x.id === id ? entry : x) : [...b.paychecks, entry] }));
      } else if (kind === 'income') {
        const entry: Income = { id, name: name.trim(), amount: value, date, status, paycheckId: assignment };
        update(b => ({ ...b, income: editing ? b.income.map(x => x.id === id ? entry : x) : [...b.income, entry] }));
      } else {
        const entry: Bill = { id, name: name.trim(), amount: value, dueDate: date, category: category.trim(), paycheckId: assignment || null, paid: budget.bills.find(x => x.id === id)?.paid ?? false };
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
  return <Screen><Text style={s.greetingText}>{kind === 'income' ? 'Income management' : kind === 'bills' ? 'Your bills' : 'Your paychecks'}</Text><Text style={s.subText}>{kind === 'bills' ? 'Add each bill occurrence with its actual due date. Automatic assignment follows your paycheck dates.' : kind === 'income' ? 'Track expected earnings, then mark them received. Each entry belongs to one paycheck plan.' : 'Create dated paychecks and mark them received when they arrive.'}</Text>
    <Button title={`+ Add ${kind === 'paychecks' ? 'paycheck' : kind === 'income' ? 'income' : 'bill'}`} onPress={() => edit()} />
    {!!error && <Text accessibilityRole="alert" style={[s.red, { marginVertical: 12 }]}>{error}</Text>}
    {open && <View style={[s.section, { marginTop: 16 }]}><Text style={s.sectionTitle}>{editing ? 'Edit entry' : 'New entry'}</Text><Field label="Name" value={name} onChange={setName} /><Field label="Amount ($)" numeric value={amount} onChange={setAmount} /><Field label={kind === 'bills' ? 'Due date (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} value={date} onChange={setDate} />
      {kind !== 'bills' ? <Choices label="Status" value={status} options={[{ value: 'expected', label: 'Expected' }, { value: 'received', label: 'Received' }]} onChange={v => setStatus(v as Status)} /> : <Field label="Category" value={category} onChange={setCategory} />}
      {kind !== 'paychecks' && <Choices label="Paycheck plan" value={assignment} options={[...(kind === 'bills' ? [{ value: '', label: 'Automatic by due date' }] : []), ...checks.map(p => ({ value: p.id, label: `${p.name} · ${p.date}` }))]} onChange={setAssignment} />}
      <Button title="Save entry" onPress={save} /><Button title="Cancel" secondary onPress={() => { setOpen(false); setError(''); }} /></View>}
    {!items.length && <Text style={[s.goalText, { marginVertical: 24 }]}>No {kind} yet. Add your first entry to start your plan.</Text>}
    {items.map(item => <View key={item.id} style={[s.section, { marginTop: 16 }]}><View style={s.rowBetween}><Text style={[s.itemTitle, { flex: 1 }]}>{item.name}</Text><Text style={s.itemAmount}>{money(item.amount)}</Text></View><Text style={s.itemSubtitle}>{'dueDate' in item ? `${item.dueDate} · ${item.category || 'Bill'} · ${item.paid ? 'Paid' : item.dueDate < today() ? 'Overdue' : 'Unpaid'}` : `${item.date} · ${item.status}`}</Text>
      {'paycheckId' in item && <Text style={s.itemSubtitle}>Plan: {checks.find(p => p.id === ('dueDate' in item ? assignedCheck(budget, item) : item.paycheckId))?.date ?? 'Unassigned — add an earlier paycheck or select one'}</Text>}
      <Button title={`Edit ${item.name}`} secondary onPress={() => edit(item)} />
      {'paid' in item ? <Button title={item.paid ? 'Mark unpaid' : 'Mark paid'} secondary onPress={() => update(b => ({ ...b, bills: b.bills.map(x => x.id === item.id ? { ...x, paid: !x.paid } : x) }))} /> : <Button title={item.status === 'received' ? 'Mark expected' : 'Mark received'} secondary onPress={() => update(b => kind === 'paychecks' ? { ...b, paychecks: b.paychecks.map(x => x.id === item.id ? { ...x, status: x.status === 'received' ? 'expected' : 'received' } : x) } : { ...b, income: b.income.map(x => x.id === item.id ? { ...x, status: x.status === 'received' ? 'expected' : 'received' } : x) })} />}
      {kind === 'paychecks' && <Button title="Add next biweekly paycheck" secondary onPress={() => { edit(); setName(item.name); setAmount(String(item.amount / 100)); setDate(addDays((item as Paycheck).date, 14)); }} />}
      {deleting === item.id ? <><Text style={[s.red, { marginTop: 16 }]}>Delete this entry permanently?</Text><Button title="Confirm delete" secondary onPress={() => destroy(item.id)} /><Button title="Keep entry" secondary onPress={() => setDeleting(null)} /></> : <Button title={`Delete ${item.name}`} secondary onPress={() => setDeleting(item.id)} />}
    </View>)}
  </Screen>;
}

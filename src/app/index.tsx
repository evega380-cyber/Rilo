import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { displayDate } from '../core/dates';
import { useBudget } from '../state/BudgetProvider';
import { assignedCheck, cents, money, orderedChecks, plan, today } from '../core/budget';
import { Button, Choices, Field, Screen } from '../components/ui';
import { styles as s } from '../components/styles';
export default function Home() {
  const { budget, update } = useBudget();
  const checks = orderedChecks(budget);
  const [selected, setSelected] = useState('');
  const [goalOpen, setGoalOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const check = checks.find(p => p.id === selected) ?? checks.find(p => p.date >= today()) ?? checks.at(-1);
  const p = plan(budget, check?.id ?? '');
  const unassigned = budget.bills.filter(b => assignedCheck(budget, b) === null);
  function saveGoal() { try { const value = goal.trim() === '0' ? 0 : cents(goal); update(b => ({ ...b, goal: value })); setGoalOpen(false); setError(''); } catch (e) { setError((e as Error).message); } }
  return <Screen><View style={s.greeting}><Text style={s.greetingText}>Your paycheck plan</Text><Text style={s.subText}>Give every dollar a place, one check at a time.</Text></View>
    {!check ? <View style={s.mainCard}><Text style={s.goalTitle}>Let’s get your money in rhythm.</Text><Text style={s.goalText}>Start with your actual paycheck amount and date. Your budget starts empty so demo money never counts toward your balance.</Text><Button title="Add my first paycheck" onPress={() => router.push('/paychecks')} /></View> : <>
      <Choices label="Choose a paycheck" value={check.id} options={checks.map(c => ({ value: c.id, label: displayDate(c.date) }))} onChange={setSelected} />
      <View style={[s.mainCard, { marginTop: 16 }]}><Text style={s.cardLabel}>{check.name.toUpperCase()}</Text><Text style={s.paycheckAmount}>{money(check.amount)}</Text><Text style={s.payDate}>{displayDate(check.date)} · {check.status}</Text>
        <View style={s.statRow}><View style={s.statBox}><Text style={s.statLabel}>Planned</Text><Text style={s.statValue}>{money(p.reserved)}</Text></View><View style={s.statBox}><Text style={s.statLabel}>Available now</Text><Text style={[s.statValue, p.available >= 0 ? s.green : s.red]}>{money(p.available)}</Text></View></View>
        <Text style={s.goalText}>Forecast after expected income: {money(p.forecast)}</Text><Text style={s.itemSubtitle}>Available now = received income minus all planned bills, including paid bills. Negative means the plan needs more received income.</Text>
        <Text style={s.progressLabel}>{p.percent}% of projected income allocated</Text><View style={s.progressTrack}><View style={[s.progressFill, { width: `${p.percent}%` }]} /></View>
        {p.forecast < 0 && <Text style={[s.red, { marginTop: 12 }]}>Your plan is over budget by {money(-p.forecast)}.</Text>}
      </View>
      <View style={s.section}><Text style={s.sectionTitle}>Income this period</Text><View style={s.incomeRow}><View><Text style={s.itemTitle}>Regular paycheck</Text><Text style={s.itemSubtitle}>{check.status}</Text></View><Text style={s.itemAmount}>{money(check.amount)}</Text></View><View style={s.divider} /><View style={s.incomeRow}><View><Text style={s.itemTitle}>Extra income received</Text><Text style={s.itemSubtitle}>Expected: {money(p.projected - check.amount - p.extraReceived)}</Text></View><Text style={s.extraAmount}>+{money(p.extraReceived)}</Text></View><Button title="Manage income" secondary onPress={() => router.push('/income')} /></View>
      <View style={s.section}><Text style={s.sectionTitle}>Coming from this check</Text><Text style={s.itemSubtitle}>Paid {money(p.paid)} · Still due {money(p.unpaid)}</Text>{!p.bills.length && <Text style={s.goalText}>No bills assigned yet.</Text>}{p.bills.map(b => <View key={b.id} style={s.billRow}><View style={s.billIcon}><Text style={s.billIconText}>$</Text></View><View style={s.billInfo}><Text style={s.itemTitle}>{b.name}</Text><Text style={s.itemSubtitle}>{displayDate(b.dueDate)} · {b.paid ? 'Paid' : b.dueDate < today() ? 'Overdue' : 'Unpaid'}{b.dueDate < check.date ? ' · Due before paycheck' : ''}</Text></View><Text style={s.itemAmount}>{money(b.amount)}</Text></View>)}<Button title="Edit bills and assignments" secondary onPress={() => router.push('/bills')} /></View>
    </>}
    {!!unassigned.length && <View style={s.section}><Text style={s.red}>{unassigned.length} bill(s) need a paycheck assignment.</Text><Button title="Review unassigned bills" secondary onPress={() => router.push('/bills')} /></View>}
    <View style={s.goalCard}><Text style={s.goalLabel}>SIDE-GIG GOAL · SELECTED PAYCHECK</Text><Text style={s.goalTitle}>{money(p.extraReceived)} of {money(budget.goal)} received</Text><Text style={s.goalText}>Uber, overtime, tips, freelance. Expected earnings stay separate until you mark them received.</Text><Button title="Set an income goal" secondary onPress={() => { setGoal(String(budget.goal / 100)); setGoalOpen(true); }} />{goalOpen && <><Field label="Extra income goal ($; 0 to clear)" value={goal} numeric onChange={setGoal} />{!!error && <Text style={s.red}>{error}</Text>}<Button title="Save goal" onPress={saveGoal} /><Button title="Cancel" secondary onPress={() => setGoalOpen(false)} /></>}</View>
    <Button title="Plan my paycheck" onPress={() => router.push('/paychecks')} /><Text style={s.quote}>A plan today. A better tomorrow.</Text>
  </Screen>;
}

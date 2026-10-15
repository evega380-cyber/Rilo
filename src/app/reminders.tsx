import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, Choices, Field } from '../components/ui';
import { styles as s } from '../components/styles';
import { useBudget } from '../state/BudgetProvider';
import { useReminders } from '../state/RemindersProvider';
import { billReminderGroups, parseReminderTime } from '../core/reminders';
import type { ReminderSettings } from '../core/reminders';
import type { Bill } from '../core/budget';
import { money } from '../core/budget';
import { displayDate } from '../core/dates';
import { deviceAlertsSupported } from '../services/notifications';
export default function Reminders() {
  const { budget, update } = useBudget();
  const reminders = useReminders();
  const { settings, ready, busy, now, status } = reminders;
  const [range, setRange] = useState('7');
  const [lead, setLead] = useState<string | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const groups = billReminderGroups(budget, localDate, Number(range));
  const currentTime = clock ?? `${String(settings.hour).padStart(2, '0')}:${String(settings.minute).padStart(2, '0')}`;
  async function save(enabled: boolean) {
    setError(''); setMessage('');
    const time = enabled ? parseReminderTime(currentTime) : { hour: settings.hour, minute: settings.minute };
    if (!time) { setError('Enter a time in 24-hour HH:MM format, such as 09:00 or 18:30.'); return; }
    try { await reminders.save((enabled ? Number(lead ?? settings.leadDays) : settings.leadDays) as ReminderSettings['leadDays'], time.hour, time.minute, enabled); setMessage(enabled ? 'Settings saved. Updating device reminders…' : 'Settings saved. Turning off device reminders…'); }
    catch (e) { setError((e as Error).message || 'Could not save reminder settings. Try again.'); }
  }
  function group(title: string, bills: Bill[], color?: string) {
    return <View style={s.section}><Text style={[s.sectionTitle, color ? { color } : {}]}>{title} · {bills.length}</Text>
      {!bills.length && <Text style={s.goalText}>Nothing due here.</Text>}
      {bills.map(bill => <View key={bill.id} style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#17446D', paddingTop: 12 }}>
        <View style={s.rowBetween}><Text style={[s.itemTitle, { flex: 1 }]}>{bill.name}</Text><Text style={s.itemAmount}>{money(bill.amount)}</Text></View>
        <Text style={s.itemSubtitle}>Due {displayDate(bill.dueDate)}</Text>
        <Button title={`Mark ${bill.name} paid`} secondary onPress={() => update(b => ({ ...b, bills: b.bills.map(x => x.id === bill.id ? { ...x, paid: true } : x) }))} />
      </View>)}
    </View>;
  }
  return <Screen><Text style={s.greetingText}>Bill reminders</Text><Text style={s.subText}>Keep track of unpaid bills across every paycheck.</Text>
    <Button title="Back to home" secondary onPress={() => router.push('/')} />
    <View style={[s.section, { marginTop: 16 }]}>
      <Text style={s.sectionTitle}>Reminder settings</Text>
      {!deviceAlertsSupported ? <Text style={s.goalText}>In Safari and other browsers, reminders appear here while Rilo is open. Background device alerts are available in the iOS/Android app. No text messages are sent.</Text> : <>
        <Text style={s.goalText}>Get an alert before a bill and on its due date. Choose a local device time. Notifications are optional and need your permission.</Text>
        <Choices label="Advance reminder" value={lead ?? String(settings.leadDays)} options={[{ value: '0', label: 'Due day only' }, { value: '1', label: '1 day before' }, { value: '3', label: '3 days before' }, { value: '7', label: '7 days before' }]} onChange={setLead} />
        <Field label="Reminder time (HH:MM, 24-hour)" value={currentTime} onChange={setClock} />
        {ready && !busy ? <>
          <Button title={settings.enabled ? 'Save device alert settings' : 'Enable device alerts'} onPress={() => save(true)} />
          {settings.enabled && <Button title="Turn off device alerts" secondary onPress={() => save(false)} />}
          {settings.enabled && <Button title="Send a 10-second test reminder" secondary onPress={async () => { try { await reminders.test(); setMessage('Test queued for 10 seconds from now.'); setError(''); } catch (e) { setError((e as Error).message); } }} />}
        </> : <Text style={s.goalText}>{busy ? 'Saving reminder settings…' : 'Loading reminder settings…'}</Text>}
        {status?.state === 'ready' && <Text style={s.goalText}>{status.count} future device reminders queued.{status.remaining ? ` ${status.remaining} more will be queued as space opens when you use Rilo.` : ''}</Text>}
        {status?.state === 'off' && <Text style={s.goalText}>Device alerts are off.</Text>}
        {status?.state === 'denied' && <Text style={s.red}>Notifications are blocked in your device settings. Enable them there, then refresh reminders.</Text>}
        <Text style={s.itemSubtitle}>Only future alerts are queued. Past and overdue bills stay in the list below. Open Rilo periodically to refresh the next reminders; delivery may be affected by device settings.</Text>
      </>}
      {!!message && <Text accessibilityRole="alert" style={[s.green, { marginTop: 12 }]}>{message}</Text>}
      {!!(error || reminders.error) && <Text accessibilityRole="alert" style={[s.red, { marginTop: 12 }]}>{error || reminders.error}</Text>}
      <Button title="Refresh reminders" secondary onPress={reminders.refresh} />
    </View>
    <Choices label="Upcoming bills" value={range} options={[{ value: '7', label: 'Next 7 days' }, { value: '30', label: 'Next 30 days' }]} onChange={setRange} />
    <View style={{ height: 16 }} />
    {group('Overdue', groups.overdue, '#FF6B6B')}
    {group('Due today', groups.today)}
    {group(`Next ${range} days`, groups.upcoming)}
    <Button title="Manage bills" secondary onPress={() => router.push('/bills')} />
  </Screen>;
}

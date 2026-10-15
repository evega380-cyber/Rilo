import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { buildReminderEvents, decodeReminderSettings, defaultReminderSettings } from '../core/reminders';
import type { ReminderSettings } from '../core/reminders';
import { deviceAlertsSupported, observeReminderOpens, requestDevicePermission, syncDeviceReminders, testDeviceReminder } from '../services/notifications';
import type { SyncResult } from '../services/notifications';
import { useBudget } from './BudgetProvider';
const KEY = 'rilo.reminders.v1';
type ReminderContext = {
  settings: ReminderSettings; ready: boolean; busy: boolean; error: string; status: SyncResult | null; now: Date;
  save: (leadDays: ReminderSettings['leadDays'], hour: number, minute: number, enabled: boolean) => Promise<void>;
  refresh: () => void; test: () => Promise<void>;
};
const Context = createContext<ReminderContext | null>(null);
export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const { budget, ready: budgetReady, blocked, working } = useBudget();
  const [settings, setSettings] = useState(defaultReminderSettings);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<SyncResult | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => { if (active) { if (raw) setSettings(decodeReminderSettings(raw)); setReady(true); } })
      .catch(() => { if (active) { setLoadError('Reminder settings could not be loaded. Device alerts are paused; save settings to set them up again.'); setReady(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(new Date()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!ready || !budgetReady || working) return;
    let active = true;
    const events = buildReminderEvents(budget, settings, now);
    syncDeviceReminders(events, !blocked && !loadError && settings.enabled).then(result => { if (active) { setStatus(result); setError(''); } })
      .catch(() => { if (active) { setStatus(null); setError('Device reminders could not be updated. Some older alerts may still be scheduled. Check permissions and refresh reminders.'); } });
    return () => { active = false; };
  }, [budget, settings, ready, budgetReady, blocked, working, loadError, now]);
  useEffect(() => {
    if (!budgetReady || blocked) return;
    return observeReminderOpens(() => router.push('/reminders'));
  }, [budgetReady, blocked]);
  async function save(leadDays: ReminderSettings['leadDays'], hour: number, minute: number, enabled: boolean) {
    if (locked.current || !ready) throw new Error('Please wait for reminder settings to finish loading.');
    const next = decodeReminderSettings(JSON.stringify({ version: 1, enabled, leadDays, hour, minute }));
    locked.current = true; setBusy(true);
    try {
      if (enabled && (!deviceAlertsSupported || !await requestDevicePermission())) throw new Error('Notifications are not allowed. Enable them in your device settings, then try again.');
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setSettings(next); setStatus(null); setLoadError(''); setError(''); setNow(new Date());
    } finally { locked.current = false; setBusy(false); }
  }
  async function test() {
    if (!settings.enabled) throw new Error('Enable device alerts first.');
    await testDeviceReminder();
  }
  return <Context.Provider value={{ settings, ready, busy, error: loadError || error, status, now, save, refresh: () => setNow(new Date()), test }}>{children}</Context.Provider>;
}
export function useReminders() { const value = useContext(Context); if (!value) throw new Error('Missing RemindersProvider'); return value; }

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, Budget, decodeBudget, emptyBudget, today } from '../core/budget';
import { expandSchedules } from '../core/recurrence';
const KEY = 'rilo.budget.v2';
type Context = { budget: Budget; update: (change: (b: Budget) => Budget) => void; ready: boolean; error: string; retry: () => void; blocked: boolean };
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = useState<Budget>(emptyBudget);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const queue = useRef(Promise.resolve());
  const changed = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      const previous = raw ? decodeBudget(raw) : emptyBudget();
      const loaded = expandSchedules(previous, addDays(today(), 90));
      if (loaded !== previous) changed.current = true;
      if (active) { setBudget(loaded); setBlocked(false); setError(''); setReady(true); }
    }).catch(() => { if (active) { setBlocked(true); setReady(true); setError('Your saved budget could not be loaded. It has not been overwritten. Retry to continue.'); } });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    if (!ready || blocked || !changed.current) return;
    const raw = JSON.stringify(budget);
    queue.current = queue.current.then(() => AsyncStorage.setItem(KEY, raw)).then(() => setError('')).catch(() => setError('Changes are in memory but could not be saved. Keep Rilo open and retry saving.'));
  }, [budget, ready, blocked]);
  useEffect(() => {
    if (!ready || blocked) return;
    const timer = setInterval(() => setBudget(b => {
      const next = expandSchedules(b, addDays(today(), 90));
      if (next !== b) changed.current = true;
      return next;
    }), 60000);
    return () => clearInterval(timer);
  }, [ready, blocked]);
  function update(change: (b: Budget) => Budget) {
    if (!ready || blocked) return;
    changed.current = true;
    setBudget(b => expandSchedules(decodeBudget(JSON.stringify(change(b))), addDays(today(), 90)));
  }
  function retry() {
    if (blocked) { setReady(false); setAttempt(a => a + 1); }
    else setBudget(b => ({ ...b }));
  }
  return <BudgetContext.Provider value={{ budget, update, ready, error, retry, blocked }}>{children}</BudgetContext.Provider>;
}
export function useBudget() { const c = useContext(BudgetContext); if (!c) throw new Error('Missing BudgetProvider'); return c; }

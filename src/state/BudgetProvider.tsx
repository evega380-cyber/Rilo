import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, Budget, decodeBudget, emptyBudget, today } from '../core/budget';
import { expandSchedules } from '../core/recurrence';
import { BUDGET_KEY as KEY, UNDO_KEY, restoreSavedBudget, undoSavedRestore } from '../core/restoreStorage';
type Context = { budget: Budget; update: (change: (b: Budget) => Budget) => void; ready: boolean; error: string; retry: () => void; blocked: boolean; working: boolean; canUndoRestore: boolean; restore: (incoming: Budget) => Promise<void>; undoRestore: () => Promise<string> };
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = useState<Budget>(emptyBudget);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const current = useRef(budget);
  useEffect(() => { current.current = budget; }, [budget]);
  const [canUndoRestore, setCanUndoRestore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queue = useRef(Promise.resolve());
  const changed = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(UNDO_KEY).catch(() => null)]).then(([raw, undo]) => {
      const previous = raw ? decodeBudget(raw) : emptyBudget();
      const loaded = expandSchedules(previous, addDays(today(), 90));
      if (loaded !== previous) changed.current = true;
      if (active) { setCanUndoRestore(!!undo); setBudget(loaded); setBlocked(false); setError(''); setReady(true); }
    }).catch(() => { if (active) { setBlocked(true); setReady(true); setError('Your saved budget could not be loaded. It has not been overwritten. Retry to continue.'); } });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    if (!ready || blocked || busy.current || !changed.current) return;
    const raw = JSON.stringify(budget);
    queue.current = queue.current.then(() => AsyncStorage.setItem(KEY, raw)).then(() => setError('')).catch(() => setError('Changes are in memory but could not be saved. Keep Rilo open and retry saving.'));
  }, [budget, ready, blocked]);
  useEffect(() => {
    if (!ready || blocked) return;
    const timer = setInterval(() => setBudget(b => {
      if (busy.current) return b;
      const next = expandSchedules(b, addDays(today(), 90));
      if (next !== b) changed.current = true;
      return next;
    }), 60000);
    return () => clearInterval(timer);
  }, [ready, blocked]);
  function update(change: (b: Budget) => Budget) {
    if (!ready || blocked || busy.current) return;
    changed.current = true;
    setBudget(b => expandSchedules(decodeBudget(JSON.stringify(change(b))), addDays(today(), 90)));
  }
  async function restore(incoming: Budget) {
    if (!ready || blocked || busy.current) throw new Error('Wait for the current budget operation to finish.');
    const checked = expandSchedules(decodeBudget(JSON.stringify(incoming)), addDays(today(), 90));
    busy.current = true; setWorking(true);
    const task = queue.current.then(() => restoreSavedBudget(AsyncStorage, current.current, checked));
    queue.current = task.then(() => {}, () => {});
    try {
      const restored = await task;
      changed.current = false; current.current = restored; setBudget(restored); setCanUndoRestore(true); setError('');
    } catch (e) {
      changed.current = true; setBudget(b => ({ ...b }));
      throw e;
    } finally { busy.current = false; setWorking(false); }
  }
  async function undoRestore(): Promise<string> {
    if (!ready || blocked || busy.current) throw new Error('Wait for the current budget operation to finish.');
    busy.current = true; setWorking(true);
    const task = queue.current.then(() => undoSavedRestore(AsyncStorage));
    queue.current = task.then(() => {}, () => {});
    try {
      const result = await task;
      changed.current = false; current.current = result.budget; setBudget(result.budget);
      setCanUndoRestore(result.cleanupFailed); setError('');
      return result.cleanupFailed ? 'Your previous budget was restored, but the undo copy could not be removed. It can still be selected again.' : 'Your previous budget was restored.';
    } finally { busy.current = false; setWorking(false); }
  }
  function retry() {
    if (blocked) { setReady(false); setAttempt(a => a + 1); }
    else setBudget(b => ({ ...b }));
  }
  return <BudgetContext.Provider value={{ budget, update, ready, error, retry, blocked, working, canUndoRestore, restore, undoRestore }}>{children}</BudgetContext.Provider>;
}
export function useBudget() { const c = useContext(BudgetContext); if (!c) throw new Error('Missing BudgetProvider'); return c; }

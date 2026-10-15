import { decodeBudget } from './budget.ts';
import type { Budget } from './budget';
export const BUDGET_KEY = 'rilo.budget.v2';
export const UNDO_KEY = 'rilo.restore.previous.v1';
export type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> };

export async function restoreSavedBudget(storage: Storage, current: Budget, incoming: Budget): Promise<Budget> {
  const before = JSON.stringify(decodeBudget(JSON.stringify(current)));
  const after = JSON.stringify(decodeBudget(JSON.stringify(incoming)));
  // Never replace the current budget unless the recovery copy was saved first.
  await storage.setItem(UNDO_KEY, before);
  await storage.setItem(BUDGET_KEY, after);
  return JSON.parse(after);
}
export async function undoSavedRestore(storage: Storage): Promise<{ budget: Budget; cleanupFailed: boolean }> {
  const raw = await storage.getItem(UNDO_KEY);
  if (!raw) throw new Error('There is no previous restore to undo.');
  const previous = decodeBudget(raw);
  await storage.setItem(BUDGET_KEY, JSON.stringify(previous));
  try { await storage.removeItem(UNDO_KEY); return { budget: previous, cleanupFailed: false }; }
  catch { return { budget: previous, cleanupFailed: true }; }
}

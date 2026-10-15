export type Status = 'expected' | 'received';
export type Paycheck = { id: string; name: string; date: string; amount: number; status: Status };
export type Income = { id: string; name: string; date: string; amount: number; status: Status; paycheckId: string };
export type Bill = { id: string; name: string; category: string; dueDate: string; amount: number; paid: boolean; paycheckId: string | null };
export type Budget = { version: 2; paychecks: Paycheck[]; income: Income[]; bills: Bill[]; goal: number };
export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export function cents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a positive amount with up to two decimal places.');
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100000000000) throw new Error('Amount must be between $0.01 and $1 billion.');
  return result;
}
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '1900-01-01' && date <= '2200-12-31' && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export const orderedChecks = (budget: Budget) => [...budget.paychecks].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
// Explicit assignments win. Otherwise reserve from the last check on or before the due date.
export function assignedCheck(budget: Budget, bill: Bill): string | null {
  return bill.paycheckId ?? orderedChecks(budget).filter(p => p.date <= bill.dueDate).at(-1)?.id ?? null;
}
export function plan(budget: Budget, paycheckId: string) {
  const check = budget.paychecks.find(p => p.id === paycheckId);
  const income = budget.income.filter(i => i.paycheckId === paycheckId);
  const bills = budget.bills.filter(b => assignedCheck(budget, b) === paycheckId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const sum = (items: {amount: number}[]) => items.reduce((n, x) => n + x.amount, 0);
  const extraReceived = sum(income.filter(i => i.status === 'received'));
  const received = (check?.status === 'received' ? check.amount : 0) + extraReceived;
  const projected = (check?.amount ?? 0) + sum(income);
  const reserved = sum(bills);
  const paid = sum(bills.filter(b => b.paid));
  return { bills, income, extraReceived, received, projected, reserved, paid, unpaid: reserved - paid,
    available: received - reserved, forecast: projected - reserved,
    percent: projected ? Math.min(100, Math.round(reserved / projected * 100)) : 0 };
}
export function emptyBudget(): Budget { return { version: 2, paychecks: [], income: [], bills: [], goal: 0 }; }
export function removePaycheck(budget: Budget, id: string): Budget {
  if (budget.income.some(i => i.paycheckId === id) || budget.bills.some(b => assignedCheck(budget, b) === id)) throw new Error('Move or delete this paycheck’s income and bills first.');
  return { ...budget, paychecks: budget.paychecks.filter(p => p.id !== id) };
}
// Validate saved data before it can participate in financial calculations.
export function decodeBudget(raw: string): Budget {
  const b: Budget = JSON.parse(raw);
  const amount = (n: number) => Number.isSafeInteger(n) && n > 0 && n <= 100000000000;
  const name = (n: string) => typeof n === 'string' && n.trim().length > 0;
  const status = (s: Status) => s === 'expected' || s === 'received';
  if (!b || b.version !== 2 || !Array.isArray(b.paychecks) || !Array.isArray(b.income) || !Array.isArray(b.bills) || !Number.isSafeInteger(b.goal) || b.goal < 0) throw new Error('Unsupported saved budget.');
  const ids = new Set<string>();
  for (const x of [...b.paychecks, ...b.income, ...b.bills]) {
    if (!x || !name(x.id) || ids.has(x.id) || !name(x.name) || !amount(x.amount)) throw new Error('Invalid saved entry.');
    ids.add(x.id);
  }
  const checks = new Set(b.paychecks.map(p => p.id));
  if (b.paychecks.some(p => !validDate(p.date) || !status(p.status)) ||
    b.income.some(i => !validDate(i.date) || !status(i.status) || !checks.has(i.paycheckId)) ||
    b.bills.some(x => !validDate(x.dueDate) || typeof x.category !== 'string' || typeof x.paid !== 'boolean' || (x.paycheckId !== null && !checks.has(x.paycheckId)))) throw new Error('Invalid saved relationships or dates.');
  return b;
}

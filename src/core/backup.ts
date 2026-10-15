import { decodeBudget } from './budget.ts';
import type { Budget } from './budget';
export const MAX_BACKUP_SIZE = 5 * 1024 * 1024;
function utf8Size(raw: string): number {
  let bytes = 0;
  for (const char of raw) { const point = char.codePointAt(0)!; bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4; }
  return bytes;
}
export type Backup = { format: 'rilo-budget-backup'; version: 1; exportedAt: string; budget: Budget };
export function createBackup(budget: Budget, exportedAt = new Date().toISOString()): string {
  const checked = decodeBudget(JSON.stringify(budget));
  const raw = JSON.stringify({ format: 'rilo-budget-backup', version: 1, exportedAt, budget: checked } satisfies Backup, null, 2);
  if (raw.length > MAX_BACKUP_SIZE || utf8Size(raw) > MAX_BACKUP_SIZE) throw new Error('This budget is too large for a backup file.');
  return raw;
}
export function readBackup(raw: string): Backup {
  if (raw.length > MAX_BACKUP_SIZE || utf8Size(raw) > MAX_BACKUP_SIZE) throw new Error('Choose a Rilo backup smaller than 5 MB.');
  try {
    const b = JSON.parse(raw);
    if (!b || b.format !== 'rilo-budget-backup' || b.version !== 1 || typeof b.exportedAt !== 'string' || !Number.isFinite(Date.parse(b.exportedAt))) throw new Error();
    return { format: b.format, version: 1, exportedAt: b.exportedAt, budget: decodeBudget(JSON.stringify(b.budget)) };
  } catch { throw new Error('This is not a valid supported Rilo backup. Your budget has not changed.'); }
}
export const backupFilename = (date = new Date()) => `rilo-backup-${date.toISOString().replace(/[:.]/g, '-')}.json`;

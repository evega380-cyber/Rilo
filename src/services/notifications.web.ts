import type { ReminderEvent } from '../core/reminders';
export const deviceAlertsSupported = false;
export type SyncResult = { state: 'off' | 'ready' | 'denied' | 'web'; count: number; remaining: number };
export async function requestDevicePermission(): Promise<boolean> { return false; }
export async function syncDeviceReminders(_events: ReminderEvent[], _enabled: boolean): Promise<SyncResult> { return { state: 'web', count: 0, remaining: 0 }; }
export async function testDeviceReminder(): Promise<void> { throw new Error('Device alerts are available in the iOS/Android app.'); }
export function observeReminderOpens(_open: () => void): () => void { return () => {}; }

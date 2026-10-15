import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { displayDate } from '../core/dates';
import { REMINDER_LIMIT, REMINDER_SCOPE, reminderChanges } from '../core/reminders';
import type { ReminderEvent } from '../core/reminders';
export const deviceAlertsSupported = true;
export type SyncResult = { state: 'off' | 'ready' | 'denied' | 'web'; count: number; remaining: number };
const CHANNEL = 'rilo-bill-reminders';
let tail = Promise.resolve();
let revision = 0;
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
async function channel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Bill reminders', importance: Notifications.AndroidImportance.DEFAULT });
}
async function hasPermission(request = false) {
  if (request) await channel();
  const result = request ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (Platform.OS === 'ios') return [Notifications.IosAuthorizationStatus.AUTHORIZED, Notifications.IosAuthorizationStatus.PROVISIONAL, Notifications.IosAuthorizationStatus.EPHEMERAL].some(status => status === result.ios?.status);
  return result.granted;
}
export const requestDevicePermission = () => hasPermission(true);
export function syncDeviceReminders(events: ReminderEvent[], enabled: boolean): Promise<SyncResult> {
  const mine = ++revision;
  const task = tail.then(async (): Promise<SyncResult> => {
    if (mine !== revision) return { state: 'off', count: 0, remaining: 0 };
    const allowed = enabled && await hasPermission();
    if (allowed) await channel();
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    if (!enabled) for (const n of existing) if (n.content.data?.scope === 'rilo-bill-test') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    const otherCount = existing.filter(n => n.content.data?.scope !== REMINDER_SCOPE).length;
    const changes = reminderChanges(existing.map(n => ({ id: n.identifier, scope: n.content.data?.scope, key: n.content.data?.key })), allowed ? events : [], REMINDER_LIMIT - otherCount);
    for (const id of changes.cancel) await Notifications.cancelScheduledNotificationAsync(id);
    for (const e of changes.add) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Rilo bill reminder', body: `${e.name} is due ${displayDate(e.dueDate)}${e.leadDays ? ` (in ${e.leadDays} day${e.leadDays === 1 ? '' : 's'})` : ' (today)'}.`, sound: 'default', data: { scope: REMINDER_SCOPE, key: e.key, billId: e.billId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(e.fireAt), channelId: CHANNEL },
      });
    }
    return { state: !enabled ? 'off' : allowed ? 'ready' : 'denied', count: changes.count, remaining: changes.remaining };
  });
  tail = task.then(() => {}, () => {});
  return task;
}
export async function testDeviceReminder(): Promise<void> {
  await tail;
  if (!await hasPermission()) throw new Error('Allow notifications in your device settings first.');
  await channel();
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) if (n.content.data?.scope === 'rilo-bill-test') await Notifications.cancelScheduledNotificationAsync(n.identifier);
  await Notifications.scheduleNotificationAsync({ content: { title: 'Rilo test reminder', body: 'Your device can receive Rilo bill reminders.', sound: 'default', data: { scope: 'rilo-bill-test' } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: CHANNEL } });
}
export function observeReminderOpens(open: () => void): () => void {
  const redirect = (n: Notifications.Notification) => {
    if ([REMINDER_SCOPE, 'rilo-bill-test'].includes(String(n.request.content.data?.scope))) {
      open();
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) redirect(last.notification);
  const subscription = Notifications.addNotificationResponseReceivedListener(response => redirect(response.notification));
  return () => subscription.remove();
}

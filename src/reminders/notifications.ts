/**
 * The only file that talks to expo-notifications. Everything here uses LOCAL
 * notifications, which work in Expo Go on iPhone and Android.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import type { Subscription } from '../lib/types';
import { planAll, snoozeTime } from './plan';

export const CHANNEL_ID = 'reminders';
export const CATEGORY_ID = 'decision';
export const ACTION_KEEP = 'keep';
export const ACTION_CANCEL = 'cancel';

export interface ReminderData {
  app: 'trialcatch';
  subscriptionId: number;
  [key: string]: unknown;
}

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Trial and renewal reminders',
      importance: AndroidImportance.HIGH,
    });
  }

  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION_KEEP, buttonTitle: 'Keep it', options: { opensAppToForeground: false } },
    { identifier: ACTION_CANCEL, buttonTitle: 'Cancel it', options: { opensAppToForeground: true, isDestructive: true } },
  ]);
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

async function cancelOurs(subscriptionId?: number): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => {
        const data = n.content.data as Partial<ReminderData> | undefined;
        return data?.app === 'trialcatch' && (subscriptionId === undefined || data.subscriptionId === subscriptionId);
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function schedule(subscriptionId: number, title: string, body: string, date: Date): Promise<void> {
  const data: ReminderData = { app: 'trialcatch', subscriptionId };
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, categoryIdentifier: CATEGORY_ID },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Rebuilds every reminder from the current subscriptions. Called on app open
 * and after any change, because Expo Go has no background jobs.
 * Snoozed reminders survive this because they are tagged separately.
 */
export async function syncReminders(subs: Subscription[]): Promise<void> {
  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => {
        const data = n.content.data as Partial<ReminderData> & { snooze?: boolean };
        return data?.app === 'trialcatch' && !data.snooze;
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  for (const r of planAll(subs, new Date())) {
    await schedule(r.subscriptionId, r.title, r.body, r.fireAt);
  }
}

export async function scheduleSnooze(sub: Subscription): Promise<Date> {
  const fireAt = snoozeTime(new Date());
  const data = { app: 'trialcatch', subscriptionId: sub.id, snooze: true };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Still deciding on ${sub.name}?`,
      body: 'Tap to keep it or cancel before it charges you.',
      data,
      categoryIdentifier: CATEGORY_ID,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNEL_ID },
  });
  return fireAt;
}

export async function cancelRemindersFor(subscriptionId: number): Promise<void> {
  await cancelOurs(subscriptionId);
}

/** For demos and usability tests: a reminder for this subscription in 5 seconds. */
export async function sendTestReminder(sub: Subscription): Promise<void> {
  await schedule(
    sub.id,
    `${sub.name} trial ends tomorrow`,
    'This is a test reminder. Tap to keep it or cancel.',
    new Date(Date.now() + 5000),
  );
}

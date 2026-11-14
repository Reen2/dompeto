import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { RecurringRule } from '@/db/types';
import { addDays, fromISODate, todayISO } from '@/lib/dates';

const DAILY_ID = 'dompet-daily';
const BILL_PREFIX = 'dompet-bill-';

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

export async function scheduleDailyReminder(hour = 20, minute = 0): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) return false;
  await scheduleDaily(hour, minute);
  return true;
}

/**
 * Re-creates the daily reminder at launch when the user already allowed
 * notifications. It never prompts, so restored/new devices stay quiet until
 * the user asks for it explicitly.
 */
export async function restoreDailyReminder(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) return;
  await scheduleDaily(20, 0);
}

async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: 'Sudah catat hari ini?',
      body: 'Luangkan 10 detik untuk mencatat pengeluaran hari ini.',
      sound: Platform.OS === 'ios' ? 'default' : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
}

/** Re-schedules reminders for every active bill rule. Safe to call repeatedly. */
export async function syncBillReminders(rules: RecurringRule[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(BILL_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined)),
  );

  const active = rules.filter((rule) => rule.is_bill && !rule.archived_at);
  if (active.length === 0) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const today = todayISO();
  for (const rule of active) {
    let days: number[] = [3, 1, 0];
    try {
      const parsed = JSON.parse(rule.reminder_days) as unknown;
      if (Array.isArray(parsed)) days = parsed.filter((value): value is number => typeof value === 'number');
    } catch {
      // keep defaults
    }
    for (const offset of days) {
      const target = addDays(rule.next_run, -offset);
      if (target < today) continue;
      const date = fromISODate(target);
      date.setHours(9, 0, 0, 0);
      if (date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${BILL_PREFIX}${rule.id}-${offset}`,
        content: {
          title: offset === 0 ? `${rule.name} jatuh tempo hari ini` : `${rule.name} ${offset} hari lagi`,
          body: 'Ketuk untuk mencatat pembayarannya.',
          data: { ruleId: rule.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      }).catch(() => undefined);
    }
  }
}

import { todayISO } from './dates';

export function hasRecordedToday(transactions: { date: string }[]): boolean {
  const today = todayISO();
  return transactions.some((t) => t.date === today);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function showNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
  } catch {
    // ignore
  }
}

export function scheduleDailyReminder(): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const delay = target.getTime() - now.getTime();
  // Cap at 24h
  if (delay > 0 && delay <= 86400000) {
    setTimeout(() => {
      showNotification('Dompet', 'Apakah kamu sudah mencatat keuanganmu hari ini?');
      // Reschedule for next day
      scheduleDailyReminder();
    }, delay);
  }
}

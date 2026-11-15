import { useEffect } from 'react';
import { useSettings } from '../store/settings';
import { scheduleDailyReminder } from '../lib/reminders';

export default function ReminderScheduler() {
  const { settings } = useSettings();
  useEffect(() => {
    if (settings.dailyReminder) scheduleDailyReminder();
  }, [settings.dailyReminder]);
  return null;
}

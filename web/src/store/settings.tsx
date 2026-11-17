import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../db/db';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Settings = {
  theme: ThemeMode;
  hideBalances: boolean;
  name: string;
  dailyReminder: boolean;
  onboardingDone: boolean;
  profile_avatar: string;
};

const DEFAULTS: Settings = {
  theme: 'system',
  hideBalances: false,
  name: '',
  dailyReminder: false,
  onboardingDone: false,
  profile_avatar: '',
};

type Ctx = {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const rows = await db.settings.toArray();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      setSettings({
        theme: (map.theme as ThemeMode) || DEFAULTS.theme,
        hideBalances: map.hideBalances === 'true',
        name: map.name ?? DEFAULTS.name,
        dailyReminder: map.dailyReminder === 'true',
        onboardingDone: map.onboardingDone === 'true',
        profile_avatar: map.profile_avatar ?? DEFAULTS.profile_avatar,
      });
      setReady(true);
    })();
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    const entries: [string, string][] = [];
    if (patch.theme !== undefined) entries.push(['theme', patch.theme]);
    if (patch.hideBalances !== undefined) entries.push(['hideBalances', String(patch.hideBalances)]);
    if (patch.name !== undefined) entries.push(['name', patch.name]);
    if (patch.dailyReminder !== undefined) entries.push(['dailyReminder', String(patch.dailyReminder)]);
    if (patch.onboardingDone !== undefined) entries.push(['onboardingDone', String(patch.onboardingDone)]);
    if (patch.profile_avatar !== undefined) entries.push(['profile_avatar', patch.profile_avatar]);
    for (const [k, v] of entries) await db.settings.put({ key: k, value: v });
  }, []);

  return <SettingsContext.Provider value={{ settings, ready, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

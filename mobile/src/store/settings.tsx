import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { readSettings, writeSetting } from '@/db/queries';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LockTimeout = 'immediate' | '60' | '300' | 'never';

export type Settings = {
  currency: string;
  theme: ThemeMode;
  hideBalances: boolean;
  lockTimeout: LockTimeout;
  biometric: boolean;
  onboardingDone: boolean;
  name: string;
  dailyReminder: boolean;
};

const DEFAULTS: Settings = {
  currency: 'IDR',
  theme: 'system',
  hideBalances: false,
  lockTimeout: 'immediate',
  biometric: true,
  onboardingDone: false,
  name: '',
  dailyReminder: false,
};

const PIN_KEY = 'dompet.pin';

type SettingsContextValue = {
  settings: Settings;
  ready: boolean;
  pinEnabled: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  refreshPinState: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  const refreshPinState = useCallback(async () => {
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    setPinEnabled(!!pin);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await readSettings();
      const next = { ...DEFAULTS };
      if (raw.currency) next.currency = raw.currency;
      if (raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system') next.theme = raw.theme;
      if (raw.hideBalances) next.hideBalances = raw.hideBalances === '1';
      if (raw.lockTimeout) next.lockTimeout = raw.lockTimeout as LockTimeout;
      if (raw.biometric) next.biometric = raw.biometric === '1';
      if (raw.onboardingDone) next.onboardingDone = raw.onboardingDone === '1';
      if (raw.name) next.name = raw.name;
      if (raw.dailyReminder) next.dailyReminder = raw.dailyReminder === '1';
      await refreshPinState();
      if (alive) {
        setSettings(next);
        setReady(true);
      }
    })().catch(() => setReady(true));
    return () => {
      alive = false;
    };
  }, [refreshPinState]);

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    const entries = Object.entries(patch);
    for (const [key, value] of entries) {
      const stored = typeof value === 'boolean' ? (value ? '1' : '0') : String(value ?? '');
      await writeSetting(key, stored);
    }
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, ready, pinEnabled, update, refreshPinState }),
    [settings, ready, pinEnabled, update, refreshPinState],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsContextValue {
  const ctx = use(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

/* ----------------------------- PIN & biometry ----------------------------- */

type StoredPin = { salt: string; hash: string };

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_KEY, JSON.stringify({ salt, hash } satisfies StoredPin));
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(PIN_KEY);
  if (!raw) return true;
  try {
    const stored = JSON.parse(raw) as StoredPin;
    const hash = await hashPin(pin, stored.salt);
    return hash === stored.hash;
  } catch {
    return false;
  }
}

export async function biometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function biometricUnlock(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Buka Dompet',
    fallbackLabel: 'Gunakan PIN',
    cancelLabel: 'Batal',
    disableDeviceFallback: false,
  });
  return result.success;
}

export function biometricLabel(): string {
  return 'Face ID';
}

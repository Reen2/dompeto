import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { LockScreen } from '@/components/lock-screen';
import { getDb } from '@/db';
import { listRecurring, runRecurring } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { restoreDailyReminder, syncBillReminders } from '@/lib/notifications';
import { Onboarding } from '@/screens/onboarding';
import { SettingsProvider, useSettings } from '@/store/settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <Shell />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const c = useTheme();
  const { settings, ready, pinEnabled } = useSettings();
  const [dbReady, setDbReady] = useState(false);
  const [unlockedState, setUnlocked] = useState(false);
  const backgroundedAt = useRef(0);
  // Without a PIN there is nothing to unlock, so derive it instead of syncing state.
  const unlocked = unlockedState || !pinEnabled;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await getDb();
        await runRecurring();
        await syncBillReminders(await listRecurring());
      } catch {
        // A broken migration should not trap the user on a blank screen.
      }
      if (alive) setDbReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready && dbReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, dbReady]);

  useEffect(() => {
    if (!ready || !settings.dailyReminder) return;
    void restoreDailyReminder();
  }, [ready, settings.dailyReminder]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active' || !pinEnabled) return;
      const timeout = settings.lockTimeout;
      if (timeout === 'never') return;
      const limit = timeout === 'immediate' ? 0 : Number(timeout) * 1000;
      if (Date.now() - backgroundedAt.current >= limit) setUnlocked(false);
    });
    return () => subscription.remove();
  }, [pinEnabled, settings.lockTimeout]);

  if (!ready || !dbReady) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  if (!settings.onboardingDone) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={c.dark ? 'light' : 'dark'} />
        <Onboarding onDone={() => setUnlocked(true)} />
      </View>
    );
  }

  if (pinEnabled && !unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={c.dark ? 'light' : 'dark'} />
        <LockScreen onUnlock={() => setUnlocked(true)} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { color: c.text, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.bg },
          headerBackTitle: 'Kembali',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transaction/new"
          options={{ presentation: 'modal', title: 'Transaksi Baru', headerShown: false }}
        />
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', title: 'Ubah Transaksi', headerShown: false }} />
        <Stack.Screen name="wallets" options={{ title: 'Dompet', headerLargeTitle: true }} />
        <Stack.Screen name="categories" options={{ title: 'Kategori', headerLargeTitle: true }} />
        <Stack.Screen name="recurring" options={{ title: 'Berulang', headerLargeTitle: true }} />
        <Stack.Screen name="goals" options={{ title: 'Tujuan', headerLargeTitle: true }} />
        <Stack.Screen name="debts" options={{ title: 'Utang & Piutang', headerLargeTitle: true }} />
        <Stack.Screen name="wishlist" options={{ title: 'Daftar Impian', headerLargeTitle: true }} />
        <Stack.Screen name="settings" options={{ title: 'Pengaturan', headerLargeTitle: true }} />
        <Stack.Screen name="settings/security" options={{ title: 'Keamanan' }} />
        <Stack.Screen name="settings/backup" options={{ title: 'Backup & Data' }} />
        <Stack.Screen name="settings/appearance" options={{ title: 'Tampilan' }} />
      </Stack>
    </>
  );
}

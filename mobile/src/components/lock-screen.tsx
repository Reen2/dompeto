import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { Txt } from '@/components/ui';
import { resetDatabase } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { biometricAvailable, biometricUnlock, clearPin, verifyPin, useSettings } from '@/store/settings';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [errorTrigger, setErrorTrigger] = useState(0);
  const [canBio, setCanBio] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    let alive = true;
    biometricAvailable()
      .then((available) => {
        if (alive) setCanBio(available);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const tryBiometric = useCallback(async () => {
    if (!canBio) return;
    const ok = await biometricUnlock().catch(() => false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    }
  }, [canBio, onUnlock]);

  useEffect(() => {
    if (settings.biometric && canBio && !attempted.current) {
      attempted.current = true;
      void tryBiometric();
    }
  }, [settings.biometric, canBio, tryBiometric]);

  async function handlePin(pin: string) {
    const ok = await verifyPin(pin);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    } else {
      setErrorTrigger((n) => n + 1);
    }
  }

  function forgotPin() {
    Alert.alert(
      'Lupa PIN?',
      'Demi keamanan, PIN tidak bisa dipulihkan. Satu-satunya cara adalah menghapus seluruh data Dompet di perangkat ini.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus semua data',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await clearPin();
              await resetDatabase();
              onUnlock();
            })();
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ alignItems: 'center', paddingTop: 26 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}>
          <Txt style={{ color: c.onAccent, fontSize: 20, fontWeight: '700' }}>D</Txt>
        </View>
        <Txt variant="caption" color={c.textMuted} style={{ letterSpacing: 3, textTransform: 'uppercase' }}>
          Dompet
        </Txt>
      </View>

      <View style={{ flex: 1 }}>
        <PinPad
          title="Selamat datang kembali"
          subtitle={
            settings.name ? `Halo, ${settings.name}. Masukkan PIN untuk membuka.` : 'Masukkan PIN untuk membuka dompetmu.'
          }
          onComplete={handlePin}
          onBiometric={canBio ? tryBiometric : undefined}
          errorTrigger={errorTrigger}
        />
      </View>

      <Pressable onPress={forgotPin} style={{ paddingVertical: 18, alignItems: 'center' }}>
        <Txt variant="caption" color={c.textFaint}>
          Lupa PIN?
        </Txt>
      </Pressable>
    </View>
  );
}

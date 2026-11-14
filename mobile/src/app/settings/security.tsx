import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Switch, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PinPad } from '@/components/pin-pad';
import {
  Badge,
  Button,
  Card,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  Txt,
} from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/lib/theme';
import {
  biometricAvailable,
  biometricLabel,
  biometricUnlock,
  clearPin,
  setPin,
  useSettings,
  verifyPin,
  type LockTimeout,
} from '@/store/settings';

type Stage = 'idle' | 'create' | 'confirm' | 'change' | 'remove';

const TIMEOUTS: { value: LockTimeout; label: string }[] = [
  { value: 'immediate', label: 'Langsung' },
  { value: '60', label: '1 menit' },
  { value: '300', label: '5 menit' },
  { value: 'never', label: 'Tidak pernah' },
];

export default function SecurityScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, pinEnabled, refreshPinState } = useSettings();
  const [stage, setStage] = useState<Stage>('idle');
  const [firstPin, setFirstPin] = useState('');
  const [errorTrigger, setErrorTrigger] = useState(0);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    biometricAvailable()
      .then(setBioAvailable)
      .catch(() => setBioAvailable(false));
  }, []);

  const faceId = biometricLabel();

  function close() {
    setStage('idle');
    setFirstPin('');
  }

  async function handlePin(pin: string) {
    if (stage === 'create') {
      setFirstPin(pin);
      setStage('confirm');
      return;
    }

    if (stage === 'confirm') {
      if (pin !== firstPin) {
        setErrorTrigger((n) => n + 1);
        setFirstPin('');
        setStage('create');
        return;
      }
      await setPin(pin);
      await refreshPinState();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
      return;
    }

    const ok = await verifyPin(pin);
    if (!ok) {
      setErrorTrigger((n) => n + 1);
      return;
    }

    if (stage === 'change') {
      setFirstPin('');
      setStage('create');
      return;
    }

    if (stage === 'remove') {
      await clearPin();
      await update({ biometric: false });
      await refreshPinState();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    }
  }

  async function toggleBiometric(next: boolean) {
    if (!next) {
      await update({ biometric: false });
      return;
    }
    if (!bioAvailable) {
      Alert.alert(
        `${faceId} belum tersedia`,
        `Atur ${faceId} di Pengaturan iPhone terlebih dahulu, lalu coba lagi.`,
      );
      return;
    }
    const ok = await biometricUnlock();
    if (ok) {
      await update({ biometric: true });
    } else {
      Alert.alert('Belum aktif', `${faceId} tidak dapat diverifikasi. Coba lagi.`);
    }
  }

  const title =
    stage === 'create'
      ? 'Buat PIN baru'
      : stage === 'confirm'
        ? 'Ulangi PIN baru'
        : stage === 'change'
          ? 'Masukkan PIN saat ini'
          : 'Konfirmasi PIN';

  const subtitle =
    stage === 'create'
      ? 'Enam angka yang mudah kamu ingat, sulit ditebak orang lain.'
      : stage === 'confirm'
        ? 'Ketik sekali lagi untuk memastikan tidak ada salah angka.'
        : 'Demi keamanan, kami perlu memastikan ini benar-benar kamu.';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={40}>
        <Card>
          <Row gap={14}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pinEnabled ? `${c.income}1C` : c.accentSoft,
              }}>
              <Icon
                sf={pinEnabled ? 'lock.fill' : 'lock.open.fill'}
                size={20}
                color={pinEnabled ? c.income : c.accent}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Row gap={6}>
                <Txt variant="h3">{pinEnabled ? 'Dompet terkunci' : 'Dompet belum dikunci'}</Txt>
                {pinEnabled ? <Badge label="Aktif" color={c.income} /> : null}
              </Row>
              <Txt variant="caption" color={c.textMuted}>
                {pinEnabled
                  ? 'PIN 6 angka melindungi data keuanganmu di perangkat ini.'
                  : 'Tanpa PIN, siapa pun yang memegang iPhone-mu bisa membuka Dompet.'}
              </Txt>
            </View>
          </Row>

          <View style={{ marginTop: 16, gap: 8 }}>
            {pinEnabled ? (
              <>
                <Button label="Ubah PIN" variant="secondary" onPress={() => setStage('change')} />
                <Button label="Matikan PIN" variant="ghost" onPress={() => setStage('remove')} />
              </>
            ) : (
              <Button label="Buat PIN" onPress={() => setStage('create')} />
            )}
          </View>
        </Card>

        <SectionHeader title="Buka cepat" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row between style={{ paddingVertical: 14 }}>
            <Row gap={12} style={{ flex: 1 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  backgroundColor: c.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon sf="faceid" size={18} color={c.textMuted} />
              </View>
              <View style={{ flex: 1, gap: 2, paddingRight: 8 }}>
                <Txt variant="body" weight="500">
                  {faceId}
                </Txt>
                <Txt variant="caption" color={c.textMuted}>
                  {bioAvailable
                    ? pinEnabled
                      ? 'Buka dompet tanpa mengetik PIN.'
                      : 'Aktifkan PIN dulu untuk memakai Face ID.'
                    : 'Belum diatur di iPhone ini.'}
                </Txt>
              </View>
            </Row>
            <Switch
              value={pinEnabled && settings.biometric}
              disabled={!pinEnabled}
              onValueChange={(value) => void toggleBiometric(value)}
              trackColor={{ true: c.accent, false: c.borderStrong }}
            />
          </Row>
        </Card>

        <SectionHeader title="Kunci otomatis" />
        <Card>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 10 }}>
            Kunci Dompet setelah aplikasi ditinggal sekian lama.
          </Txt>
          <Segmented
            options={TIMEOUTS}
            value={settings.lockTimeout}
            onChange={(value) => void update({ lockTimeout: value })}
          />
          {!pinEnabled ? (
            <Txt variant="caption" color={c.textFaint} style={{ marginTop: 10 }}>
              Berlaku setelah PIN dibuat.
            </Txt>
          ) : null}
        </Card>

        <View
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: radius.md,
            backgroundColor: c.surfaceAlt,
            gap: 8,
          }}>
          <Row gap={8}>
            <Icon sf="exclamationmark.shield.fill" size={15} color={c.warning} />
            <Txt variant="label" weight="600" color={c.warning}>
              PIN tidak bisa dipulihkan
            </Txt>
          </Row>
          <Txt variant="caption" color={c.textMuted} style={{ lineHeight: 18 }}>
            Kami tidak menyimpan PIN di server mana pun. Jika lupa, satu-satunya cara adalah
            menghapus seluruh data Dompet di perangkat ini — jadi pastikan kamu punya backup.
          </Txt>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                'Tips mengingat PIN',
                'Gunakan pola yang bermakna untukmu, tapi hindari tanggal lahir atau angka berurutan yang mudah ditebak.',
              );
            }}
            hitSlop={6}>
            <Txt variant="caption" color={c.accent} weight="600">
              Tips memilih PIN
            </Txt>
          </Pressable>
        </View>
      </Screen>

      <Modal visible={stage !== 'idle'} animationType="slide" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
          <Row between style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Batal">
              <Txt variant="body" color={c.textMuted}>
                Batal
              </Txt>
            </Pressable>
            <Txt variant="label" color={c.textFaint}>
              Keamanan
            </Txt>
            <View style={{ width: 42 }} />
          </Row>
          <PinPad
            title={title}
            subtitle={subtitle}
            onComplete={handlePin}
            errorTrigger={errorTrigger}
          />
        </View>
      </Modal>
    </View>
  );
}

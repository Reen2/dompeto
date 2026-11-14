import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PinPad } from '@/components/pin-pad';
import { Button, Input, Row, Stack, Txt } from '@/components/ui';
import { saveWallet } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, parseAmountInput } from '@/lib/money';
import { radius } from '@/lib/theme';
import { biometricAvailable, setPin, useSettings } from '@/store/settings';

const STEPS = ['Selamat datang', 'Profil', 'Keamanan', 'Dompet'];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { update } = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [walletName, setWalletName] = useState('Dompet Utama');
  const [opening, setOpening] = useState('');
  const [pinStage, setPinStage] = useState<'idle' | 'create' | 'confirm'>('idle');
  const [firstPin, setFirstPin] = useState('');
  const [errorTrigger, setErrorTrigger] = useState(0);
  const [saving, setSaving] = useState(false);

  const next = () => setStep((prev) => Math.min(STEPS.length - 1, prev + 1));

  async function beginPin() {
    const available = await biometricAvailable();
    await update({ biometric: available });
    setPinStage('create');
  }

  async function finish() {
    setSaving(true);
    try {
      await saveWallet({
        name: walletName.trim() || 'Dompet Utama',
        type: 'cash',
        icon: 'wallet.pass.fill',
        color: c.accent,
        opening_balance: parseAmountInput(opening),
      });
      await update({ name: name.trim(), onboardingDone: true });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  function handlePin(pin: string) {
    if (pinStage === 'create') {
      setFirstPin(pin);
      setPinStage('confirm');
      return;
    }
    if (pin === firstPin) {
      void setPin(pin);
      setStep(3);
      setPinStage('idle');
      return;
    }
    setErrorTrigger((n) => n + 1);
    setPinStage('create');
    setFirstPin('');
  }

  const canContinue =
    (step === 0) ||
    (step === 1 && name.trim().length > 0) ||
    (step === 2) ||
    (step === 3 && walletName.trim().length > 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}>
      {step === 0 ? (
        <LinearGradient
          colors={c.dark ? ['#1B1917', '#0C0C0D'] : ['#F4EBD9', '#FAF8F4']}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 24, flex: 1 }}>
        <Row between style={{ marginBottom: 4 }}>
          <Txt
            variant="caption"
            color={step === 0 ? c.accent : c.textMuted}
            style={{ letterSpacing: 3.2, textTransform: 'uppercase', fontWeight: '700' }}>
            Dompet
          </Txt>
          <Row gap={5}>
            {STEPS.map((label, index) => (
              <View
                key={label}
                style={{
                  width: index === step ? 18 : 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: index === step ? c.accent : c.borderStrong,
                }}
              />
            ))}
          </Row>
        </Row>

        <ScrollView
          key={`${step}-${pinStage}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
          {step === 0 ? (
            <View style={{ paddingTop: 42, gap: 18 }}>
              <Txt variant="display" style={{ fontSize: 44, lineHeight: 50 }}>
                Uang rapi.{'\n'}Hidup tenang.
              </Txt>
              <Txt variant="body" color={c.textMuted} style={{ fontSize: 16, lineHeight: 24, maxWidth: 330 }}>
                Dompet membantumu mencatat pengeluaran dengan tenang — tanpa ribet, tanpa akun, semua
                tersimpan di iPhone-mu.
              </Txt>

              <View style={{ marginTop: 26, gap: 20 }}>
                {[
                  { icon: 'bolt.fill', title: 'Catat dalam 5 detik', body: 'Template cepat & transaksi berulang.' },
                  { icon: 'chart.pie.fill', title: 'Tahu ke mana uang pergi', body: 'Anggaran, laporan, dan arus kas bulanan.' },
                  { icon: 'lock.shield.fill', title: 'Privat sepenuhnya', body: 'Terkunci PIN & Face ID. Tanpa server.' },
                ].map((item) => (
                  <Row key={item.title} gap={14} style={{ alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.accentSoft,
                      }}>
                      <Icon sf={item.icon} size={17} color={c.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="h3">{item.title}</Txt>
                      <Txt variant="caption" color={c.textMuted}>
                        {item.body}
                      </Txt>
                    </View>
                  </Row>
                ))}
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={{ paddingTop: 42, gap: 16 }}>
              <Txt variant="h1">Siapa nama{'\n'}panggilanmu?</Txt>
              <Txt variant="body" color={c.textMuted} style={{ marginBottom: 10 }}>
                Kami pakai untuk menyapa di beranda.
              </Txt>
              <Input
                label="Nama"
                placeholder="Contoh: Raka"
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => canContinue && next()}
              />
              <Row gap={10} style={{ marginTop: 8, alignItems: 'flex-start' }}>
                <Icon sf="info.circle" size={15} color={c.textFaint} />
                <Txt variant="caption" color={c.textFaint} style={{ flex: 1 }}>
                  Mata uang: Rupiah (IDR). Bisa diubah nanti di Pengaturan.
                </Txt>
              </Row>
            </View>
          ) : null}

          {step === 2 ? (
            pinStage === 'idle' ? (
              <View style={{ paddingTop: 42, gap: 16 }}>
                <Txt variant="h1">Kunci aplikasi</Txt>
                <Txt variant="body" color={c.textMuted} style={{ lineHeight: 23 }}>
                  Lindungi catatan keuanganmu dengan PIN 6 angka. Kamu juga bisa membuka dengan Face ID.
                </Txt>
                <View
                  style={{
                    marginTop: 18,
                    padding: 18,
                    borderRadius: radius.lg,
                    backgroundColor: c.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: c.border,
                    gap: 12,
                  }}>
                  <Row gap={12}>
                    <Icon sf="faceid" size={22} color={c.accent} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="h3">Face ID</Txt>
                      <Txt variant="caption" color={c.textMuted}>
                        Buka dompet dengan sekali pandang.
                      </Txt>
                    </View>
                  </Row>
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />
                  <Row gap={12}>
                    <Icon sf="circle.grid.3x3.fill" size={22} color={c.accent} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="h3">PIN 6 angka</Txt>
                      <Txt variant="caption" color={c.textMuted}>
                        Tetap bisa dibuka tanpa Face ID.
                      </Txt>
                    </View>
                  </Row>
                </View>
                <Stack gap={10} style={{ marginTop: 16 }}>
                  <Button label="Buat PIN" onPress={() => void beginPin()} />
                  <Button label="Lewati dulu" variant="ghost" onPress={() => setStep(3)} />
                </Stack>
              </View>
            ) : (
              <View style={{ paddingTop: 10, minHeight: 520 }}>
                <PinPad
                  title={pinStage === 'create' ? 'Buat PIN' : 'Ulangi PIN'}
                  subtitle={
                    pinStage === 'create'
                      ? 'Masukkan 6 angka yang mudah kamu ingat.'
                      : 'Masukkan lagi untuk memastikan.'
                  }
                  onComplete={handlePin}
                  errorTrigger={errorTrigger}
                />
              </View>
            )
          ) : null}

          {step === 3 ? (
            <View style={{ paddingTop: 42, gap: 16 }}>
              <Txt variant="h1">Dompet pertama</Txt>
              <Txt variant="body" color={c.textMuted}>
                Kas, rekening bank, atau e-wallet. Bisa tambah lainnya nanti.
              </Txt>
              <Input label="Nama dompet" value={walletName} onChangeText={setWalletName} />
              <Input
                label="Saldo saat ini"
                placeholder="0"
                keyboardType="number-pad"
                value={opening ? formatMoney(parseAmountInput(opening)) : ''}
                onChangeText={(text) => setOpening(text)}
                style={{ fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '600' }}
              />
              <Txt variant="caption" color={c.textFaint}>
                Kosongkan jika ingin mulai dari nol.
              </Txt>
            </View>
          ) : null}
        </ScrollView>

        {!(step === 2 && pinStage !== 'idle') ? (
          <View style={{ paddingBottom: Math.max(insets.bottom, 16), paddingTop: 8 }}>
            <Button
              label={step === 0 ? 'Mulai' : step === 3 ? 'Buka Dompet' : 'Lanjut'}
              size="lg"
              disabled={!canContinue || saving}
              loading={saving}
              onPress={() => {
                if (step === STEPS.length - 1) void finish();
                else next();
              }}
            />
            {step === 0 ? (
              <Txt variant="caption" color={c.textFaint} align="center" style={{ marginTop: 12 }}>
                Data tersimpan lokal di perangkatmu.
              </Txt>
            ) : null}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

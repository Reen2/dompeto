import { Pressable, StyleSheet, Switch, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { Card, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { Dark, Light, radius, type ThemeColors } from '@/lib/theme';
import { useSettings, type ThemeMode } from '@/store/settings';

const OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'system', label: 'Sistem', hint: 'Ikut pengaturan iPhone' },
  { value: 'light', label: 'Terang', hint: 'Ivory yang hangat' },
  { value: 'dark', label: 'Gelap', hint: 'Arang yang tenang' },
];

export default function AppearanceScreen() {
  const c = useTheme();
  const { settings, update } = useSettings();

  return (
    <Screen bottomInset={40}>
      <Txt variant="label" color={c.textMuted} style={{ marginBottom: 10 }}>
        Pilih suasana yang paling nyaman untuk matamu.
      </Txt>

      <Row gap={10}>
        {OPTIONS.map((option) => {
          const active = settings.theme === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                Haptics.selectionAsync();
                void update({ theme: option.value });
              }}
              style={{ flex: 1 }}>
              <View
                style={{
                  borderRadius: radius.lg,
                  borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                  borderColor: active ? c.accent : c.border,
                  backgroundColor: c.surface,
                  padding: 6,
                }}>
                <ThemePreview mode={option.value} />
              </View>
              <Row between style={{ marginTop: 7, paddingHorizontal: 2 }}>
                <View style={{ gap: 1 }}>
                  <Txt variant="label" weight="600" color={active ? c.text : c.textMuted}>
                    {option.label}
                  </Txt>
                  <Txt variant="caption" color={c.textFaint} style={{ fontSize: 10 }}>
                    {option.hint}
                  </Txt>
                </View>
                {active ? <Icon sf="checkmark.circle.fill" size={15} color={c.accent} /> : null}
              </Row>
            </Pressable>
          );
        })}
      </Row>

      <SectionHeader title="Kenyamanan" />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <Row between style={{ paddingVertical: 14 }}>
          <View style={{ flex: 1, gap: 2, paddingRight: 12 }}>
            <Txt variant="body" weight="500">
              Sembunyikan saldo
            </Txt>
            <Txt variant="caption" color={c.textMuted}>
              Nominal diganti •••••• — berguna saat membuka aplikasi di tempat umum.
            </Txt>
          </View>
          <Switch
            value={settings.hideBalances}
            onValueChange={(value) => void update({ hideBalances: value })}
            trackColor={{ true: c.accent, false: c.borderStrong }}
          />
        </Row>
      </Card>

      <Txt variant="caption" color={c.textFaint} style={{ marginTop: 16, lineHeight: 18 }}>
        Dompet memakai warna champagne dan ivory agar terasa tenang, bukan seperti aplikasi
        perbankan yang ramai. Mode gelap aktif otomatis bila kamu memilih “Sistem”.
      </Txt>
    </Screen>
  );
}

function ThemePreview({ mode }: { mode: ThemeMode }) {
  const c = useTheme();
  const palette: ThemeColors = mode === 'dark' ? Dark : mode === 'light' ? Light : c;
  return (
    <View
      style={{
        borderRadius: radius.md - 4,
        backgroundColor: palette.bg,
        padding: 8,
        gap: 5,
        overflow: 'hidden',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent }} />
        <View style={{ height: 3, width: 26, borderRadius: 2, backgroundColor: palette.text, opacity: 0.75 }} />
      </View>
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          padding: 6,
          gap: 4,
        }}>
        <View style={{ height: 4, width: '62%', borderRadius: 2, backgroundColor: palette.text, opacity: 0.8 }} />
        <View style={{ height: 3, width: '40%', borderRadius: 2, backgroundColor: palette.textFaint }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ flex: 1, height: 10, borderRadius: 4, backgroundColor: palette.accent, opacity: 0.85 }} />
        <View style={{ flex: 1, height: 10, borderRadius: 4, backgroundColor: palette.surfaceAlt }} />
      </View>
    </View>
  );
}

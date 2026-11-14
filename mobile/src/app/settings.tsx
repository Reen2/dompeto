import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Icon } from '@/components/icon';
import { ConfirmSheet, Sheet } from '@/components/sheet';
import {
  Badge,
  Button,
  Card,
  Divider,
  Input,
  ListRow,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { resetDatabase } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { cancelDailyReminder, scheduleDailyReminder } from '@/lib/notifications';
import { clearPin, useSettings } from '@/store/settings';

const THEME_LABEL: Record<string, string> = {
  system: 'Ikuti sistem',
  light: 'Terang',
  dark: 'Gelap',
};

export default function SettingsScreen() {
  const c = useTheme();
  const { settings, update, refreshPinState } = useSettings();
  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(settings.name);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const initials = (settings.name || 'D').trim().slice(0, 1).toUpperCase();

  async function toggleReminder(next: boolean) {
    if (!next) {
      await cancelDailyReminder();
      await update({ dailyReminder: false });
      return;
    }
    const granted = await scheduleDailyReminder(20, 0);
    await update({ dailyReminder: granted });
    if (!granted) {
      Alert.alert(
        'Izin notifikasi diperlukan',
        'Aktifkan notifikasi untuk Dompet di Pengaturan iPhone, lalu coba lagi.',
      );
    }
  }

  async function resetAll() {
    setBusy(true);
    try {
      await resetDatabase();
      await clearPin();
      await refreshPinState();
      await update({
        onboardingDone: false,
        name: '',
        hideBalances: false,
        dailyReminder: false,
        theme: 'system',
        lockTimeout: 'immediate',
      });
      await cancelDailyReminder();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={40}>
        <Card>
          <Row gap={14}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt style={{ fontSize: 22, fontWeight: '700', color: c.accent }}>{initials}</Txt>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="h2">{settings.name || 'Tanpa nama'}</Txt>
              <Row gap={6}>
                <Badge label="Data lokal" color={c.income} />
                {settings.hideBalances ? <Badge label="Saldo disembunyikan" color={c.textMuted} /> : null}
              </Row>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setDraftName(settings.name);
                setNameOpen(true);
              }}
              hitSlop={8}
              accessibilityLabel="Ubah nama">
              <Icon sf="pencil" size={17} color={c.textMuted} />
            </Pressable>
          </Row>
        </Card>

        <SectionHeader title="Preferensi" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <ListRow
            icon="paintbrush.fill"
            iconColor={c.accent}
            title="Tampilan"
            subtitle="Terang, gelap, atau ikuti sistem"
            value={THEME_LABEL[settings.theme]}
            onPress={() => router.push('/settings/appearance')}
          />
          <Divider inset={48} />
          <ListRow
            icon="eye.slash.fill"
            title="Sembunyikan saldo"
            subtitle="Nominal tampil sebagai ••••••"
            showChevron={false}
            right={
              <Switch
                value={settings.hideBalances}
                onValueChange={(value) => void update({ hideBalances: value })}
                trackColor={{ true: c.accent, false: c.borderStrong }}
              />
            }
          />
          <Divider inset={48} />
          <ListRow
            icon="bell.badge.fill"
            title="Pengingat harian"
            subtitle="Notifikasi lembut pukul 20.00"
            showChevron={false}
            right={
              <Switch
                value={settings.dailyReminder}
                onValueChange={(value) => void toggleReminder(value)}
                trackColor={{ true: c.accent, false: c.borderStrong }}
              />
            }
          />
          <Divider inset={48} />
          <ListRow
            icon="lock.shield.fill"
            iconColor={c.info}
            title="Keamanan"
            subtitle="PIN, Face ID, dan kunci otomatis"
            value={settings.biometric ? 'Face ID' : undefined}
            onPress={() => router.push('/settings/security')}
          />
        </Card>

        <SectionHeader title="Data" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <ListRow
            icon="externaldrive.fill"
            iconColor={c.info}
            title="Backup & data"
            subtitle="Cadangkan, pulihkan, ekspor CSV"
            onPress={() => router.push('/settings/backup')}
          />
          <Divider inset={48} />
          <ListRow
            icon="wallet.pass.fill"
            title="Dompet & rekening"
            value="Kelola"
            onPress={() => router.push('/wallets')}
          />
          <Divider inset={48} />
          <ListRow
            icon="square.grid.2x2.fill"
            title="Kategori"
            value="Kelola"
            onPress={() => router.push('/categories')}
          />
        </Card>

        <SectionHeader title="Tentang" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <ListRow icon="info.circle.fill" title="Versi" value={version} showChevron={false} />
          <Divider inset={48} />
          <ListRow
            icon="hand.raised.fill"
            title="Privasi"
            subtitle="Tidak ada akun, server, atau pelacakan"
            showChevron={false}
          />
          <Divider inset={48} />
          <ListRow
            icon="trash.fill"
            iconColor={c.expense}
            title="Hapus semua data"
            subtitle="Kembali ke kondisi awal"
            showChevron={false}
            onPress={() => setResetOpen(true)}
          />
        </Card>

        <Txt variant="caption" color={c.textFaint} align="center" style={{ marginTop: 22, lineHeight: 18 }}>
          Dompet dibuat untuk kamu yang ingin uangnya rapi{'\n'}tanpa ribet dan tanpa pamer.
        </Txt>
      </Screen>

      <Sheet
        visible={nameOpen}
        onClose={() => setNameOpen(false)}
        title="Nama panggilan"
        subtitle="Dipakai untuk menyapa di beranda"
        scroll={false}
        footer={
          <Button
            label="Simpan"
            size="lg"
            disabled={!draftName.trim()}
            onPress={() => {
              void update({ name: draftName.trim() });
              setNameOpen(false);
            }}
          />
        }>
        <Input
          label="Nama"
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Contoh: Raka"
          autoCapitalize="words"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!draftName.trim()) return;
            void update({ name: draftName.trim() });
            setNameOpen(false);
          }}
        />
      </Sheet>

      <ConfirmSheet
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Hapus semua data?"
        message="Seluruh transaksi, dompet, anggaran, dan PIN akan dihapus dari perangkat ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel={busy ? 'Menghapus…' : 'Ya, hapus semua'}
        onConfirm={() => void resetAll()}
      />
    </View>
  );
}

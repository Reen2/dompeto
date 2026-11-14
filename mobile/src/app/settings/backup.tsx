import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ConfirmSheet } from '@/components/sheet';
import {
  Badge,
  Button,
  Card,
  Divider,
  ListRow,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { notifyChanged, useQuery } from '@/db';
import { readSettings, writeSetting } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { restoreBackup, shareBackup, shareTransactionsCsv, snapshotStats } from '@/lib/backup';
import { formatDateID, toISODate } from '@/lib/dates';
import { nowISO } from '@/lib/id';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

type Job = 'backup' | 'restore' | 'csv' | null;

export default function BackupScreen() {
  const c = useTheme();
  const { settings, update } = useSettings();
  const [job, setJob] = useState<Job>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const stats = useQuery(() => snapshotStats(), []);
  const stored = useQuery(() => readSettings(), []);
  const lastBackup = stored.data?.lastBackupAt ? formatStamp(stored.data.lastBackupAt) : null;

  const counts = stats.data ?? { transactions: 0, wallets: 0, categories: 0 };

  async function runBackup() {
    setJob('backup');
    try {
      const result = await shareBackup();
      if (result.canceled) return;
      if (!result.ok) {
        Alert.alert('Backup gagal', result.message ?? 'Coba lagi beberapa saat lagi.');
        return;
      }
      await writeSetting('lastBackupAt', nowISO());
      notifyChanged();
    } finally {
      setJob(null);
    }
  }

  async function runCsv() {
    setJob('csv');
    try {
      const result = await shareTransactionsCsv();
      if (result.canceled) return;
      if (!result.ok) {
        Alert.alert('Ekspor gagal', result.message ?? 'Coba lagi beberapa saat lagi.');
      }
    } finally {
      setJob(null);
    }
  }

  async function runRestore() {
    setJob('restore');
    // Device-level preferences stay as they are; only the content is replaced.
    const keep = {
      name: settings.name,
      theme: settings.theme,
      hideBalances: settings.hideBalances,
      lockTimeout: settings.lockTimeout,
      biometric: settings.biometric,
      dailyReminder: settings.dailyReminder,
    };
    try {
      // Give the confirmation sheet time to dismiss before iOS presents the
      // document picker; presenting while a modal is still closing can fail.
      await new Promise((resolve) => setTimeout(resolve, 350));
      const result = await restoreBackup();
      if (result.canceled) return;
      if (!result.ok) {
        Alert.alert('Pemulihan gagal', result.message ?? 'File backup tidak dapat dibaca.');
        return;
      }
      await update({ ...keep, onboardingDone: true });
      Alert.alert('Data dipulihkan', result.message ?? 'Semua data sudah kembali.');
    } finally {
      setJob(null);
    }
  }

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
                backgroundColor: c.accentSoft,
              }}>
              <Icon sf="externaldrive.fill" size={21} color={c.accent} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="h3">Semua data milikmu</Txt>
              <Txt variant="caption" color={c.textMuted}>
                Tersimpan di iPhone ini. Backup membuat salinan yang bisa kamu bawa pindah
                perangkat.
              </Txt>
            </View>
          </Row>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Stat label="Transaksi" value={counts.transactions} />
            <Stat label="Dompet" value={counts.wallets} />
            <Stat label="Kategori" value={counts.categories} />
          </View>

          {lastBackup ? (
            <Row gap={6} style={{ marginTop: 12 }}>
              <Icon sf="checkmark.seal.fill" size={13} color={c.income} />
              <Txt variant="caption" color={c.textMuted}>
                Terakhir dicadangkan {lastBackup}
              </Txt>
            </Row>
          ) : (
            <Txt variant="caption" color={c.textFaint} style={{ marginTop: 12 }}>
              Belum pernah dicadangkan.
            </Txt>
          )}
        </Card>

        <SectionHeader title="Backup" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <ListRow
            icon="arrow.up.doc.fill"
            iconColor={c.accent}
            title="Buat backup"
            subtitle="File JSON berisi seluruh data"
            showChevron={false}
            right={
              <Button
                label={job === 'backup' ? 'Menyiapkan…' : 'Simpan'}
                variant="secondary"
                size="sm"
                loading={job === 'backup'}
                disabled={job !== null}
                onPress={() => void runBackup()}
              />
            }
          />
          <Divider inset={48} />
          <ListRow
            icon="arrow.down.doc.fill"
            iconColor={c.info}
            title="Pulihkan dari backup"
            subtitle="Ganti data saat ini dengan file backup"
            showChevron={false}
            right={
              <Button
                label="Pilih file"
                variant="secondary"
                size="sm"
                loading={job === 'restore'}
                disabled={job !== null}
                onPress={() => setConfirmRestore(true)}
              />
            }
          />
          <Divider inset={48} />
          <ListRow
            icon="tablecells"
            title="Ekspor transaksi (CSV)"
            subtitle="Buka di Numbers, Excel, atau Google Sheets"
            showChevron={false}
            right={
              <Button
                label={job === 'csv' ? 'Menyiapkan…' : 'Ekspor'}
                variant="secondary"
                size="sm"
                loading={job === 'csv'}
                disabled={job !== null}
                onPress={() => void runCsv()}
              />
            }
          />
        </Card>

        <SectionHeader title="Pindah iPhone?" />
        <Card>
          <Row gap={12}>
            <Icon sf="iphone.and.arrow.forward" size={17} color={c.textMuted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="body" weight="500">
                Buat backup, lalu pulihkan di perangkat baru
              </Txt>
              <Txt variant="caption" color={c.textMuted}>
                Setiap orang punya data lokal sendiri — tidak ada akun dan tidak ada server.
              </Txt>
            </View>
            <Badge label="Privat" color={c.income} />
          </Row>
        </Card>

        <View
          style={{
            marginTop: 18,
            padding: 15,
            borderRadius: radius.md,
            backgroundColor: c.surfaceAlt,
            gap: 7,
          }}>
          <Row gap={8}>
            <Icon sf="exclamationmark.triangle.fill" size={14} color={c.warning} />
            <Txt variant="label" weight="600" color={c.warning}>
              Simpan file backup dengan aman
            </Txt>
          </Row>
          <Txt variant="caption" color={c.textMuted} style={{ lineHeight: 18 }}>
            File backup tidak terenkripsi dan berisi seluruh catatan keuanganmu. Simpan di tempat
            pribadi seperti iCloud Drive, dan jangan bagikan ke orang lain.
          </Txt>
        </View>

        <Txt variant="caption" color={c.textFaint} align="center" style={{ marginTop: 20 }}>
          PIN dan pengaturan tampilan tetap tersimpan di perangkat ini.
        </Txt>
      </Screen>

      <ConfirmSheet
        visible={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title="Pulihkan dari backup?"
        message="Seluruh transaksi, dompet, anggaran, dan tujuan saat ini akan diganti dengan isi file backup. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Pilih file backup"
        onConfirm={() => void runRestore()}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surfaceAlt,
        borderRadius: radius.sm,
        paddingVertical: 9,
        alignItems: 'center',
        gap: 1,
      }}>
      <Txt variant="amount" style={{ fontSize: 16 }}>
        {value}
      </Txt>
      <Txt variant="caption" color={c.textMuted} style={{ fontSize: 10 }}>
        {label}
      </Txt>
    </View>
  );
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = `${`${date.getHours()}`.padStart(2, '0')}.${`${date.getMinutes()}`.padStart(2, '0')}`;
  return `${formatDateID(toISODate(date))} · ${time}`;
}

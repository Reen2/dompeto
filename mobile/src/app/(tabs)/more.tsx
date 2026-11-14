import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Icon } from '@/components/icon';
import { Card, Divider, ListRow, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { useQuery } from '@/db';
import { listDebts, listGoals, listRecurring, listWallets, listWishlist } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

export default function MoreScreen() {
  const c = useTheme();
  const { settings } = useSettings();

  const wallets = useQuery(() => listWallets(), []);
  const goals = useQuery(() => listGoals(), []);
  const debts = useQuery(() => listDebts(), []);
  const recurring = useQuery(() => listRecurring(), []);
  const wishlist = useQuery(() => listWishlist(), []);

  const totalBalance = (wallets.data ?? [])
    .filter((wallet) => wallet.include_in_total === 1)
    .reduce((sum, wallet) => sum + wallet.balance, 0);
  const saved = (goals.data ?? []).reduce((sum, goal) => sum + goal.saved_amount, 0);
  const owed = (debts.data ?? [])
    .filter((debt) => debt.type === 'payable')
    .reduce((sum, debt) => sum + debt.remaining, 0);
  const receivable = (debts.data ?? [])
    .filter((debt) => debt.type === 'receivable')
    .reduce((sum, debt) => sum + debt.remaining, 0);

  return (
    <Screen bottomInset={100}>
      <Row between style={{ paddingTop: 6, paddingBottom: 16 }}>
        <Txt variant="h1">Lainnya</Txt>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: c.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt style={{ color: c.accent, fontWeight: '700', fontSize: 15 }}>
            {(settings.name || 'D').slice(0, 1).toUpperCase()}
          </Txt>
        </View>
      </Row>

      <Card>
        <Row gap={14}>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt variant="h3">{settings.name || 'Tanpa nama'}</Txt>
            <Txt variant="caption" color={c.textMuted}>
              {formatMoney(totalBalance, { masked: settings.hideBalances })} · {wallets.data?.length ?? 0} dompet
            </Txt>
          </View>
          <Row
            gap={6}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radius.pill,
              backgroundColor: c.surfaceAlt,
            }}>
            <Icon sf="leaf.fill" size={11} color={c.income} />
            <Txt variant="caption" color={c.textMuted} weight="600">
              Lokal
            </Txt>
          </Row>
        </Row>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <MiniStat label="Ditabung" value={formatMoney(saved, { compact: true })} color={c.income} />
        <MiniStat label="Utang" value={formatMoney(owed, { compact: true })} color={c.expense} />
        <MiniStat label="Piutang" value={formatMoney(receivable, { compact: true })} color={c.info} />
      </View>

      <SectionHeader title="Kelola" />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ListRow
          icon="wallet.pass.fill"
          iconColor={c.accent}
          title="Dompet"
          subtitle="Kas, bank, e-wallet, kartu kredit"
          value={`${wallets.data?.length ?? 0}`}
          onPress={() => router.push('/wallets')}
        />
        <Divider inset={48} />
        <ListRow
          icon="square.grid.2x2.fill"
          iconColor={c.info}
          title="Kategori"
          subtitle="Rapikan jenis pemasukan & pengeluaran"
          onPress={() => router.push('/categories')}
        />
        <Divider inset={48} />
        <ListRow
          icon="repeat"
          title="Transaksi berulang"
          subtitle="Langganan, gaji, tagihan rutin"
          value={`${recurring.data?.length ?? 0}`}
          onPress={() => router.push('/recurring')}
        />
        <Divider inset={48} />
        <ListRow
          icon="flag.fill"
          iconColor={c.income}
          title="Tujuan"
          subtitle="Dana darurat, liburan, barang impian"
          value={`${goals.data?.length ?? 0}`}
          onPress={() => router.push('/goals')}
        />
        <Divider inset={48} />
        <ListRow
          icon="person.2.fill"
          iconColor={c.expense}
          title="Utang & Piutang"
          subtitle="Catat yang dipinjam dan dipinjamkan"
          value={`${debts.data?.length ?? 0}`}
          onPress={() => router.push('/debts')}
        />
        <Divider inset={48} />
        <ListRow
          icon="sparkles"
          iconColor={c.accent}
          title="Daftar impian"
          subtitle="Tunda belanja impulsif, tinjau nanti"
          value={`${wishlist.data?.length ?? 0}`}
          onPress={() => router.push('/wishlist')}
        />
      </Card>

      <SectionHeader title="Aplikasi" />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ListRow
          icon="gearshape.fill"
          title="Pengaturan"
          subtitle="Tampilan, keamanan, mata uang"
          onPress={() => router.push('/settings')}
        />
        <Divider inset={48} />
        <ListRow
          icon="externaldrive.fill"
          title="Backup & data"
          subtitle="Ekspor, impor, CSV"
          onPress={() => router.push('/settings/backup')}
        />
      </Card>

      <Txt variant="caption" color={c.textFaint} align="center" style={{ marginTop: 24 }}>
        Dompet {Constants.expoConfig?.version ?? '1.0.0'}
      </Txt>
      <Txt variant="caption" color={c.textFaint} align="center" style={{ marginTop: 2 }}>
        Semua data tersimpan di perangkatmu.
      </Txt>
    </Screen>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        padding: 11,
        gap: 2,
      }}>
      <Txt variant="caption" color={c.textMuted} style={{ fontSize: 10 }}>
        {label}
      </Txt>
      <Txt style={{ color, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

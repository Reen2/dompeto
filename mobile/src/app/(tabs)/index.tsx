import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { GroupedBars } from '@/components/charts';
import { Icon } from '@/components/icon';
import { TransactionRow } from '@/components/transaction-row';
import {
  Card,
  Divider,
  FAB,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import {
  listBudgetsWithProgress,
  listTransactions,
  listWallets,
  monthlySeries,
  noSpendDays,
  periodSummary,
  upcomingBills,
} from '@/db/queries';
import type { TransactionRow as TxnRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { addDays, endOfMonth, startOfMonth, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

export default function HomeScreen() {
  const c = useTheme();
  const { settings, update } = useSettings();

  const today = todayISO();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const wallets = useQuery(() => listWallets(), []);
  const summary = useQuery(() => periodSummary(monthStart, monthEnd), [monthStart, monthEnd]);
  const recent = useQuery(() => listTransactions({ limit: 6 }), []);
  const budgets = useQuery(() => listBudgetsWithProgress(), []);
  const bills = useQuery(() => upcomingBills(10), []);
  const series = useQuery(() => monthlySeries(6), []);
  const noSpend = useQuery(() => noSpendDays(monthStart, today), [monthStart, today]);
  const last30 = useQuery(
    () => periodSummary(addDays(today, -29), today),
    [today],
  );

  const totalBalance = useMemo(
    () =>
      (wallets.data ?? [])
        .filter((wallet) => wallet.include_in_total === 1)
        .reduce((sum, wallet) => sum + wallet.balance, 0),
    [wallets.data],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const income = summary.data?.income ?? 0;
  const expense = summary.data?.expense ?? 0;
  const net = income - expense;
  const activeBudgets = (budgets.data ?? []).slice(0, 3);
  const nextBills = bills.data ?? [];
  const recentTxns: TxnRow[] = recent.data ?? [];
  const monthBars = (series.data ?? []).map((point) => ({
    label: point.month.slice(5),
    a: point.income,
    b: point.expense,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={120}>
        {/* header */}
        <Row between style={{ paddingTop: 6, paddingBottom: 16 }}>
          <View style={{ gap: 2 }}>
            <Txt variant="caption" color={c.textMuted}>
              {greeting}
              {settings.name ? ',' : ''}
            </Txt>
            <Txt variant="h1">{settings.name || 'Dompet'}</Txt>
          </View>
          <Row gap={4}>
            <IconButton
              sf={settings.hideBalances ? 'eye.slash' : 'eye'}
              accessibilityLabel="Sembunyikan saldo"
              color={c.textMuted}
              onPress={() => update({ hideBalances: !settings.hideBalances })}
            />
            <IconButton
              sf="gearshape"
              accessibilityLabel="Pengaturan"
              color={c.textMuted}
              onPress={() => router.push('/settings')}
            />
          </Row>
        </Row>

        {/* hero */}
        <Pressable onPress={() => router.push('/wallets')}>
          <LinearGradient
            colors={c.dark ? ['#211E1A', '#141312'] : ['#221F19', '#171614']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.xl, padding: 20, overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                right: -50,
                top: -60,
                width: 190,
                height: 190,
                borderRadius: 95,
                backgroundColor: '#D8B26A18',
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 10,
                bottom: -80,
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: '#D8B26A12',
              }}
            />
            <Row between>
              <Txt variant="caption" color="#C8B89A" style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Total kekayaan
              </Txt>
              <Icon sf="wallet.pass" size={16} color="#C8B89A" />
            </Row>
            <Txt
              style={{
                color: '#FBF6EC',
                fontSize: 34,
                fontWeight: '700',
                letterSpacing: -1.2,
                fontVariant: ['tabular-nums'],
                marginTop: 8,
              }}>
              {formatMoney(totalBalance, { masked: settings.hideBalances })}
            </Txt>
            <Txt variant="caption" color="#9C917F" style={{ marginTop: 2 }}>
              {wallets.data?.length ?? 0} dompet · {noSpend.data ?? 0} hari tanpa jajan bulan ini
            </Txt>

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#FFFFFF1A', marginVertical: 14 }} />

            <Row between>
              <View style={{ gap: 2 }}>
                <Txt variant="caption" color="#9C917F">
                  Masuk bulan ini
                </Txt>
                <Txt style={{ color: '#8FD6A8', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  +{formatMoney(income, { compact: true, masked: settings.hideBalances })}
                </Txt>
              </View>
              <View style={{ gap: 2, alignItems: 'center' }}>
                <Txt variant="caption" color="#9C917F">
                  Sisa
                </Txt>
                <Txt
                  style={{
                    color: net >= 0 ? '#F0DFC0' : '#E8A096',
                    fontSize: 15,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                  }}>
                  {formatMoney(net, { compact: true, masked: settings.hideBalances })}
                </Txt>
              </View>
              <View style={{ gap: 2, alignItems: 'flex-end' }}>
                <Txt variant="caption" color="#9C917F">
                  Keluar bulan ini
                </Txt>
                <Txt style={{ color: '#E8B4AC', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  −{formatMoney(expense, { compact: true, masked: settings.hideBalances })}
                </Txt>
              </View>
            </Row>
          </LinearGradient>
        </Pressable>

        {/* quick actions */}
        <Row between style={{ marginTop: 18 }}>
          {[
            { icon: 'arrow.up.right', label: 'Keluar', color: c.expense, onPress: () => router.push('/transaction/new?type=expense' as never) },
            { icon: 'arrow.down.left', label: 'Masuk', color: c.income, onPress: () => router.push('/transaction/new?type=income' as never) },
            { icon: 'arrow.left.arrow.right', label: 'Transfer', color: c.info, onPress: () => router.push('/transaction/new?type=transfer' as never) },
            { icon: 'sparkles', label: 'Impian', color: c.accent, onPress: () => router.push('/wishlist') },
          ].map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                Haptics.selectionAsync();
                action.onPress();
              }}
              style={{ alignItems: 'center', gap: 7, flex: 1 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                }}>
                <Icon sf={action.icon} size={19} color={action.color} />
              </View>
              <Txt variant="caption" color={c.textMuted}>
                {action.label}
              </Txt>
            </Pressable>
          ))}
        </Row>

        {/* budgets */}
        <SectionHeader
          title="Anggaran bulan ini"
          action={activeBudgets.length ? 'Atur' : undefined}
          onAction={() => router.push('/budgets')}
        />
        {activeBudgets.length === 0 ? (
          <Card>
            <Row gap={12}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: c.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon sf="chart.pie.fill" size={18} color={c.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="h3">Belum ada anggaran</Txt>
                <Txt variant="caption" color={c.textMuted}>
                  Tentukan batas belanja tiap kategori.
                </Txt>
              </View>
            </Row>
          </Card>
        ) : (
          <Card>
            {activeBudgets.map((budget, index) => {
              const ratio = budget.amount ? budget.spent / budget.amount : 0;
              const over = ratio > 1;
              return (
                <View key={budget.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={{ paddingVertical: 10, gap: 7 }}>
                    <Row between>
                      <Row gap={8}>
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 9,
                            backgroundColor: `${budget.category_color ?? c.accent}22`,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Icon sf={budget.category_icon ?? 'tag.fill'} size={12} color={budget.category_color ?? c.accent} />
                        </View>
                        <Txt variant="label" weight="500">
                          {budget.category_name ?? 'Semua kategori'}
                        </Txt>
                      </Row>
                      <Txt
                        variant="caption"
                        color={over ? c.expense : c.textMuted}
                        style={{ fontVariant: ['tabular-nums'] }}>
                        {formatMoney(budget.spent, { compact: true, masked: settings.hideBalances })} /{' '}
                        {formatMoney(budget.amount, { compact: true, masked: settings.hideBalances })}
                      </Txt>
                    </Row>
                    <ProgressBar
                      value={ratio}
                      height={6}
                      color={over ? c.expense : ratio > 0.85 ? c.warning : c.accent}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* bills */}
        {nextBills.length ? (
          <>
            <SectionHeader title="Tagihan mendatang" action="Semua" onAction={() => router.push('/recurring')} />
            <Card>
              {nextBills.slice(0, 3).map((bill, index) => (
                <View key={bill.id}>
                  {index > 0 ? <Divider /> : null}
                  <Row between style={{ paddingVertical: 10 }}>
                    <Row gap={10} style={{ flex: 1 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: `${bill.category_icon ? c.warning : c.accent}1C`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon sf={bill.category_icon ?? 'doc.text.fill'} size={14} color={c.warning} />
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Txt variant="label" weight="500" numberOfLines={1}>
                          {bill.name}
                        </Txt>
                        <Txt variant="caption" color={bill.next_run <= today ? c.expense : c.textMuted}>
                          {bill.next_run < today
                            ? `Terlambat ${bill.next_run.slice(8, 10)}/${bill.next_run.slice(5, 7)}`
                            : bill.next_run === today
                              ? 'Jatuh tempo hari ini'
                              : `Jatuh tempo ${bill.next_run.slice(8, 10)}/${bill.next_run.slice(5, 7)}`}
                        </Txt>
                      </View>
                    </Row>
                    <Txt variant="amount" style={{ fontSize: 14 }}>
                      {formatMoney(bill.amount, { masked: settings.hideBalances })}
                    </Txt>
                  </Row>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* 6 month trend */}
        <SectionHeader title="Enam bulan terakhir" action="Laporan" onAction={() => router.push('/reports')} />
        <Card>
          <Row between style={{ marginBottom: 14 }}>
            <Row gap={14}>
              <Row gap={5}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.income }} />
                <Txt variant="caption" color={c.textMuted}>
                  Masuk
                </Txt>
              </Row>
              <Row gap={5}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.expense }} />
                <Txt variant="caption" color={c.textMuted}>
                  Keluar
                </Txt>
              </Row>
            </Row>
            <Txt variant="caption" color={c.textFaint}>
              30 hari: {formatMoney(last30.data?.expense ?? 0, { compact: true, masked: settings.hideBalances })}
            </Txt>
          </Row>
          <GroupedBars data={monthBars} height={120} />
        </Card>

        {/* recent */}
        <SectionHeader title="Terakhir dicatat" action="Lihat semua" onAction={() => router.push('/transactions')} />
        {recentTxns.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
              <Txt variant="h3">Belum ada transaksi</Txt>
              <Txt variant="caption" color={c.textMuted} align="center">
                Ketuk tombol Catat untuk mulai.
              </Txt>
            </View>
          </Card>
        ) : (
          <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {recentTxns.map((txn, index) => (
              <View key={txn.id}>
                {index > 0 ? <Divider inset={52} /> : null}
                <TransactionRow
                  transaction={txn}
                  onPress={() => router.push(`/transaction/${txn.id}` as never)}
                />
              </View>
            ))}
          </Card>
        )}

        {settings.name ? (
          <Txt variant="caption" color={c.textFaint} align="center" style={{ marginTop: 26 }}>
            Dompet · dibuat dengan tenang
          </Txt>
        ) : null}
      </Screen>

      <FAB onPress={() => router.push('/transaction/new')} />
    </View>
  );
}

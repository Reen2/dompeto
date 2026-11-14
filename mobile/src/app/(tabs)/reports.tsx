import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Donut, GroupedBars, LineChart } from '@/components/charts';
import { Icon } from '@/components/icon';
import {
  Card,
  Divider,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import {
  categoryBreakdown,
  dailyTotals,
  monthlySeries,
  netWorthSeries,
  noSpendDays,
  periodSummary,
  topExpenses,
} from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  daysInMonth,
  eachDay,
  endOfMonth,
  formatMonthYear,
  monthShort,
  startOfMonth,
  todayISO,
} from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

export default function ReportsScreen() {
  const c = useTheme();
  const { settings } = useSettings();
  const [month, setMonth] = useState(startOfMonth(todayISO()));

  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const today = todayISO();
  const isCurrentMonth = from === startOfMonth(today);

  const summary = useQuery(() => periodSummary(from, to), [from, to]);
  const slices = useQuery(() => categoryBreakdown(from, to, 'expense'), [from, to]);
  const daily = useQuery(() => dailyTotals(from, to), [from, to]);
  const series = useQuery(() => monthlySeries(6), []);
  const top = useQuery(() => topExpenses(from, to, 4), [from, to]);
  const noSpend = useQuery(() => noSpendDays(from, to), [from, to]);
  const netWorth = useQuery(() => netWorthSeries(6), []);

  const expenseSlices = slices.data ?? [];
  const totalExpense = expenseSlices.reduce((sum, item) => sum + item.total, 0);

  const cumulative = useMemo(() => {
    const map = new Map((daily.data ?? []).map((row) => [row.date, row]));
    const days = eachDay(from, isCurrentMonth ? today : to);
    return days.reduce<{ running: number; points: number[] }>(
      (acc, date) => {
        const row = map.get(date);
        const running = acc.running + (row?.income ?? 0) - (row?.expense ?? 0);
        return { running, points: [...acc.points, running] };
      },
      { running: 0, points: [] },
    ).points;
  }, [daily.data, from, to, today, isCurrentMonth]);

  const activeDays = isCurrentMonth
    ? Math.max(1, eachDay(from, today).length)
    : daysInMonth(from);
  const avgPerDay = Math.round((summary.data?.expense ?? 0) / activeDays);

  const monthBars = (series.data ?? []).map((point) => ({
    label: point.month.slice(5),
    a: point.income,
    b: point.expense,
  }));

  const savingsRate =
    summary.data && summary.data.income > 0
      ? Math.round((summary.data.net / summary.data.income) * 100)
      : 0;

  const worth = netWorth.data ?? [];
  const worthNow = worth.length ? worth[worth.length - 1].value : 0;
  const worthStart = worth.length ? worth[0].value : 0;
  const worthDelta = worthNow - worthStart;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Row between style={{ paddingTop: 6, paddingBottom: 14 }}>
          <View style={{ gap: 2 }}>
            <Txt variant="h1">Laporan</Txt>
            <Txt variant="caption" color={c.textMuted}>
              Ke mana uangmu pergi
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/settings/backup')}
            hitSlop={10}
            accessibilityLabel="Ekspor data">
            <Icon sf="square.and.arrow.up" size={19} color={c.textMuted} />
          </Pressable>
        </Row>

        <Row between style={{ marginBottom: 14 }}>
          <Pressable
            onPress={() => setMonth((prev) => addMonths(prev, -1))}
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon sf="chevron.left" size={14} color={c.textMuted} />
          </Pressable>
          <Txt variant="h3">{formatMonthYear(month)}</Txt>
          <Pressable
            onPress={() => setMonth((prev) => addMonths(prev, 1))}
            disabled={isCurrentMonth}
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isCurrentMonth ? 0.4 : 1,
            }}>
            <Icon sf="chevron.right" size={14} color={c.textMuted} />
          </Pressable>
        </Row>

        <Row gap={8}>
          {[
            { label: 'Masuk', value: summary.data?.income ?? 0, color: c.income },
            { label: 'Keluar', value: summary.data?.expense ?? 0, color: c.expense },
            { label: 'Sisa', value: summary.data?.net ?? 0, color: c.accent },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                backgroundColor: c.surface,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
                padding: 12,
                gap: 3,
              }}>
              <Txt variant="caption" color={c.textMuted}>
                {item.label}
              </Txt>
              <Txt
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: item.color,
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}>
                {formatMoney(item.value, { compact: true, masked: settings.hideBalances })}
              </Txt>
            </View>
          ))}
        </Row>

        {/* cashflow */}
        <Card style={{ marginTop: 14 }}>
          <Row between style={{ marginBottom: 4 }}>
            <View style={{ gap: 2 }}>
              <Txt variant="caption" color={c.textMuted}>
                Arus kas kumulatif
              </Txt>
              <Txt variant="h3" color={(summary.data?.net ?? 0) >= 0 ? c.income : c.expense}>
                {formatMoney(summary.data?.net ?? 0, { sign: true, masked: settings.hideBalances })}
              </Txt>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.pill,
                backgroundColor: savingsRate >= 0 ? `${c.income}1C` : `${c.expense}1C`,
              }}>
              <Txt variant="caption" color={savingsRate >= 0 ? c.income : c.expense} weight="600">
                {savingsRate >= 0 ? '+' : ''}
                {savingsRate}% tabungan
              </Txt>
            </View>
          </Row>
          {cumulative.length > 1 ? (
            <LineChart values={cumulative} height={120} color={(summary.data?.net ?? 0) >= 0 ? c.accent : c.expense} />
          ) : (
            <Txt variant="caption" color={c.textFaint} style={{ paddingVertical: 30 }} align="center">
              Belum cukup data untuk grafik.
            </Txt>
          )}
        </Card>

        {/* donut */}
        <SectionHeader title="Pengeluaran per kategori" />
        {expenseSlices.length === 0 ? (
          <Card>
            <EmptyState icon="chart.pie" title="Belum ada pengeluaran" description="Catat pengeluaran untuk melihat rinciannya." />
          </Card>
        ) : (
          <Card>
            <Row gap={16}>
              <Donut
                slices={expenseSlices.slice(0, 7).map((slice) => ({ value: slice.total, color: slice.color }))}
                size={132}
                thickness={15}
                centerLabel="total"
                centerValue={formatMoney(totalExpense, { compact: true, masked: settings.hideBalances })}
              />
              <View style={{ flex: 1, gap: 7 }}>
                {expenseSlices.slice(0, 5).map((slice) => {
                  const pct = totalExpense ? Math.round((slice.total / totalExpense) * 100) : 0;
                  return (
                    <View key={slice.category_id ?? slice.name} style={{ gap: 2 }}>
                      <Row between>
                        <Txt variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                          {slice.name}
                        </Txt>
                        <Txt variant="caption" color={c.textMuted}>
                          {pct}%
                        </Txt>
                      </Row>
                      <View style={{ height: 3, borderRadius: 2, backgroundColor: c.surfaceAlt }}>
                        <View
                          style={{
                            height: 3,
                            width: `${pct}%`,
                            borderRadius: 2,
                            backgroundColor: slice.color,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Row>

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 14 }} />

            <View style={{ gap: 10 }}>
              {expenseSlices.slice(5).map((slice) => {
                const pct = totalExpense ? Math.round((slice.total / totalExpense) * 100) : 0;
                return (
                  <Row key={slice.category_id ?? slice.name} between>
                    <Row gap={8}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: slice.color }} />
                      <Txt variant="caption" color={c.textMuted}>
                        {slice.name}
                      </Txt>
                    </Row>
                    <Txt variant="caption" color={c.textMuted} style={{ fontVariant: ['tabular-nums'] }}>
                      {formatMoney(slice.total, { compact: true, masked: settings.hideBalances })} · {pct}%
                    </Txt>
                  </Row>
                );
              })}
            </View>
          </Card>
        )}

        {/* stats */}
        <SectionHeader title="Kebiasaan bulan ini" />
        <Card>
          <Row between>
            <Stat label="Rata-rata/hari" value={formatMoney(avgPerDay, { compact: true })} icon="calendar" />
            <Divider vertical />
            <Stat label="Hari tanpa jajan" value={`${noSpend.data ?? 0} hari`} icon="leaf.fill" />
            <Divider vertical />
            <Stat
              label="Transaksi"
              value={`${summary.data?.count ?? 0}`}
              icon="list.bullet"
            />
          </Row>
        </Card>

        {/* top expenses */}
        {top.data?.length ? (
          <>
            <SectionHeader title="Pengeluaran terbesar" />
            <Card>
              {top.data.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider inset={0} /> : null}
                  <Row between style={{ paddingVertical: 10 }}>
                    <Row gap={10} style={{ flex: 1 }}>
                      <Txt variant="caption" color={c.textFaint} style={{ width: 14 }}>
                        {index + 1}
                      </Txt>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Txt variant="label" weight="500" numberOfLines={1}>
                          {item.payee || item.note || item.category_name || 'Pengeluaran'}
                        </Txt>
                        <Txt variant="caption" color={c.textMuted}>
                          {item.category_name ?? 'Tanpa kategori'} · {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                        </Txt>
                      </View>
                    </Row>
                    <Txt variant="amount" color={c.expense} style={{ fontSize: 14 }}>
                      {formatMoney(item.amount, { masked: settings.hideBalances })}
                    </Txt>
                  </Row>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* 6 months */}
        <SectionHeader title="Enam bulan terakhir" />
        <Card>
          <GroupedBars data={monthBars} height={130} />
        </Card>

        {/* net worth */}
        <SectionHeader title="Kekayaan bersih" />
        <Card>
          <Row between style={{ marginBottom: 10 }}>
            <View style={{ gap: 2 }}>
              <Txt variant="caption" color={c.textMuted}>
                Saldo dompet dikurangi utang
              </Txt>
              <Txt variant="h3">
                {formatMoney(worthNow, { masked: settings.hideBalances })}
              </Txt>
            </View>
            {worth.length > 1 ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                  backgroundColor: worthDelta >= 0 ? `${c.income}1C` : `${c.expense}1C`,
                }}>
                <Txt variant="caption" weight="600" color={worthDelta >= 0 ? c.income : c.expense}>
                  {worthDelta >= 0 ? '+' : ''}
                  {formatMoney(worthDelta, { compact: true, masked: settings.hideBalances })}
                </Txt>
              </View>
            ) : null}
          </Row>
          {worth.length > 1 ? (
            <LineChart
              values={worth.map((point) => point.value)}
              labels={worth.map((point) => monthShort(point.month))}
              height={110}
              color={worthDelta >= 0 ? c.accent : c.expense}
            />
          ) : (
            <Txt variant="caption" color={c.textFaint}>
              Grafik muncul setelah ada beberapa bulan data.
            </Txt>
          )}
        </Card>
      </Screen>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Icon sf={icon} size={15} color={c.textMuted} />
      <Txt variant="amount" style={{ fontSize: 15 }}>
        {value}
      </Txt>
      <Txt variant="caption" color={c.textFaint} align="center" style={{ fontSize: 10 }}>
        {label}
      </Txt>
    </View>
  );
}

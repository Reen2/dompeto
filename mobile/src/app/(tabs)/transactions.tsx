import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Icon } from '@/components/icon';
import { TransactionRow } from '@/components/transaction-row';
import {
  Card,
  Chip,
  FAB,
  EmptyState,
  Row,
  Screen,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import { listTransactions, periodSummary } from '@/db/queries';
import type { TransactionRow as TxnRow, TxnType } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  endOfMonth,
  formatMonthYear,
  relativeDateLabel,
  startOfMonth,
  todayISO,
} from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

const FILTERS: { value: 'all' | TxnType; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Keluar' },
  { value: 'income', label: 'Masuk' },
  { value: 'transfer', label: 'Transfer' },
];

export default function TransactionsScreen() {
  const c = useTheme();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | TxnType>('all');
  const [month, setMonth] = useState(startOfMonth(todayISO()));

  const from = startOfMonth(month);
  const to = endOfMonth(month);

  const rows = useQuery(
    () =>
      listTransactions({
        from,
        to,
        type: filter === 'all' ? undefined : filter,
        search: search || undefined,
        limit: 400,
      }),
    [from, to, filter, search],
  );
  const summary = useQuery(() => periodSummary(from, to), [from, to]);

  const groups = useMemo(() => {
    const list = rows.data ?? [];
    const map = new Map<string, TxnRow[]>();
    for (const row of list) {
      const bucket = map.get(row.date);
      if (bucket) bucket.push(row);
      else map.set(row.date, [row]);
    }
    return [...map.entries()].map(([date, items]) => ({
      date,
      items,
      total: items.reduce((sum, item) => {
        if (item.type === 'income') return sum + item.amount;
        if (item.type === 'expense') return sum - (item.amount + item.fee);
        return sum;
      }, 0),
    }));
  }, [rows.data]);

  const isCurrentMonth = startOfMonth(todayISO()) === month;
  const income = summary.data?.income ?? 0;
  const expense = summary.data?.expense ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={110}>
        <Row between style={{ paddingTop: 6, paddingBottom: 12 }}>
          <Txt variant="h1">Transaksi</Txt>
          <Pressable
            onPress={() => router.push('/settings/backup')}
            hitSlop={10}
            accessibilityLabel="Backup data">
            <Icon sf="ellipsis.circle" size={22} color={c.textMuted} />
          </Pressable>
        </Row>

        {/* search */}
        <Row
          gap={8}
          style={{
            backgroundColor: c.surface,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            paddingHorizontal: 12,
            height: 44,
          }}>
          <Icon sf="magnifyingglass" size={16} color={c.textFaint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari catatan, merchant, tag…"
            placeholderTextColor={c.textFaint}
            style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 0 }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon sf="xmark.circle.fill" size={16} color={c.textFaint} />
            </Pressable>
          ) : null}
        </Row>

        {/* month switcher + totals */}
        <Card style={{ marginTop: 12 }}>
          <Row between>
            <Pressable
              onPress={() => setMonth((prev) => addMonths(prev, -1))}
              hitSlop={12}
              accessibilityLabel="Bulan sebelumnya">
              <Icon sf="chevron.left" size={16} color={c.textMuted} />
            </Pressable>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Txt variant="h3">{formatMonthYear(month)}</Txt>
              <Txt variant="caption" color={c.textFaint}>
                {summary.data?.count ?? 0} transaksi
              </Txt>
            </View>
            <Pressable
              onPress={() => setMonth((prev) => addMonths(prev, 1))}
              disabled={isCurrentMonth}
              hitSlop={12}
              accessibilityLabel="Bulan berikutnya">
              <Icon sf="chevron.right" size={16} color={isCurrentMonth ? c.border : c.textMuted} />
            </Pressable>
          </Row>
          <Row between style={{ marginTop: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="caption" color={c.textMuted}>
                Masuk
              </Txt>
              <Txt variant="amount" color={c.income} style={{ fontSize: 16 }}>
                {formatMoney(income, { masked: settings.hideBalances })}
              </Txt>
            </View>
            <View style={{ width: StyleSheet.hairlineWidth, height: 30, backgroundColor: c.border }} />
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
              <Txt variant="caption" color={c.textMuted}>
                Keluar
              </Txt>
              <Txt variant="amount" color={c.expense} style={{ fontSize: 16 }}>
                {formatMoney(expense, { masked: settings.hideBalances })}
              </Txt>
            </View>
          </Row>
        </Card>

        {/* filters */}
        <Row gap={8} style={{ marginTop: 14 }}>
          {FILTERS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </Row>

        {/* list */}
        {rows.loading && !rows.data ? (
          <View style={{ paddingVertical: 40 }}>
            <Txt variant="caption" color={c.textFaint} align="center">
              Memuat…
            </Txt>
          </View>
        ) : groups.length === 0 ? (
          <EmptyState
            icon="magnifyingglass"
            title="Tidak ada transaksi"
            description={
              search
                ? 'Coba kata kunci lain atau ganti filter.'
                : 'Belum ada catatan di bulan ini. Mulai dari tombol Catat.'
            }
            actionLabel="Catat sekarang"
            onAction={() => router.push('/transaction/new')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.date} style={{ marginTop: 18 }}>
              <Row between style={{ marginBottom: 6, paddingHorizontal: 2 }}>
                <Txt variant="caption" color={c.textMuted} weight="600">
                  {relativeDateLabel(group.date)}
                </Txt>
                <Txt variant="caption" color={group.total >= 0 ? c.textFaint : c.textFaint}>
                  {group.total !== 0
                    ? formatMoney(group.total, { compact: true, sign: group.total > 0 })
                    : ''}
                </Txt>
              </Row>
              <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
                {group.items.map((txn, index) => (
                  <View key={txn.id}>
                    {index > 0 ? (
                      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 52 }} />
                    ) : null}
                    <TransactionRow
                      transaction={txn}
                      showWallet
                      onPress={() => router.push(`/transaction/${txn.id}` as never)}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </Screen>

      <FAB onPress={() => router.push('/transaction/new')} />
    </View>
  );
}

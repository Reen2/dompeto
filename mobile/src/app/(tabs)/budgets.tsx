import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { ConfirmSheet, PickerSheet, Sheet } from '@/components/sheet';
import {
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import {
  deleteBudget,
  listBudgetsWithProgress,
  listCategories,
  saveBudget,
} from '@/db/queries';
import type { BudgetPeriod, BudgetProgress } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, formatMonthYear, todayISO } from '@/lib/dates';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

export default function BudgetsScreen() {
  const c = useTheme();
  const { settings } = useSettings();
  const [editing, setEditing] = useState<BudgetProgress | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const budgets = useQuery(() => listBudgetsWithProgress(), []);

  const totalBudget = (budgets.data ?? []).reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = (budgets.data ?? []).reduce((sum, item) => sum + item.spent, 0);
  const overall = totalBudget ? Math.min(1, totalSpent / totalBudget) : 0;

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Row between style={{ paddingTop: 6, paddingBottom: 14 }}>
          <View style={{ gap: 2 }}>
            <Txt variant="h1">Anggaran</Txt>
            <Txt variant="caption" color={c.textMuted}>
              {formatMonthYear(todayISO())}
            </Txt>
          </View>
          <Pressable
            onPress={openNew}
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.accentSoft,
            }}
            accessibilityLabel="Tambah anggaran">
            <Icon sf="plus" size={17} color={c.accent} weight="semibold" />
          </Pressable>
        </Row>

        <Card>
          <Row between style={{ marginBottom: 12 }}>
            <View style={{ gap: 3 }}>
              <Txt variant="caption" color={c.textMuted}>
                Terpakai
              </Txt>
              <Txt variant="amountLarge" style={{ fontSize: 28 }}>
                {formatMoney(totalSpent, { masked: settings.hideBalances })}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Txt variant="caption" color={c.textMuted}>
                Dari anggaran
              </Txt>
              <Txt variant="amount" color={c.textMuted}>
                {formatMoney(totalBudget, { masked: settings.hideBalances })}
              </Txt>
            </View>
          </Row>
          <ProgressBar
            value={overall}
            height={9}
            color={overall > 1 ? c.expense : overall > 0.85 ? c.warning : c.accent}
          />
          <Row between style={{ marginTop: 10 }}>
            <Txt variant="caption" color={c.textFaint}>
              {Math.round(overall * 100)}% terpakai
            </Txt>
            <Txt variant="caption" color={overall > 1 ? c.expense : c.textMuted}>
              {overall > 1
                ? `Lewat ${formatMoney(totalSpent - totalBudget, { compact: true })}`
                : `Sisa ${formatMoney(totalBudget - totalSpent, { compact: true })}`}
            </Txt>
          </Row>
        </Card>

        <SectionHeader title={`${budgets.data?.length ?? 0} anggaran aktif`} />

        {budgets.data?.length === 0 ? (
          <EmptyState
            icon="chart.pie"
            title="Belum ada anggaran"
            description="Anggaran membantumu sadar batas belanja — sebelum uangnya habis."
            actionLabel="Buat anggaran"
            onAction={openNew}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {(budgets.data ?? []).map((budget) => {
              const ratio = budget.amount ? budget.spent / budget.amount : 0;
              const over = ratio > 1;
              const daysLeft = Math.max(1, daysBetween(todayISO(), budget.period_end) + 1);
              const perDay = Math.max(0, budget.amount - budget.spent) / daysLeft;
              return (
                <Card key={budget.id} onPress={() => { setEditing(budget); setSheetOpen(true); }}>
                  <Row between style={{ marginBottom: 10 }}>
                    <Row gap={10}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: `${budget.category_color ?? c.accent}1F`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon
                          sf={budget.category_icon ?? 'chart.pie.fill'}
                          size={16}
                          color={budget.category_color ?? c.accent}
                        />
                      </View>
                      <View style={{ gap: 1 }}>
                        <Txt variant="h3">{budget.category_name ?? 'Semua kategori'}</Txt>
                        <Txt variant="caption" color={c.textMuted}>
                          {PERIODS.find((item) => item.value === budget.period)?.label}
                          {budget.rollover === 1 ? ' · rollover' : ''}
                        </Txt>
                      </View>
                    </Row>
                    {over ? <Txt variant="caption" color={c.expense} weight="600">Lewat</Txt> : null}
                  </Row>

                  <Row between style={{ marginBottom: 6 }}>
                    <Txt variant="amount" style={{ fontSize: 15 }}>
                      {formatMoney(budget.spent, { masked: settings.hideBalances })}
                    </Txt>
                    <Txt variant="caption" color={c.textMuted}>
                      {formatMoney(budget.amount, { masked: settings.hideBalances })}
                    </Txt>
                  </Row>
                  <ProgressBar value={ratio} color={over ? c.expense : ratio > 0.85 ? c.warning : c.accent} />
                  <Row between style={{ marginTop: 8 }}>
                    <Txt variant="caption" color={c.textFaint}>
                      {Math.round(ratio * 100)}% terpakai
                    </Txt>
                    <Txt variant="caption" color={over ? c.expense : c.textMuted}>
                      {over
                        ? `Lewat ${formatMoney(budget.spent - budget.amount, { compact: true })}`
                        : `${formatMoney(perDay, { compact: true })}/hari · ${daysLeft} hari lagi`}
                    </Txt>
                  </Row>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>

      <BudgetSheet
        key={`${editing?.id ?? 'new'}-${sheetOpen}`}
        visible={sheetOpen}
        budget={editing}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function BudgetSheet({
  visible,
  budget,
  onClose,
}: {
  visible: boolean;
  budget: BudgetProgress | null;
  onClose: () => void;
}) {
  const c = useTheme();
  const categories = useQuery(() => listCategories('expense'), []);
  const [categoryId, setCategoryId] = useState<string | null>(budget?.category_id ?? null);
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '');
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? 'monthly');
  const [rollover, setRollover] = useState(budget?.rollover === 1);
  const [alertPct, setAlertPct] = useState(budget?.alert_pct ?? 80);
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // The parent re-mounts this sheet via `key`, so initial state is enough.
  const categoryList = categories.data ?? [];
  const selected = categoryList.find((item) => item.id === categoryId) ?? null;
  const value = parseAmountInput(amount);

  async function submit() {
    if (value <= 0) return;
    await saveBudget({
      id: budget?.id,
      category_id: categoryId,
      amount: value,
      period,
      rollover,
      alert_pct: alertPct,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={budget ? 'Ubah anggaran' : 'Anggaran baru'}
        subtitle="Batasi pengeluaran per kategori"
        footer={
          <View style={{ gap: 8 }}>
            <Button label={budget ? 'Simpan perubahan' : 'Buat anggaran'} size="lg" disabled={value <= 0} onPress={submit} />
            {budget ? (
              <Button label="Hapus anggaran" variant="ghost" onPress={() => setConfirm(true)} />
            ) : null}
          </View>
        }>
        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Kategori
          </Txt>
          <Pressable
            onPress={() => setPicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: c.surfaceAlt,
            }}>
            <Icon
              sf={selected?.icon ?? 'square.grid.2x2.fill'}
              size={16}
              color={selected?.color ?? c.textMuted}
            />
            <Txt variant="body" style={{ flex: 1 }}>
              {selected?.name ?? 'Semua pengeluaran'}
            </Txt>
            <Icon sf="chevron.down" size={12} color={c.textFaint} />
          </Pressable>
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Batas anggaran
          </Txt>
          <Row
            gap={4}
            style={{
              backgroundColor: c.surfaceAlt,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}>
            <Txt variant="body" color={c.textMuted} style={{ fontSize: 18, fontWeight: '600' }}>
              Rp
            </Txt>
            <TextInput
              value={amount ? formatAmount(value) : ''}
              onChangeText={(text) => setAmount(text.replace(/[^\d]/g, '').slice(0, 12))}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor={c.textFaint}
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: '700',
                letterSpacing: -0.5,
                color: c.text,
                fontVariant: ['tabular-nums'],
                padding: 0,
              }}
            />
          </Row>
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Periode
          </Txt>
          <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        </View>

        <Row between style={{ paddingVertical: 4 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body">Bawa sisa ke periode berikutnya</Txt>
            <Txt variant="caption" color={c.textMuted}>
              Sisa anggaran bulan ini menambah batas bulan depan.
            </Txt>
          </View>
          <Switch
            value={rollover}
            onValueChange={setRollover}
            trackColor={{ true: c.accent, false: c.borderStrong }}
          />
        </Row>

        <View>
          <Row between style={{ marginBottom: 6 }}>
            <Txt variant="caption" color={c.textMuted}>
              Ingatkan saat terpakai
            </Txt>
            <Txt variant="caption" color={c.accent} weight="600">
              {alertPct}%
            </Txt>
          </Row>
          <Row gap={8}>
            {[50, 70, 80, 90, 100].map((pct) => (
              <Pressable
                key={pct}
                onPress={() => setAlertPct(pct)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  backgroundColor: alertPct === pct ? c.accent : c.surfaceAlt,
                }}>
                <Txt variant="caption" color={alertPct === pct ? c.onAccent : c.textMuted} weight="600">
                  {pct}%
                </Txt>
              </Pressable>
            ))}
          </Row>
        </View>
      </Sheet>

      <PickerSheet
        visible={picker}
        onClose={() => setPicker(false)}
        title="Kategori anggaran"
        options={[
          { value: '', label: 'Semua pengeluaran', icon: 'square.grid.2x2.fill' },
          ...categoryList.map((item) => ({
            value: item.id,
            label: item.name,
            icon: item.icon,
            color: item.color,
          })),
        ]}
        value={categoryId ?? ''}
        onSelect={(next) => {
          setCategoryId(next || null);
          setPicker(false);
        }}
      />

      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        title="Hapus anggaran?"
        message="Riwayat transaksi tetap aman. Hanya batas anggarannya yang dihapus."
        onConfirm={() => {
          if (budget) {
            void deleteBudget(budget.id).then(() => onClose());
          }
        }}
      />
    </>
  );
}

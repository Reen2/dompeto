import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { ConfirmSheet, DateSheet, PickerSheet, Sheet } from '@/components/sheet';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import {
  deleteRecurring,
  listCategories,
  listRecurring,
  listWallets,
  payBill,
  saveRecurring,
} from '@/db/queries';
import type { Freq, RecurringRule, TxnType } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatDateID, relativeDateLabel, todayISO } from '@/lib/dates';
import { syncBillReminders } from '@/lib/notifications';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { radius } from '@/lib/theme';

const FREQS: { value: Freq; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

type RuleRow = RecurringRule & {
  category_name: string | null;
  wallet_name: string;
  category_icon: string | null;
};

export default function RecurringScreen() {
  const c = useTheme();
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rules = useQuery(() => listRecurring(true), []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
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
              <Icon sf="repeat" size={18} color={c.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3">Otomatis & teratur</Txt>
              <Txt variant="caption" color={c.textMuted}>
                Gaji, langganan, dan tagihan bulanan tercatat sendiri.
              </Txt>
            </View>
          </Row>
        </Card>

        <SectionHeader title={`${rules.data?.length ?? 0} aturan`} />

        {rules.data?.length === 0 ? (
          <EmptyState
            icon="repeat"
            title="Belum ada transaksi berulang"
            description="Tambahkan gaji bulanan atau langganan supaya tidak perlu mencatat manual."
            actionLabel="Tambah aturan"
            onAction={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {(rules.data ?? []).map((rule) => {
              const overdue = rule.next_run <= todayISO();
              return (
                <Card
                  key={rule.id}
                  onPress={() => {
                    setEditing(rule);
                    setSheetOpen(true);
                  }}>
                  <Row between>
                    <Row gap={11} style={{ flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: `${rule.type === 'income' ? c.income : c.expense}1A`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon
                          sf={rule.category_icon ?? (rule.type === 'income' ? 'arrow.down.left' : 'arrow.up.right')}
                          size={16}
                          color={rule.type === 'income' ? c.income : c.expense}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Row gap={6}>
                          <Txt variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {rule.name}
                          </Txt>
                          {rule.auto_post === 1 ? <Badge label="Auto" color={c.info} /> : null}
                          {rule.is_bill === 1 ? <Badge label="Tagihan" color={c.warning} /> : null}
                        </Row>
                        <Txt variant="caption" color={c.textMuted}>
                          {rule.wallet_name} · {FREQS.find((item) => item.value === rule.freq)?.label}
                          {rule.interval_n > 1 ? ` tiap ${rule.interval_n}` : ''} ·{' '}
                          {rule.next_run <= todayISO() ? 'jatuh tempo' : relativeDateLabel(rule.next_run).toLowerCase()}
                        </Txt>
                      </View>
                    </Row>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Txt variant="amount" style={{ fontSize: 15 }}>
                        {formatMoney(rule.amount, { compact: true })}
                      </Txt>
                      {rule.auto_post === 0 ? (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            void payBill(rule.id);
                          }}
                          hitSlop={6}>
                          <Txt variant="caption" color={c.accent} weight="600">
                            {rule.is_bill === 1 ? 'Catat bayar' : 'Catat'}
                          </Txt>
                        </Pressable>
                      ) : null}
                    </View>
                  </Row>
                  {overdue && rule.auto_post === 0 ? (
                    <Txt variant="caption" color={c.warning} style={{ marginTop: 8 }}>
                      Menunggu dicatat · {formatDateID(rule.next_run)}
                    </Txt>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}

        <Button
          label="Tambah aturan"
          variant="secondary"
          icon="plus"
          style={{ marginTop: 16 }}
          onPress={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        />
      </Screen>

      <RuleSheet
        key={`${editing?.id ?? 'new'}-${sheetOpen}`}
        visible={sheetOpen}
        rule={editing}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function RuleSheet({
  visible,
  rule,
  onClose,
}: {
  visible: boolean;
  rule: RuleRow | null;
  onClose: () => void;
}) {
  const c = useTheme();
  const wallets = useQuery(() => listWallets(), []);
  const [type, setType] = useState<TxnType>(rule?.type ?? 'expense');
  const [name, setName] = useState(rule?.name ?? '');
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '');
  const [walletChoice, setWalletId] = useState<string | null>(rule?.wallet_id ?? null);
  const [toWalletId, setToWalletId] = useState<string | null>(rule?.to_wallet_id ?? null);
  const [categoryChoice, setCategoryId] = useState<string | null>(rule?.category_id ?? null);
  const [freq, setFreq] = useState<Freq>(rule?.freq ?? 'monthly');
  const [interval, setIntervalN] = useState(String(rule?.interval_n ?? 1));
  const [startDate, setStartDate] = useState(rule?.start_date ?? todayISO());
  const [autoPost, setAutoPost] = useState(rule ? rule.auto_post === 1 : true);
  const [isBill, setIsBill] = useState(rule?.is_bill === 1);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [walletPicker, setWalletPicker] = useState(false);
  const [toWalletPicker, setToWalletPicker] = useState(false);
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [datePicker, setDatePicker] = useState(false);
  const [freqPicker, setFreqPicker] = useState(false);

  const categories = useQuery(
    () => listCategories(type === 'income' ? 'income' : 'expense'),
    [type],
  );
  const walletList = wallets.data ?? [];
  const categoryList = categories.data ?? [];

  // Defaults are derived, not stored, so there is no effect-driven state sync.
  const walletId = walletChoice ?? walletList[0]?.id ?? null;
  const categoryId = type === 'transfer' ? null : categoryChoice;

  const value = parseAmountInput(amount);
  const wallet = walletList.find((item) => item.id === walletId);
  const category = categoryList.find((item) => item.id === categoryId);
  const toWallet = walletList.find((item) => item.id === toWalletId);

  async function submit() {
    if (!name.trim() || value <= 0 || !walletId) {
      setError('Lengkapi nama, jumlah, dan dompet.');
      return;
    }
    if (type === 'transfer' && (!toWalletId || toWalletId === walletId)) {
      setError('Pilih dompet tujuan yang berbeda.');
      return;
    }
    await saveRecurring({
      id: rule?.id,
      name: name.trim(),
      type,
      wallet_id: walletId,
      to_wallet_id: type === 'transfer' ? toWalletId : null,
      category_id: type === 'transfer' ? null : categoryId,
      amount: value,
      freq,
      interval_n: Math.max(1, Number.parseInt(interval, 10) || 1),
      start_date: startDate,
      auto_post: autoPost,
      is_bill: isBill,
    });
    const refreshed = await listRecurring(true);
    void syncBillReminders(refreshed);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={rule ? 'Ubah aturan' : 'Aturan baru'}
        subtitle="Transaksi yang terjadi berulang"
        footer={
          <View style={{ gap: 8 }}>
            <Button label={rule ? 'Simpan' : 'Tambah aturan'} size="lg" onPress={submit} />
            {rule ? (
              <Button label="Hapus aturan" variant="danger" onPress={() => setConfirmDelete(true)} />
            ) : null}
          </View>
        }>
        <Segmented
          options={[
            { value: 'expense', label: 'Keluar' },
            { value: 'income', label: 'Masuk' },
            { value: 'transfer', label: 'Transfer' },
          ]}
          value={type}
          onChange={(next) => setType(next as TxnType)}
        />

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nama, mis. Netflix atau Gaji"
          placeholderTextColor={c.textFaint}
          style={{
            backgroundColor: c.surfaceAlt,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 16,
            color: c.text,
          }}
        />

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
              color: c.text,
              fontVariant: ['tabular-nums'],
              padding: 0,
            }}
          />
        </Row>

        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
              Dompet
            </Txt>
            <Pressable
              onPress={() => setWalletPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 13,
                borderRadius: radius.md,
                backgroundColor: c.surfaceAlt,
              }}>
              <Icon sf={wallet?.icon ?? 'wallet.pass.fill'} size={14} color={c.textMuted} />
              <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>
                {wallet?.name ?? 'Pilih'}
              </Txt>
              <Icon sf="chevron.down" size={10} color={c.textFaint} />
            </Pressable>
          </View>

          {type !== 'transfer' ? (
            <View style={{ flex: 1 }}>
              <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
                Kategori
              </Txt>
              <Pressable
                onPress={() => setCategoryPicker(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 13,
                  borderRadius: radius.md,
                  backgroundColor: c.surfaceAlt,
                }}>
                <Icon sf={category?.icon ?? 'tag.fill'} size={14} color={category?.color ?? c.textMuted} />
                <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>
                  {category?.name ?? 'Pilih'}
                </Txt>
                <Icon sf="chevron.down" size={10} color={c.textFaint} />
              </Pressable>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
                Ke dompet
              </Txt>
              <Pressable
                onPress={() => setToWalletPicker(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 13,
                  borderRadius: radius.md,
                  backgroundColor: c.surfaceAlt,
                }}>
                <Icon sf={toWallet?.icon ?? 'arrow.right'} size={14} color={c.textMuted} />
                <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>
                  {toWallet?.name ?? 'Pilih'}
                </Txt>
                <Icon sf="chevron.down" size={10} color={c.textFaint} />
              </Pressable>
            </View>
          )}
        </Row>

        {type === 'transfer' ? (
          <View>
            <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
              Dompet asal
            </Txt>
            <Pressable
              onPress={() => setWalletPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 13,
                borderRadius: radius.md,
                backgroundColor: c.surfaceAlt,
              }}>
              <Icon sf={wallet?.icon ?? 'wallet.pass.fill'} size={14} color={c.textMuted} />
              <Txt variant="label" style={{ flex: 1 }}>
                {wallet?.name ?? 'Pilih'}
              </Txt>
            </Pressable>
          </View>
        ) : null}

        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
              Frekuensi
            </Txt>
            <Pressable
              onPress={() => setFreqPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 13,
                borderRadius: radius.md,
                backgroundColor: c.surfaceAlt,
              }}>
              <Icon sf="calendar.badge.clock" size={14} color={c.textMuted} />
              <Txt variant="label" style={{ flex: 1 }}>
                {FREQS.find((item) => item.value === freq)?.label}
              </Txt>
              <Icon sf="chevron.down" size={10} color={c.textFaint} />
            </Pressable>
          </View>
          <View style={{ width: 88 }}>
            <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
              Tiap
            </Txt>
            <TextInput
              value={interval}
              onChangeText={(text) => setIntervalN(text.replace(/[^\d]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              style={{
                padding: 13,
                borderRadius: radius.md,
                backgroundColor: c.surfaceAlt,
                fontSize: 15,
                color: c.text,
                textAlign: 'center',
              }}
            />
          </View>
        </Row>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Mulai
          </Txt>
          <Pressable
            onPress={() => setDatePicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 13,
              borderRadius: radius.md,
              backgroundColor: c.surfaceAlt,
            }}>
            <Icon sf="calendar" size={14} color={c.textMuted} />
            <Txt variant="label" style={{ flex: 1 }}>
              {formatDateID(startDate)}
            </Txt>
            <Icon sf="chevron.down" size={10} color={c.textFaint} />
          </Pressable>
        </View>

        <Row between>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body">Catat otomatis</Txt>
            <Txt variant="caption" color={c.textMuted}>
              Transaksi dibuat sendiri saat jatuh tempo.
            </Txt>
          </View>
          <Switch
            value={autoPost}
            onValueChange={setAutoPost}
            trackColor={{ true: c.accent, false: c.borderStrong }}
          />
        </Row>

        <Row between>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body">Ingatkan sebagai tagihan</Txt>
            <Txt variant="caption" color={c.textMuted}>
              Notifikasi 3 hari, 1 hari, dan saat jatuh tempo.
            </Txt>
          </View>
          <Switch
            value={isBill}
            onValueChange={setIsBill}
            trackColor={{ true: c.accent, false: c.borderStrong }}
          />
        </Row>

        {error ? (
          <Txt variant="caption" color={c.expense}>
            {error}
          </Txt>
        ) : null}
      </Sheet>

      <PickerSheet
        visible={walletPicker}
        onClose={() => setWalletPicker(false)}
        title="Pilih dompet"
        options={walletList.map((item) => ({
          value: item.id,
          label: item.name,
          subtitle: formatMoney(item.balance),
          icon: item.icon,
          color: item.color,
        }))}
        value={walletId}
        onSelect={(value2) => {
          setWalletId(value2);
          setWalletPicker(false);
        }}
      />

      <PickerSheet
        visible={toWalletPicker}
        onClose={() => setToWalletPicker(false)}
        title="Dompet tujuan"
        options={walletList.filter((item) => item.id !== walletId).map((item) => ({
          value: item.id,
          label: item.name,
          subtitle: formatMoney(item.balance),
          icon: item.icon,
          color: item.color,
        }))}
        value={toWalletId}
        onSelect={(value2) => {
          setToWalletId(value2);
          setToWalletPicker(false);
        }}
      />

      <PickerSheet
        visible={categoryPicker}
        onClose={() => setCategoryPicker(false)}
        title="Pilih kategori"
        options={categoryList.map((item) => ({
          value: item.id,
          label: item.name,
          icon: item.icon,
          color: item.color,
        }))}
        value={categoryId}
        onSelect={(value2) => {
          setCategoryId(value2);
          setCategoryPicker(false);
        }}
      />

      <PickerSheet
        visible={freqPicker}
        onClose={() => setFreqPicker(false)}
        title="Frekuensi"
        options={FREQS}
        value={freq}
        onSelect={(value2) => {
          setFreq(value2 as Freq);
          setFreqPicker(false);
        }}
      />

      <DateSheet
        visible={datePicker}
        onClose={() => setDatePicker(false)}
        value={startDate}
        onSelect={(iso) => {
          setStartDate(iso);
          setDatePicker(false);
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus aturan?"
        message="Transaksi yang sudah tercatat tetap tersimpan."
        onConfirm={() => {
          if (rule) void deleteRecurring(rule.id).then(onClose);
        }}
      />
    </>
  );
}

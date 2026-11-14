import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ConfirmSheet, DateSheet, PickerSheet } from '@/components/sheet';
import { Badge, Button, Chip, Divider, Row, Stack, Txt } from '@/components/ui';
import { useQuery } from '@/db';
import {
  deleteTransaction,
  getTransaction,
  listCategories,
  listWallets,
  saveTransaction,
} from '@/db/queries';
import type { Category, TxnType, WalletWithBalance } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatDateID, relativeDateLabel, todayISO } from '@/lib/dates';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { radius } from '@/lib/theme';

type Mode = 'new' | 'edit';

const TYPE_OPTIONS: { value: TxnType; label: string; icon: string }[] = [
  { value: 'expense', label: 'Pengeluaran', icon: 'arrow.up.right' },
  { value: 'income', label: 'Pemasukan', icon: 'arrow.down.left' },
  { value: 'transfer', label: 'Transfer', icon: 'arrow.left.arrow.right' },
];

const QUICK_ADD = [10_000, 50_000, 100_000];

export function TransactionEditor({
  mode,
  transactionId,
  initialType = 'expense',
  initialAmount,
  initialNote,
  initialPayee,
}: {
  mode: Mode;
  transactionId?: string;
  initialType?: TxnType;
  initialAmount?: number;
  initialNote?: string;
  initialPayee?: string;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<TxnType>(initialType);
  const [amount, setAmount] = useState(
    initialAmount && initialAmount > 0 ? String(initialAmount) : '',
  );
  const [categoryChoice, setCategoryId] = useState<string | null>(null);
  const [walletChoice, setWalletId] = useState<string | null>(null);
  const [toWalletChoice, setToWalletId] = useState<string | null>(null);
  const [fee, setFee] = useState('');
  const [date, setDate] = useState(todayISO());
  const [payee, setPayee] = useState(initialPayee ?? '');
  const [note, setNote] = useState(initialNote ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [recurringId, setRecurringId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [walletSheet, setWalletSheet] = useState(false);
  const [toWalletSheet, setToWalletSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);

  const wallets = useQuery(() => listWallets(), []);
  const categories = useQuery(() => listCategories(type === 'income' ? 'income' : 'expense'), [type]);
  const existing = useQuery(
    () => (transactionId ? getTransaction(transactionId) : Promise.resolve(null)),
    [transactionId],
  );

  const walletList = wallets.data ?? [];
  const categoryList = categories.data ?? [];

  // Hydrate the form once the edited transaction arrives from the database.
  // Guarded render-time state sync: it runs exactly once per transaction id and
  // never overwrites edits when the query re-runs after a mutation.
  const loaded = existing.data;
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  if (mode === 'edit' && loaded && hydratedId !== loaded.id) {
    setHydratedId(loaded.id);
    setType(loaded.type);
    setAmount(String(loaded.amount));
    setCategoryId(loaded.category_id);
    setWalletId(loaded.wallet_id);
    setToWalletId(loaded.to_wallet_id);
    setFee(loaded.fee ? String(loaded.fee) : '');
    setDate(loaded.date);
    setPayee(loaded.payee ?? '');
    setNote(loaded.note ?? '');
    setAttachment(loaded.attachment_uri);
    setRecurringId(loaded.recurring_id);
    try {
      const parsed = loaded.tags ? (JSON.parse(loaded.tags) as string[]) : [];
      setTags(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTags([]);
    }
  }

  // Defaults are derived rather than stored, so no effect is needed to fill them in.
  const walletId = walletChoice ?? walletList[0]?.id ?? null;
  const categoryId =
    type === 'transfer'
      ? null
      : categoryChoice && categoryList.some((item) => item.id === categoryChoice)
        ? categoryChoice
        : (categoryList[0]?.id ?? null);
  const toWalletId =
    type === 'transfer'
      ? (toWalletChoice ?? walletList.find((w) => w.id !== walletId)?.id ?? null)
      : toWalletChoice;

  const amountValue = parseAmountInput(amount);
  const feeValue = parseAmountInput(fee);
  const wallet = walletList.find((w) => w.id === walletId) ?? null;
  const toWallet = walletList.find((w) => w.id === toWalletId) ?? null;

  const canSave = useMemo(() => {
    if (amountValue <= 0) return false;
    if (!walletId) return false;
    if (type === 'transfer' && (!toWalletId || toWalletId === walletId)) return false;
    if (type !== 'transfer' && !categoryId) return false;
    return true;
  }, [amountValue, walletId, toWalletId, type, categoryId]);

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await saveTransaction({
        id: transactionId,
        type,
        wallet_id: walletId!,
        to_wallet_id: type === 'transfer' ? toWalletId : null,
        category_id: type === 'transfer' ? null : categoryId,
        amount: amountValue,
        fee: type === 'transfer' ? feeValue : 0,
        date,
        time: null,
        payee: payee.trim() || null,
        note: note.trim() || null,
        tags: tags.length ? tags : null,
        attachment_uri: attachment,
        recurring_id: recurringId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function changeType(next: TxnType) {
    Haptics.selectionAsync();
    setType(next);
  }

  const accent = type === 'income' ? c.income : type === 'transfer' ? c.info : c.expense;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Row between style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Tutup">
          <Txt variant="body" color={c.textMuted}>
            Batal
          </Txt>
        </Pressable>
        <Txt variant="h3">{mode === 'edit' ? 'Ubah Transaksi' : 'Transaksi Baru'}</Txt>
        <Pressable
          onPress={save}
          disabled={!canSave || saving}
          hitSlop={12}
          accessibilityLabel="Simpan transaksi">
          <Txt variant="body" weight="700" color={canSave ? c.accent : c.textFaint}>
            Simpan
          </Txt>
        </Pressable>
      </Row>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={8}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 18 }}>
          {/* type switch */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.surfaceAlt,
              borderRadius: radius.md,
              padding: 3,
              gap: 3,
            }}>
            {TYPE_OPTIONS.map((option) => {
              const active = option.value === type;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => changeType(option.value)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    paddingVertical: 9,
                    borderRadius: radius.md - 4,
                    backgroundColor: active ? c.surface : 'transparent',
                  }}>
                  <Icon
                    sf={option.icon}
                    size={12}
                    color={active ? accent : c.textMuted}
                    weight="semibold"
                  />
                  <Txt variant="caption" color={active ? c.text : c.textMuted} weight="600">
                    {option.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          {/* amount */}
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Txt variant="caption" color={c.textFaint} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              Jumlah
            </Txt>
            <Row gap={2} style={{ marginTop: 6 }}>
              <Txt style={{ fontSize: 22, fontWeight: '600', color: c.textMuted, marginTop: 8 }}>Rp</Txt>
              <TextInput
                value={amount ? formatAmount(amountValue) : ''}
                onChangeText={(text) => setAmount(text.replace(/[^\d]/g, '').slice(0, 12))}
                placeholder="0"
                placeholderTextColor={c.textFaint}
                keyboardType="number-pad"
                autoFocus={mode === 'new'}
                style={{
                  fontSize: 46,
                  fontWeight: '700',
                  letterSpacing: -1.4,
                  color: amountValue > 0 ? c.text : c.textFaint,
                  fontVariant: ['tabular-nums'],
                  minWidth: 80,
                  maxWidth: 300,
                  padding: 0,
                }}
              />
            </Row>
            <Row gap={8} style={{ marginTop: 12 }}>
              {QUICK_ADD.map((value) => (
                <Chip
                  key={value}
                  label={`+${formatAmount(value / 1000)}rb`}
                  onPress={() => setAmount(String(amountValue + value))}
                />
              ))}
            </Row>
          </View>

          {/* category */}
          {type !== 'transfer' ? (
            <View>
              <Row between style={{ marginBottom: 10 }}>
                <Txt variant="caption" color={c.textMuted}>
                  Kategori
                </Txt>
                <Pressable onPress={() => setCategorySheet(true)} hitSlop={8}>
                  <Txt variant="caption" color={c.accent} weight="600">
                    Semua
                  </Txt>
                </Pressable>
              </Row>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
                {categoryList.slice(0, 12).map((item) => (
                  <CategoryChip
                    key={item.id}
                    category={item}
                    active={item.id === categoryId}
                    onPress={() => setCategoryId(item.id)}
                  />
                ))}
              </ScrollView>
              {categoryList.length === 0 ? (
                <Txt variant="caption" color={c.textFaint}>
                  Belum ada kategori {type === 'income' ? 'pemasukan' : 'pengeluaran'}.
                </Txt>
              ) : null}
            </View>
          ) : null}

          {/* details */}
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
            <FieldRow
              icon="wallet.pass.fill"
              label={type === 'transfer' ? 'Dari dompet' : 'Dompet'}
              value={wallet ? wallet.name : 'Pilih'}
              onPress={() => setWalletSheet(true)}
            />
            <Divider inset={52} />
            {type === 'transfer' ? (
              <>
                <FieldRow
                  icon="arrow.right"
                  label="Ke dompet"
                  value={toWallet ? toWallet.name : 'Pilih'}
                  onPress={() => setToWalletSheet(true)}
                />
                <Divider inset={52} />
              </>
            ) : null}
            <FieldRow
              icon="calendar"
              label="Tanggal"
              value={`${relativeDateLabel(date)}${date !== todayISO() ? ` · ${formatDateID(date, false)}` : ''}`}
              onPress={() => setDateSheet(true)}
            />
            <Divider inset={52} />
            <FieldRow
              icon="text.alignleft"
              label="Catatan"
              value={note || 'Tambah catatan'}
              muted={!note}
              onPress={() => setShowMore(true)}
            />
          </View>

          {/* merchant */}
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: 14 }}>
            <TextInput
              value={payee}
              onChangeText={setPayee}
              placeholder="Merchant / penerima"
              placeholderTextColor={c.textFaint}
              style={{ paddingVertical: 14, fontSize: 15, color: c.text }}
              returnKeyType="next"
            />
            <Divider />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Catatan"
              placeholderTextColor={c.textFaint}
              style={{ paddingVertical: 14, fontSize: 15, color: c.text }}
              multiline
            />
          </View>

          {/* more */}
          <Pressable onPress={() => setShowMore((prev) => !prev)} hitSlop={6}>
            <Row gap={6}>
              <Icon sf={showMore ? 'chevron.up' : 'chevron.down'} size={12} color={c.textMuted} />
              <Txt variant="caption" color={c.textMuted}>
                Opsi lainnya
              </Txt>
            </Row>
          </Pressable>

          {showMore ? (
            <Stack gap={12}>
              {type === 'transfer' ? (
                <View>
                  <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
                    Biaya transfer
                  </Txt>
                  <TextInput
                    value={fee ? formatAmount(feeValue) : ''}
                    onChangeText={(text) => setFee(text.replace(/[^\d]/g, '').slice(0, 9))}
                    placeholder="0"
                    placeholderTextColor={c.textFaint}
                    keyboardType="number-pad"
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: radius.md,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: c.text,
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                </View>
              ) : null}

              <View>
                <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
                  Tag
                </Txt>
                <TagEditor tags={tags} onChange={setTags} />
              </View>

              {mode === 'edit' ? (
                <Button
                  label="Hapus transaksi"
                  variant="danger"
                  icon="trash"
                  onPress={() => setConfirmDelete(true)}
                />
              ) : null}

              {attachment ? <Badge label="Ada lampiran" color={c.info} /> : null}
            </Stack>
          ) : null}

          <Stack gap={8} style={{ marginTop: 4 }}>
            <Button
              label={saving ? 'Menyimpan…' : type === 'transfer' ? 'Simpan transfer' : 'Simpan transaksi'}
              size="lg"
              disabled={!canSave || saving}
              onPress={save}
            />
            {!canSave ? (
              <Txt variant="caption" color={c.textFaint} align="center">
                {amountValue <= 0
                  ? 'Masukkan jumlah lebih dari nol.'
                  : type === 'transfer'
                    ? 'Pilih dompet tujuan yang berbeda.'
                    : 'Pilih kategori dulu.'}
              </Txt>
            ) : null}
          </Stack>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet
        visible={walletSheet}
        onClose={() => setWalletSheet(false)}
        title="Pilih dompet"
        options={walletList.map(walletOption)}
        value={walletId}
        onSelect={(value) => {
          setWalletId(value);
          setWalletSheet(false);
        }}
      />
      <PickerSheet
        visible={toWalletSheet}
        onClose={() => setToWalletSheet(false)}
        title="Dompet tujuan"
        options={walletList.filter((w) => w.id !== walletId).map(walletOption)}
        value={toWalletId}
        onSelect={(value) => {
          setToWalletId(value);
          setToWalletSheet(false);
        }}
      />
      <PickerSheet
        visible={categorySheet}
        onClose={() => setCategorySheet(false)}
        title="Pilih kategori"
        options={categoryList.map((item) => ({
          value: item.id,
          label: item.name,
          icon: item.icon,
          color: item.color,
        }))}
        value={categoryId}
        onSelect={(value) => {
          setCategoryId(value);
          setCategorySheet(false);
        }}
      />
      <DateSheet
        visible={dateSheet}
        onClose={() => setDateSheet(false)}
        value={date}
        onSelect={(iso) => {
          setDate(iso);
          setDateSheet(false);
        }}
      />
      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus transaksi?"
        message="Transaksi akan dihapus dari riwayat dan saldo dompet akan disesuaikan."
        onConfirm={() => {
          if (transactionId) {
            void deleteTransaction(transactionId).then(() => router.back());
          }
        }}
      />
    </View>
  );
}

function walletOption(wallet: WalletWithBalance) {
  return {
    value: wallet.id,
    label: wallet.name,
    subtitle: formatMoney(wallet.balance),
    icon: wallet.icon,
    color: wallet.color,
  };
}

function CategoryChip({
  category,
  active,
  onPress,
}: {
  category: Category;
  active: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{ alignItems: 'center', width: 68, gap: 6 }}>
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? `${category.color}2E` : c.surface,
          borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: active ? category.color : c.border,
        }}>
        <Icon sf={category.icon} size={20} color={active ? category.color : c.textMuted} />
      </View>
      <Txt
        variant="caption"
        color={active ? c.text : c.textMuted}
        weight={active ? '600' : '500'}
        numberOfLines={1}
        style={{ fontSize: 11, textAlign: 'center' }}>
        {category.name}
      </Txt>
    </Pressable>
  );
}

function FieldRow({
  icon,
  label,
  value,
  onPress,
  muted,
}: {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 15,
        paddingHorizontal: 14,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icon sf={icon} size={16} color={c.textMuted} />
      <Txt variant="body" style={{ flex: 1 }} color={c.textMuted}>
        {label}
      </Txt>
      <Txt variant="label" weight="500" color={muted ? c.textFaint : c.text} numberOfLines={1}>
        {value}
      </Txt>
      <Icon sf="chevron.right" size={12} color={c.textFaint} />
    </Pressable>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const c = useTheme();
  const [input, setInput] = useState('');

  function add() {
    const value = input.trim().replace(/^#/, '');
    if (!value || tags.includes(value)) {
      setInput('');
      return;
    }
    onChange([...tags, value]);
    setInput('');
  }

  return (
    <View>
      <Row gap={8}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={add}
          placeholder="mis. liburan"
          placeholderTextColor={c.textFaint}
          returnKeyType="done"
          blurOnSubmit={false}
          style={{
            flex: 1,
            backgroundColor: c.surface,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 11,
            fontSize: 15,
            color: c.text,
          }}
        />
        <Button label="Tambah" variant="secondary" size="sm" onPress={add} />
      </Row>
      {tags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} selected onPress={() => onChange(tags.filter((t) => t !== tag))} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

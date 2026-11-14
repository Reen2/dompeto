import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { DateSheet, PickerSheet, Sheet } from '@/components/sheet';
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
import { listDebts, listWallets, payDebt, saveDebt } from '@/db/queries';
import type { Debt } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, formatDateID, todayISO } from '@/lib/dates';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

type Tab = 'payable' | 'receivable';

export default function DebtsScreen() {
  const c = useTheme();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('payable');
  const [editing, setEditing] = useState<Debt | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [paying, setPaying] = useState<Debt | null>(null);

  const debts = useQuery(() => listDebts(false), []);
  const list = (debts.data ?? []).filter((debt) => debt.type === tab);

  const totalPayable = (debts.data ?? [])
    .filter((debt) => debt.type === 'payable')
    .reduce((sum, debt) => sum + debt.remaining, 0);
  const totalReceivable = (debts.data ?? [])
    .filter((debt) => debt.type === 'receivable')
    .reduce((sum, debt) => sum + debt.remaining, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Row gap={10}>
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              padding: 14,
              gap: 2,
            }}>
            <Txt variant="caption" color={c.textMuted}>
              Utangku
            </Txt>
            <Txt variant="amount" color={c.expense} style={{ fontSize: 17 }}>
              {formatMoney(totalPayable, { masked: settings.hideBalances })}
            </Txt>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              padding: 14,
              gap: 2,
            }}>
            <Txt variant="caption" color={c.textMuted}>
              Piutangku
            </Txt>
            <Txt variant="amount" color={c.income} style={{ fontSize: 17 }}>
              {formatMoney(totalReceivable, { masked: settings.hideBalances })}
            </Txt>
          </View>
        </Row>

        <View style={{ marginTop: 14 }}>
          <Segmented
            options={[
              { value: 'payable', label: 'Utang' },
              { value: 'receivable', label: 'Piutang' },
            ]}
            value={tab}
            onChange={(value) => setTab(value as Tab)}
          />
        </View>

        <SectionHeader
          title={`${list.length} catatan`}
          action="Tambah"
          onAction={() => {
            setEditing(null);
            setEditOpen(true);
          }}
        />

        {list.length === 0 ? (
          <EmptyState
            icon="person.2"
            title={tab === 'payable' ? 'Tidak ada utang' : 'Tidak ada piutang'}
            description={
              tab === 'payable'
                ? 'Bagus! Semoga tetap begitu. Kalau ada, catat di sini agar tidak lupa.'
                : 'Uang yang kamu pinjamkan ke orang lain akan tercatat di sini.'
            }
            actionLabel={tab === 'payable' ? 'Catat utang' : 'Catat piutang'}
            onAction={() => {
              setEditing(null);
              setEditOpen(true);
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((debt) => {
              const paid = Math.max(0, debt.principal - debt.remaining);
              const ratio = debt.principal ? paid / debt.principal : 0;
              const days = debt.due_date ? daysBetween(todayISO(), debt.due_date) : null;
              const overdue = days !== null && days < 0;
              return (
                <Card key={debt.id} onPress={() => { setEditing(debt); setEditOpen(true); }}>
                  <Row between style={{ marginBottom: 8 }}>
                    <Row gap={10} style={{ flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: `${tab === 'payable' ? c.expense : c.income}1A`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon
                          sf={tab === 'payable' ? 'arrow.up.right' : 'arrow.down.left'}
                          size={16}
                          color={tab === 'payable' ? c.expense : c.income}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Txt variant="h3" numberOfLines={1}>
                          {debt.counterparty}
                        </Txt>
                        <Txt variant="caption" color={overdue ? c.expense : c.textMuted}>
                          {debt.due_date
                            ? overdue
                              ? `Lewat ${Math.abs(days!)} hari`
                              : days === 0
                                ? 'Jatuh tempo hari ini'
                                : `${days} hari lagi · ${formatDateID(debt.due_date, false)}`
                            : debt.note || 'Tanpa tenggat'}
                        </Txt>
                      </View>
                    </Row>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Txt variant="amount" style={{ fontSize: 16 }}>
                        {formatMoney(debt.remaining, { masked: settings.hideBalances })}
                      </Txt>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPaying(debt);
                        }}
                        hitSlop={6}>
                        <Txt variant="caption" color={c.accent} weight="600">
                          {tab === 'payable' ? 'Bayar' : 'Terima'}
                        </Txt>
                      </Pressable>
                    </View>
                  </Row>
                  <ProgressBar value={ratio} height={5} color={tab === 'payable' ? c.expense : c.income} />
                  <Row between style={{ marginTop: 6 }}>
                    <Txt variant="caption" color={c.textFaint}>
                      Dibayar {formatMoney(paid, { compact: true, masked: settings.hideBalances })}
                    </Txt>
                    <Txt variant="caption" color={c.textFaint}>
                      Dari {formatMoney(debt.principal, { compact: true, masked: settings.hideBalances })}
                    </Txt>
                  </Row>
                </Card>
              );
            })}
          </View>
        )}

        <Button
          label={tab === 'payable' ? 'Catat utang' : 'Catat piutang'}
          variant="secondary"
          icon="plus"
          style={{ marginTop: 16 }}
          onPress={() => {
            setEditing(null);
            setEditOpen(true);
          }}
        />
      </Screen>

      <DebtSheet
        key={`${editing?.id ?? 'new'}-${editOpen}`}
        visible={editOpen}
        debt={editing}
        defaultType={tab}
        onClose={() => setEditOpen(false)}
      />

      <PaySheet key={paying?.id ?? 'none'} debt={paying} onClose={() => setPaying(null)} />
    </View>
  );
}

function DebtSheet({
  visible,
  debt,
  defaultType,
  onClose,
}: {
  visible: boolean;
  debt: Debt | null;
  defaultType: Tab;
  onClose: () => void;
}) {
  const c = useTheme();
  const [type, setType] = useState<Tab>(debt?.type ?? defaultType);
  const [counterparty, setCounterparty] = useState(debt?.counterparty ?? '');
  const [principal, setPrincipal] = useState(debt ? String(debt.principal) : '');
  const [dueDate, setDueDate] = useState(debt?.due_date ?? '');
  const [note, setNote] = useState(debt?.note ?? '');
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent re-mounts this sheet via `key`, so initial state is enough.

  const value = parseAmountInput(principal);

  async function submit() {
    if (!counterparty.trim() || value <= 0) {
      setError('Isi nama dan jumlah.');
      return;
    }
    await saveDebt({
      id: debt?.id,
      type,
      counterparty: counterparty.trim(),
      principal: value,
      remaining: debt?.remaining,
      due_date: dueDate || null,
      note: note.trim() || null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={debt ? 'Ubah catatan' : type === 'payable' ? 'Catat utang' : 'Catat piutang'}
        footer={<Button label={debt ? 'Simpan' : 'Simpan catatan'} size="lg" onPress={submit} />}>
        <Segmented
          options={[
            { value: 'payable', label: 'Aku berutang' },
            { value: 'receivable', label: 'Aku dipiutang' },
          ]}
          value={type}
          onChange={(next) => setType(next as Tab)}
        />

        <TextInput
          value={counterparty}
          onChangeText={setCounterparty}
          placeholder={type === 'payable' ? 'Kepada siapa?' : 'Siapa yang meminjam?'}
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
            value={principal ? formatAmount(value) : ''}
            onChangeText={(text) => setPrincipal(text.replace(/[^\d]/g, '').slice(0, 13))}
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

        <Pressable
          onPress={() => setDateOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            borderRadius: radius.md,
            backgroundColor: c.surfaceAlt,
          }}>
          <Icon sf="calendar" size={15} color={c.textMuted} />
          <Txt variant="body" style={{ flex: 1 }} color={dueDate ? c.text : c.textFaint}>
            {dueDate ? formatDateID(dueDate) : 'Tenggat (opsional)'}
          </Txt>
          {dueDate ? (
            <Pressable onPress={() => setDueDate('')} hitSlop={8}>
              <Icon sf="xmark.circle.fill" size={15} color={c.textFaint} />
            </Pressable>
          ) : null}
        </Pressable>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Catatan (opsional)"
          placeholderTextColor={c.textFaint}
          multiline
          style={{
            backgroundColor: c.surfaceAlt,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: c.text,
            minHeight: 64,
          }}
        />

        {error ? (
          <Txt variant="caption" color={c.expense}>
            {error}
          </Txt>
        ) : null}
      </Sheet>

      <DateSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        value={dueDate || todayISO()}
        onSelect={(iso) => {
          setDueDate(iso);
          setDateOpen(false);
        }}
      />
    </>
  );
}

function PaySheet({ debt, onClose }: { debt: Debt | null; onClose: () => void }) {
  const c = useTheme();
  const { settings } = useSettings();
  const wallets = useQuery(() => listWallets(), []);
  const [amount, setAmount] = useState(debt ? String(debt.remaining) : '');
  const [walletChoice, setWalletId] = useState<string | null | undefined>(undefined);
  const [picker, setPicker] = useState(false);

  // `undefined` means "not chosen yet" so the first wallet can be the default
  // while an explicit `null` still means "no wallet".
  const walletId = walletChoice === undefined ? (wallets.data?.[0]?.id ?? null) : walletChoice;
  const value = parseAmountInput(amount);
  const wallet = (wallets.data ?? []).find((item) => item.id === walletId);

  async function submit() {
    if (!debt || value <= 0) return;
    await payDebt(debt, value, walletId, undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <>
      <Sheet
        visible={!!debt}
        onClose={onClose}
        title={debt?.type === 'payable' ? 'Bayar utang' : 'Terima piutang'}
        subtitle={debt?.counterparty}
        footer={<Button label="Simpan pembayaran" size="lg" disabled={value <= 0} onPress={submit} />}>
        <Row
          gap={4}
          style={{
            backgroundColor: c.surfaceAlt,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}>
          <Txt variant="body" color={c.textMuted} style={{ fontSize: 20, fontWeight: '600' }}>
            Rp
          </Txt>
          <TextInput
            value={amount ? formatAmount(value) : ''}
            onChangeText={(text) => setAmount(text.replace(/[^\d]/g, '').slice(0, 13))}
            placeholder="0"
            keyboardType="number-pad"
            placeholderTextColor={c.textFaint}
            autoFocus
            style={{
              flex: 1,
              fontSize: 28,
              fontWeight: '700',
              color: c.text,
              fontVariant: ['tabular-nums'],
              padding: 0,
            }}
          />
        </Row>

        <Row gap={8}>
          <Pressable
            onPress={() => setPicker(true)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: c.surfaceAlt,
            }}>
            <Icon sf={wallet?.icon ?? 'wallet.pass.fill'} size={15} color={c.textMuted} />
            <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
              {wallet?.name ?? 'Tanpa dompet'}
            </Txt>
            <Icon sf="chevron.down" size={11} color={c.textFaint} />
          </Pressable>
          <Pressable
            onPress={() => setWalletId(null)}
            style={{
              paddingHorizontal: 14,
              borderRadius: radius.md,
              backgroundColor: c.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Txt variant="caption" color={c.textMuted} weight="600">
              Tanpa dompet
            </Txt>
          </Pressable>
        </Row>

        <Txt variant="caption" color={c.textFaint}>
          Tanpa dompet, pembayaran tidak mengubah saldo — hanya mencatat sisa utang.
        </Txt>
      </Sheet>

      <PickerSheet
        visible={picker}
        onClose={() => setPicker(false)}
        title="Pilih dompet"
        options={(wallets.data ?? []).map((item) => ({
          value: item.id,
          label: item.name,
          subtitle: formatMoney(item.balance, { masked: settings.hideBalances }),
          icon: item.icon,
          color: item.color,
        }))}
        value={walletId}
        onSelect={(next) => {
          setWalletId(next);
          setPicker(false);
        }}
      />
    </>
  );
}

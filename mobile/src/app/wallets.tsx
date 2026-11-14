import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { ConfirmSheet, PickerSheet, Sheet } from '@/components/sheet';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import { deleteWallet, listWallets, saveWallet, setWalletArchived } from '@/db/queries';
import { WALLET_TYPES } from '@/db/schema';
import type { WalletType, WalletWithBalance } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { categoryPalette, radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

export default function WalletsScreen() {
  const c = useTheme();
  const { settings } = useSettings();
  const [editing, setEditing] = useState<WalletWithBalance | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const wallets = useQuery(() => listWallets(true), []);
  const all = wallets.data ?? [];
  const visible = all.filter((wallet) => (showArchived ? true : !wallet.archived_at));
  const total = all
    .filter((wallet) => wallet.include_in_total === 1 && !wallet.archived_at)
    .reduce((sum, wallet) => sum + wallet.balance, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Card>
          <Txt variant="caption" color={c.textMuted}>
            Total saldo
          </Txt>
          <Txt variant="amountLarge" style={{ marginTop: 2 }}>
            {formatMoney(total, { masked: settings.hideBalances })}
          </Txt>
          <Txt variant="caption" color={c.textFaint} style={{ marginTop: 3 }}>
            Dari {all.filter((wallet) => wallet.include_in_total === 1 && !wallet.archived_at).length} dompet
          </Txt>
        </Card>

        <SectionHeader
          title="Semua dompet"
          action={showArchived ? 'Sembunyikan arsip' : 'Lihat arsip'}
          onAction={() => setShowArchived((prev) => !prev)}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon="wallet.pass"
            title="Belum ada dompet"
            description="Tambahkan dompet untuk memisahkan uang tunai, rekening, dan e-wallet."
            actionLabel="Tambah dompet"
            onAction={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {visible.map((wallet) => {
              const type = WALLET_TYPES.find((item) => item.value === wallet.type);
              const negative = wallet.type === 'credit_card';
              return (
                <Card
                  key={wallet.id}
                  onPress={() => {
                    setEditing(wallet);
                    setSheetOpen(true);
                  }}>
                  <Row gap={12}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: `${wallet.color}1F`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Icon sf={wallet.icon} size={19} color={wallet.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row gap={6}>
                        <Txt variant="h3">{wallet.name}</Txt>
                        {wallet.archived_at ? <Badge label="Arsip" color={c.textFaint} /> : null}
                      </Row>
                      <Txt variant="caption" color={c.textMuted}>
                        {type?.label ?? wallet.type}
                        {wallet.txn_count > 0 ? ` · ${wallet.txn_count} transaksi` : ''}
                      </Txt>
                    </View>
                    <Txt
                      variant="amount"
                      color={wallet.balance < 0 ? c.expense : c.text}
                      style={{ fontSize: 16 }}>
                      {formatMoney(negative ? -wallet.balance : wallet.balance, {
                        masked: settings.hideBalances,
                      })}
                    </Txt>
                  </Row>
                  {wallet.type === 'credit_card' && wallet.credit_limit ? (
                    <>
                      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                      <Row between>
                        <Txt variant="caption" color={c.textMuted}>
                          Limit {formatMoney(wallet.credit_limit, { compact: true })}
                        </Txt>
                        <Txt variant="caption" color={c.textMuted}>
                          Sisa {formatMoney(Math.max(0, wallet.credit_limit + wallet.balance), { compact: true })}
                        </Txt>
                      </Row>
                    </>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}

        <Button
          label="Tambah dompet"
          variant="secondary"
          icon="plus"
          style={{ marginTop: 16 }}
          onPress={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        />
      </Screen>

      <WalletSheet
        key={`${editing?.id ?? 'new'}-${sheetOpen}`}
        visible={sheetOpen}
        wallet={editing}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function WalletSheet({
  visible,
  wallet,
  onClose,
}: {
  visible: boolean;
  wallet: WalletWithBalance | null;
  onClose: () => void;
}) {
  const c = useTheme();
  const [name, setName] = useState(wallet?.name ?? '');
  const [type, setType] = useState<WalletType>(wallet?.type ?? 'bank');
  const [color, setColor] = useState(wallet?.color ?? categoryPalette[0]);
  const [opening, setOpening] = useState(wallet ? String(wallet.opening_balance) : '');
  const [limit, setLimit] = useState(wallet?.credit_limit ? String(wallet.credit_limit) : '');
  const [includeInTotal, setIncludeInTotal] = useState(wallet ? wallet.include_in_total === 1 : true);
  const [typePicker, setTypePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent re-mounts this sheet via `key`, so initial state is enough.

  const meta = WALLET_TYPES.find((item) => item.value === type) ?? WALLET_TYPES[0];

  async function submit() {
    if (!name.trim()) {
      setError('Nama dompet wajib diisi.');
      return;
    }
    await saveWallet({
      id: wallet?.id,
      name: name.trim(),
      type,
      icon: meta.icon,
      color,
      opening_balance: parseAmountInput(opening),
      credit_limit: type === 'credit_card' ? parseAmountInput(limit) : null,
      include_in_total: includeInTotal,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  async function remove() {
    if (!wallet) return;
    const result = await deleteWallet(wallet.id);
    if (!result.ok) {
      setError(result.reason ?? 'Tidak bisa menghapus dompet ini.');
      return;
    }
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={wallet ? 'Ubah dompet' : 'Dompet baru'}
        footer={
          <View style={{ gap: 8 }}>
            <Button label={wallet ? 'Simpan' : 'Tambah dompet'} size="lg" onPress={submit} />
            {wallet ? (
              <>
                <Button
                  label={wallet.archived_at ? 'Keluarkan dari arsip' : 'Arsipkan dompet'}
                  variant="ghost"
                  onPress={() => {
                    void setWalletArchived(wallet.id, !wallet.archived_at).then(onClose);
                  }}
                />
                <Button label="Hapus dompet" variant="danger" onPress={() => setConfirmDelete(true)} />
              </>
            ) : null}
          </View>
        }>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 21,
              backgroundColor: `${color}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon sf={meta.icon} size={26} color={color} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categoryPalette.slice(0, 8).map((tone) => (
              <Pressable
                key={tone}
                onPress={() => setColor(tone)}
                accessibilityLabel={`Warna ${tone}`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: tone,
                  borderWidth: color === tone ? 2.5 : 0,
                  borderColor: c.text,
                }}
              />
            ))}
          </View>
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Nama dompet
          </Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="mis. BCA, GoPay, Dompet Tunai"
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
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Jenis
          </Txt>
          <Pressable
            onPress={() => setTypePicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: c.surfaceAlt,
            }}>
            <Icon sf={meta.icon} size={16} color={c.textMuted} />
            <Txt variant="body" style={{ flex: 1 }}>
              {meta.label}
            </Txt>
            <Icon sf="chevron.down" size={12} color={c.textFaint} />
          </Pressable>
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Saldo awal
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
              value={opening ? formatAmount(parseAmountInput(opening)) : ''}
              onChangeText={(text) => setOpening(text.replace(/[^\d-]/g, '').slice(0, 13))}
              placeholder="0"
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={c.textFaint}
              style={{
                flex: 1,
                fontSize: 22,
                fontWeight: '700',
                color: c.text,
                fontVariant: ['tabular-nums'],
                padding: 0,
              }}
            />
          </Row>
          <Txt variant="caption" color={c.textFaint} style={{ marginTop: 4 }}>
            Saldo saat dompet mulai dipakai.
          </Txt>
        </View>

        {type === 'credit_card' ? (
          <View>
            <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
              Limit kartu
            </Txt>
            <TextInput
              value={limit ? formatAmount(parseAmountInput(limit)) : ''}
              onChangeText={(text) => setLimit(text.replace(/[^\d]/g, '').slice(0, 13))}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor={c.textFaint}
              style={{
                backgroundColor: c.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 18,
                color: c.text,
                fontVariant: ['tabular-nums'],
              }}
            />
          </View>
        ) : null}

        <Row between style={{ paddingVertical: 2 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body">Hitung di total kekayaan</Txt>
            <Txt variant="caption" color={c.textMuted}>
              Matikan untuk kartu kredit atau dompet yang tidak dihitung.
            </Txt>
          </View>
          <Switch
            value={includeInTotal}
            onValueChange={setIncludeInTotal}
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
        visible={typePicker}
        onClose={() => setTypePicker(false)}
        title="Jenis dompet"
        options={WALLET_TYPES.map((item) => ({ value: item.value, label: item.label, icon: item.icon }))}
        value={type}
        onSelect={(next) => {
          setType(next as WalletType);
          setTypePicker(false);
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus dompet?"
        message="Dompet yang punya transaksi tidak bisa dihapus — arsipkan saja agar riwayat tetap utuh."
        onConfirm={() => void remove()}
      />
    </>
  );
}

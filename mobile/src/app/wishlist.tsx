import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { Icon } from '@/components/icon';
import { ConfirmSheet, Sheet } from '@/components/sheet';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import { deleteWish, listWishlist, markWishPurchased, saveWish } from '@/db/queries';
import type { WishItem } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, todayISO } from '@/lib/dates';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { radius } from '@/lib/theme';

const COOLDOWN_DAYS = 30;

export default function WishlistScreen() {
  const c = useTheme();
  const [editing, setEditing] = useState<WishItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const items = useQuery(() => listWishlist(false), []);
  const list = items.data ?? [];
  const total = list.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Card>
          <Row gap={12}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon sf="hourglass" size={19} color={c.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3">Aturan 30 hari</Txt>
              <Txt variant="caption" color={c.textMuted}>
                Tunda keinginan belanja. Kalau masih ingin setelah 30 hari, baru beli.
              </Txt>
            </View>
          </Row>
          {list.length ? (
            <Row between style={{ marginTop: 14 }}>
              <Txt variant="caption" color={c.textFaint}>
                Nilai yang ditunda
              </Txt>
              <Txt variant="amount" color={c.accent} style={{ fontSize: 15 }}>
                {formatMoney(total, { compact: true })}
              </Txt>
            </Row>
          ) : null}
        </Card>

        <SectionHeader
          title={`${list.length} keinginan`}
          action="Tambah"
          onAction={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        />

        {list.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="Daftar impian kosong"
            description="Saat tergoda belanja, tulis dulu di sini. Kebanyakan keinginan hilang dalam 30 hari."
            actionLabel="Tulis keinginan"
            onAction={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((item) => {
              const waited = Math.max(0, daysBetween(item.created_at.slice(0, 10), todayISO()));
              const progress = Math.min(1, waited / COOLDOWN_DAYS);
              const ready = waited >= COOLDOWN_DAYS;
              return (
                <Card key={item.id} onPress={() => { setEditing(item); setSheetOpen(true); }}>
                  <Row between style={{ marginBottom: 8 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row gap={6}>
                        <Txt variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {item.title}
                        </Txt>
                        {item.priority >= 2 ? <Badge label="Prio" color={c.accent} /> : null}
                      </Row>
                      <Txt variant="caption" color={c.textMuted}>
                        {ready ? 'Sudah lewat 30 hari — putuskan sekarang' : `Tunggu ${COOLDOWN_DAYS - waited} hari lagi`}
                      </Txt>
                    </View>
                    <Txt variant="amount" style={{ fontSize: 16 }}>
                      {formatMoney(item.amount)}
                    </Txt>
                  </Row>
                  <ProgressBar value={progress} height={5} color={ready ? c.income : c.accent} />
                  <Row between style={{ marginTop: 8 }}>
                    <Txt variant="caption" color={c.textFaint}>
                      {waited} hari lalu
                    </Txt>
                    <Row gap={14}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Alert.alert(
                            'Sudah dibeli?',
                            'Catat sebagai pengeluaran supaya saldo dompet ikut menyesuaikan.',
                            [
                              { text: 'Batal', style: 'cancel' },
                              {
                                text: 'Hanya tandai',
                                onPress: () => void markWishPurchased(item.id),
                              },
                              {
                                text: 'Catat pengeluaran',
                                onPress: () => {
                                  void markWishPurchased(item.id);
                                  router.push({
                                    pathname: '/transaction/new',
                                    params: {
                                      type: 'expense',
                                      amount: String(item.amount),
                                      note: item.title,
                                    },
                                  });
                                },
                              },
                            ],
                          );
                        }}
                        hitSlop={6}>
                        <Txt variant="caption" color={c.income} weight="600">
                          Sudah dibeli
                        </Txt>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          void deleteWish(item.id);
                        }}
                        hitSlop={6}>
                        <Txt variant="caption" color={c.textFaint} weight="600">
                          Lewati
                        </Txt>
                      </Pressable>
                    </Row>
                  </Row>
                </Card>
              );
            })}
          </View>
        )}

        <Button
          label="Tulis keinginan"
          variant="secondary"
          icon="plus"
          style={{ marginTop: 16 }}
          onPress={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        />
      </Screen>

      <WishSheet
        key={`${editing?.id ?? 'new'}-${sheetOpen}`}
        visible={sheetOpen}
        item={editing}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function WishSheet({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: WishItem | null;
  onClose: () => void;
}) {
  const c = useTheme();
  const [title, setTitle] = useState(item?.title ?? '');
  const [amount, setAmount] = useState(item ? String(item.amount) : '');
  const [note, setNote] = useState(item?.note ?? '');
  const [priority, setPriority] = useState(item?.priority ?? 1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The parent re-mounts this sheet via `key`, so initial state is enough.

  const value = parseAmountInput(amount);

  async function submit() {
    if (!title.trim()) return;
    await saveWish({
      id: item?.id,
      title: title.trim(),
      amount: value,
      note: note.trim() || null,
      priority,
    });
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={item ? 'Ubah keinginan' : 'Tulis keinginan'}
        footer={
          <View style={{ gap: 8 }}>
            <Button label="Simpan" size="lg" disabled={!title.trim()} onPress={submit} />
            {item ? (
              <Button label="Hapus dari daftar" variant="danger" onPress={() => setConfirmDelete(true)} />
            ) : null}
          </View>
        }>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Apa yang ingin dibeli?"
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
            onChangeText={(text) => setAmount(text.replace(/[^\d]/g, '').slice(0, 13))}
            placeholder="Perkiraan harga"
            placeholderTextColor={c.textFaint}
            keyboardType="number-pad"
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

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Seberapa ingin?
          </Txt>
          <Row gap={8}>
            {[
              { value: 1, label: 'Biasa' },
              { value: 2, label: 'Ingin' },
              { value: 3, label: 'Banget' },
            ].map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setPriority(option.value)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  backgroundColor: priority === option.value ? c.accent : c.surfaceAlt,
                }}>
                <Txt
                  variant="caption"
                  weight="600"
                  color={priority === option.value ? c.onAccent : c.textMuted}>
                  {option.label}
                </Txt>
              </Pressable>
            ))}
          </Row>
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Kenapa ingin ini? (opsional)"
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
      </Sheet>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus dari daftar?"
        onConfirm={() => {
          if (item) void deleteWish(item.id).then(onClose);
        }}
      />
    </>
  );
}

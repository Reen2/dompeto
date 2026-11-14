import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { ConfirmSheet, DateSheet, Sheet } from '@/components/sheet';
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
import { contributeToGoal, deleteGoal, listGoals, saveGoal } from '@/db/queries';
import type { Goal } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, formatDateID, todayISO } from '@/lib/dates';
import { ICON_CHOICES } from '@/lib/icons';
import { formatAmount, formatMoney, parseAmountInput } from '@/lib/money';
import { categoryPalette, radius } from '@/lib/theme';
import { useSettings } from '@/store/settings';

export default function GoalsScreen() {
  const c = useTheme();
  const { settings } = useSettings();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const goals = useQuery(() => listGoals(true), []);
  const list = goals.data ?? [];
  const totalSaved = list.reduce((sum, goal) => sum + goal.saved_amount, 0);
  const totalTarget = list.reduce((sum, goal) => sum + goal.target_amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Card>
          <Row between>
            <View style={{ gap: 2 }}>
              <Txt variant="caption" color={c.textMuted}>
                Total terkumpul
              </Txt>
              <Txt variant="amountLarge" style={{ fontSize: 28 }}>
                {formatMoney(totalSaved, { masked: settings.hideBalances })}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt variant="caption" color={c.textMuted}>
                Target
              </Txt>
              <Txt variant="amount" color={c.textMuted}>
                {formatMoney(totalTarget, { masked: settings.hideBalances })}
              </Txt>
            </View>
          </Row>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={totalTarget ? totalSaved / totalTarget : 0} height={8} />
          </View>
        </Card>

        <SectionHeader
          title={`${list.length} tujuan`}
          action="Tambah"
          onAction={() => {
            setEditing(null);
            setEditOpen(true);
          }}
        />

        {list.length === 0 ? (
          <EmptyState
            icon="flag"
            title="Belum ada tujuan"
            description="Dana darurat, liburan, atau laptop baru — tentukan targetnya dan sisihkan sedikit demi sedikit."
            actionLabel="Buat tujuan"
            onAction={() => {
              setEditing(null);
              setEditOpen(true);
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((goal) => {
              const ratio = goal.target_amount ? goal.saved_amount / goal.target_amount : 0;
              const done = ratio >= 1;
              const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
              const daysLeft = goal.target_date ? daysBetween(todayISO(), goal.target_date) : null;
              const perMonth =
                goal.target_date && daysLeft && daysLeft > 0
                  ? Math.ceil(remaining / Math.max(1, daysLeft / 30))
                  : null;
              return (
                <Card key={goal.id} onPress={() => { setEditing(goal); setEditOpen(true); }}>
                  <Row gap={12} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 13,
                        backgroundColor: `${goal.color}1F`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Icon sf={goal.icon} size={18} color={goal.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row gap={6}>
                        <Txt variant="h3">{goal.name}</Txt>
                        {done ? <Badge label="Tercapai" color={c.income} /> : null}
                      </Row>
                      <Txt variant="caption" color={c.textMuted}>
                        {formatMoney(goal.saved_amount, { compact: true, masked: settings.hideBalances })} dari{' '}
                        {formatMoney(goal.target_amount, { compact: true, masked: settings.hideBalances })}
                        {goal.target_date ? ` · ${daysLeft !== null && daysLeft > 0 ? `${daysLeft} hari lagi` : 'lewat target'}` : ''}
                      </Txt>
                    </View>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setContributing(goal);
                      }}
                      hitSlop={8}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.accentSoft,
                      }}>
                      <Icon sf="plus" size={14} color={c.accent} weight="semibold" />
                    </Pressable>
                  </Row>
                  <ProgressBar value={ratio} color={done ? c.income : goal.color} />
                  <Row between style={{ marginTop: 7 }}>
                    <Txt variant="caption" color={c.textFaint}>
                      {Math.round(ratio * 100)}%
                    </Txt>
                    <Txt variant="caption" color={c.textMuted}>
                      {done
                        ? 'Selamat, tercapai!'
                        : perMonth
                          ? `Sisihkan ${formatMoney(perMonth, { compact: true, masked: settings.hideBalances })}/bulan`
                          : `Kurang ${formatMoney(remaining, { compact: true, masked: settings.hideBalances })}`}
                    </Txt>
                  </Row>
                </Card>
              );
            })}
          </View>
        )}

        <Button
          label="Tambah tujuan"
          variant="secondary"
          icon="plus"
          style={{ marginTop: 16 }}
          onPress={() => {
            setEditing(null);
            setEditOpen(true);
          }}
        />
      </Screen>

      <GoalSheet
        key={`${editing?.id ?? 'new'}-${editOpen}`}
        visible={editOpen}
        goal={editing}
        onClose={() => setEditOpen(false)}
      />

      <ContributeSheet
        key={contributing?.id ?? 'none'}
        goal={contributing}
        onClose={() => setContributing(null)}
      />
    </View>
  );
}

function GoalSheet({
  visible,
  goal,
  onClose,
}: {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
}) {
  const c = useTheme();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : '');
  const [icon, setIcon] = useState(goal?.icon ?? 'flag.fill');
  const [color, setColor] = useState(goal?.color ?? categoryPalette[2]);
  const [date, setDate] = useState(goal?.target_date ?? '');
  const [dateOpen, setDateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent re-mounts this sheet via `key`, so initial state is enough.

  const value = parseAmountInput(target);

  async function submit() {
    if (!name.trim() || value <= 0) {
      setError('Isi nama dan target dana.');
      return;
    }
    await saveGoal({
      id: goal?.id,
      name: name.trim(),
      icon,
      color,
      target_amount: value,
      target_date: date || null,
      note: goal?.note ?? null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={goal ? 'Ubah tujuan' : 'Tujuan baru'}
        footer={
          <View style={{ gap: 8 }}>
            <Button label={goal ? 'Simpan' : 'Buat tujuan'} size="lg" onPress={submit} />
            {goal ? <Button label="Hapus tujuan" variant="danger" onPress={() => setConfirmDelete(true)} /> : null}
          </View>
        }>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              backgroundColor: `${color}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon sf={icon} size={28} color={color} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categoryPalette.map((tone) => (
              <Pressable
                key={tone}
                onPress={() => setColor(tone)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: tone,
                  borderWidth: color === tone ? 2.5 : 0,
                  borderColor: c.text,
                }}
              />
            ))}
          </ScrollView>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nama tujuan, mis. Dana Darurat"
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
            value={target ? formatAmount(value) : ''}
            onChangeText={(text) => setTarget(text.replace(/[^\d]/g, '').slice(0, 13))}
            placeholder="Target dana"
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
          <Txt variant="body" style={{ flex: 1 }} color={date ? c.text : c.textFaint}>
            {date ? formatDateID(date) : 'Target tanggal (opsional)'}
          </Txt>
          {date ? (
            <Pressable onPress={() => setDate('')} hitSlop={8}>
              <Icon sf="xmark.circle.fill" size={15} color={c.textFaint} />
            </Pressable>
          ) : null}
        </Pressable>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 8 }}>
            Ikon
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ICON_CHOICES.slice(0, 32).map((symbol) => (
              <Pressable
                key={symbol}
                onPress={() => setIcon(symbol)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: icon === symbol ? `${color}22` : c.surfaceAlt,
                  borderWidth: icon === symbol ? 1.5 : 0,
                  borderColor: color,
                }}>
                <Icon sf={symbol} size={16} color={icon === symbol ? color : c.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <Txt variant="caption" color={c.expense}>
            {error}
          </Txt>
        ) : null}
      </Sheet>

      <DateSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        value={date || todayISO()}
        onSelect={(iso) => {
          setDate(iso);
          setDateOpen(false);
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus tujuan?"
        message="Riwayat setoran ikut terhapus. Dana di dompet tidak terpengaruh."
        onConfirm={() => {
          if (goal) void deleteGoal(goal.id).then(onClose);
        }}
      />
    </>
  );
}

function ContributeSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const c = useTheme();
  const { settings } = useSettings();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const value = parseAmountInput(amount);

  async function submit() {
    if (!goal || value <= 0) return;
    await contributeToGoal(goal.id, value, note.trim() || undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount('');
    setNote('');
    onClose();
  }

  const remaining = goal ? Math.max(0, goal.target_amount - goal.saved_amount) : 0;

  return (
    <Sheet visible={!!goal} onClose={onClose} title={goal?.name ?? ''} subtitle="Tambah dana ke tujuan" scroll={false}>
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
          autoFocus
          keyboardType="number-pad"
          placeholderTextColor={c.textFaint}
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
        {[100_000, 500_000, 1_000_000].map((preset) => (
          <Pressable
            key={preset}
            onPress={() => setAmount(String(value + preset))}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.sm,
              backgroundColor: c.surfaceAlt,
              alignItems: 'center',
            }}>
            <Txt variant="caption" color={c.textMuted} weight="600">
              +{formatAmount(preset / 1000)}rb
            </Txt>
          </Pressable>
        ))}
      </Row>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Catatan (opsional)"
        placeholderTextColor={c.textFaint}
        style={{
          backgroundColor: c.surfaceAlt,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: c.text,
        }}
      />

      <Txt variant="caption" color={c.textFaint}>
        Sisa menuju target: {formatMoney(remaining, { masked: settings.hideBalances })}
      </Txt>

      <Button label="Tambah dana" size="lg" disabled={value <= 0} onPress={submit} />
    </Sheet>
  );
}

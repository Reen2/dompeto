import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button, Row, Stack, Txt } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  daysInMonth,
  formatMonthYear,
  fromISODate,
  startOfMonth,
  todayISO,
  toISODate,
  weekdayIndex,
} from '@/lib/dates';
import { radius } from '@/lib/theme';

/* ------------------------------------------------------------------ */
/* Base sheet                                                          */
/* ------------------------------------------------------------------ */

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
  maxHeightRatio = 0.86,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  maxHeightRatio?: number;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));

  // Mount during render (guarded) so the enter animation starts on the same
  // commit the sheet becomes visible.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: c.dark ? '#000000B8' : '#1A1610A0' }]}
            onPress={onClose}
            accessibilityLabel="Tutup"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none">
          <Animated.View
            style={{
              transform: [{ translateY }],
              maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
              backgroundColor: c.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              paddingBottom: Math.max(insets.bottom, 12),
            }}>
            <View style={{ alignItems: 'center', paddingTop: 9 }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
            </View>

            {title ? (
              <Row between style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h2">{title}</Txt>
                  {subtitle ? (
                    <Txt variant="caption" color={c.textMuted}>
                      {subtitle}
                    </Txt>
                  ) : null}
                </View>
                <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Tutup">
                  <Icon sf="xmark.circle.fill" size={24} color={c.textFaint} />
                </Pressable>
              </Row>
            ) : null}

            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingTop: title ? 12 : 18, gap: 14 }}>
                {children}
              </ScrollView>
            ) : (
              <View style={{ padding: 20, paddingTop: title ? 12 : 18 }}>{children}</View>
            )}

            {footer ? (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                }}>
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  keyboard: { justifyContent: 'flex-end' },
});

/* ------------------------------------------------------------------ */
/* List picker                                                         */
/* ------------------------------------------------------------------ */

export type PickerOption = {
  value: string;
  label: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  trailing?: string;
};

export function PickerSheet({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  emptyLabel = 'Belum ada pilihan',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  emptyLabel?: string;
}) {
  const c = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.8}>
      {options.length === 0 ? (
        <Txt variant="label" color={c.textMuted} align="center" style={{ paddingVertical: 24 }}>
          {emptyLabel}
        </Txt>
      ) : (
        <View style={{ gap: 6 }}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(option.value);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: radius.md,
                  backgroundColor: active ? c.accentSoft : pressed ? c.surfaceAlt : 'transparent',
                })}>
                {option.icon ? (
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: option.color ? `${option.color}22` : c.surfaceAlt,
                    }}>
                    <Icon sf={option.icon} size={16} color={option.color ?? c.textMuted} />
                  </View>
                ) : null}
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt variant="body" weight={active ? '600' : '400'} numberOfLines={1}>
                    {option.label}
                  </Txt>
                  {option.subtitle ? (
                    <Txt variant="caption" color={c.textMuted} numberOfLines={1}>
                      {option.subtitle}
                    </Txt>
                  ) : null}
                </View>
                {option.trailing ? (
                  <Txt variant="amount" color={c.textMuted} style={{ fontSize: 14 }}>
                    {option.trailing}
                  </Txt>
                ) : null}
                {active ? <Icon sf="checkmark" size={16} color={c.accent} weight="bold" /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Date picker                                                         */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function DateSheet({
  visible,
  onClose,
  value,
  onSelect,
  title = 'Pilih tanggal',
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (iso: string) => void;
  title?: string;
}) {
  const c = useTheme();
  const [cursor, setCursor] = useState(() => startOfMonth(value || todayISO()));

  const [lastVisible, setLastVisible] = useState(visible);
  // Re-opening the calendar jumps back to the selected month. Adjusting state
  // during render (guarded) avoids an effect round-trip and a visible flicker.
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) setCursor(startOfMonth(value || todayISO()));
  }

  const cells = useMemo(() => {
    const total = daysInMonth(cursor);
    // Monday-first offset
    const first = (weekdayIndex(cursor) + 6) % 7;
    const list: (string | null)[] = Array.from({ length: first }, () => null);
    for (let day = 1; day <= total; day++) {
      const d = fromISODate(cursor);
      list.push(toISODate(new Date(d.getFullYear(), d.getMonth(), day, 12)));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  const today = todayISO();

  return (
    <Sheet visible={visible} onClose={onClose} title={title} scroll={false}>
      <Row between style={{ marginBottom: 14 }}>
        <Pressable
          hitSlop={12}
          onPress={() => setCursor((prev) => addMonths(prev, -1))}
          accessibilityLabel="Bulan sebelumnya">
          <Icon sf="chevron.left" size={18} color={c.text} />
        </Pressable>
        <Txt variant="h3">{formatMonthYear(cursor)}</Txt>
        <Pressable
          hitSlop={12}
          onPress={() => setCursor((prev) => addMonths(prev, 1))}
          accessibilityLabel="Bulan berikutnya">
          <Icon sf="chevron.right" size={18} color={c.text} />
        </Pressable>
      </Row>

      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Txt variant="caption" color={c.textFaint}>
              {day}
            </Txt>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((iso, index) => {
          if (!iso) {
            return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          }
          const selected = iso === value;
          const isToday = iso === today;
          return (
            <Pressable
              key={iso}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(iso);
              }}
              style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? c.accent : 'transparent',
                  borderWidth: isToday && !selected ? 1 : 0,
                  borderColor: c.accent,
                }}>
                <Txt
                  variant="body"
                  weight={selected || isToday ? '600' : '400'}
                  color={selected ? c.onAccent : c.text}>
                  {Number(iso.slice(8, 10))}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Row gap={10} style={{ marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Hari ini"
            variant="secondary"
            size="sm"
            onPress={() => {
              onSelect(today);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Kemarin" variant="secondary" size="sm" onPress={() => onSelect(addDaysSafe(today, -1))} />
        </View>
      </Row>
    </Sheet>
  );
}

function addDaysSafe(iso: string, days: number) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/* ------------------------------------------------------------------ */
/* Confirm sheet                                                       */
/* ------------------------------------------------------------------ */

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  destructive = true,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const c = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} scroll={false}>
      {message ? (
        <Txt variant="body" color={c.textMuted}>
          {message}
        </Txt>
      ) : null}
      <Stack gap={10} style={{ marginTop: 18 }}>
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={() => {
            onConfirm();
            onClose();
          }}
        />
        <Button label={cancelLabel} variant="ghost" onPress={onClose} />
      </Stack>
    </Sheet>
  );
}

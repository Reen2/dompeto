import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { radius, spacing } from '@/lib/theme';

/* -------------------------------- Text -------------------------------- */

type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'label' | 'caption' | 'amount' | 'amountLarge';

export function Txt({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
  align,
  weight,
}: {
  children?: ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
  weight?: TextStyle['fontWeight'];
}) {
  const c = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      allowFontScaling
      style={[
        typography[variant],
        { color: color ?? c.text, textAlign: align },
        weight ? { fontWeight: weight } : null,
        style,
      ]}>
      {children}
    </Text>
  );
}

const typography = StyleSheet.create({
  display: { fontSize: 38, fontWeight: '700', letterSpacing: -1.2, lineHeight: 44 },
  h1: { fontSize: 27, fontWeight: '700', letterSpacing: -0.6, lineHeight: 33 },
  h2: { fontSize: 21, fontWeight: '600', letterSpacing: -0.4, lineHeight: 27 },
  h3: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 23 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  amount: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  amountLarge: {
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    lineHeight: 40,
  },
});

/* -------------------------------- Layout ------------------------------- */

export function Screen({
  children,
  scroll = true,
  padded = true,
  bottomInset = 110,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  bottomInset?: number;
  refreshControl?: React.ReactElement;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  if (!scroll) {
    return <View style={[styles.flex, { backgroundColor: c.bg }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: c.bg }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingHorizontal: padded ? 20 : 0,
        paddingTop: padded ? 8 : 0,
        paddingBottom: bottomInset + insets.bottom * 0.2,
      }}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Stack({ gap = 12, children, style }: { gap?: number; children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Row({
  children,
  between,
  gap = 10,
  style,
}: {
  children: ReactNode;
  between?: boolean;
  gap?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap },
        between ? { justifyContent: 'space-between' } : null,
        style,
      ]}>
      {children}
    </View>
  );
}

export function Divider({ inset = 0, vertical }: { inset?: number; vertical?: boolean }) {
  const c = useTheme();
  if (vertical) {
    return <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: c.border }} />;
  }
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: inset }} />;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}) {
  const c = useTheme();
  const content = (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          padding: padded ? 16 : 0,
        },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = useTheme();
  return (
    <Row between style={{ marginBottom: 10, marginTop: 22 }}>
      <Txt variant="label" color={c.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
        {title}
      </Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt variant="label" color={c.accent} weight="600">
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

/* -------------------------------- Buttons ------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  size = 'md',
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  size?: 'md' | 'sm' | 'lg';
}) {
  const c = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.accent, fg: c.onAccent, border: c.accent },
    secondary: { bg: 'transparent', fg: c.text, border: c.borderStrong },
    ghost: { bg: 'transparent', fg: c.accent, border: 'transparent' },
    danger: { bg: 'transparent', fg: c.expense, border: c.expense },
  };
  const p = palette[variant];
  const heights = { sm: 36, md: 48, lg: 56 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        {
          height: heights[size],
          borderRadius: size === 'sm' ? radius.sm : radius.md,
          backgroundColor: p.bg,
          borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0,
          borderColor: p.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 18,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Icon sf={icon} size={16} color={p.fg} weight="semibold" /> : null}
          <Text style={{ color: p.fg, fontSize: size === 'sm' ? 14 : 16, fontWeight: '600' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  sf,
  onPress,
  color,
  size = 20,
  accessibilityLabel,
  style,
}: {
  sf: string;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? sf}
      hitSlop={10}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, opacity: pressed ? 0.6 : 1 },
        style,
      ]}>
      <Icon sf={sf} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

export function FAB({ onPress, label = 'Catat' }: { onPress: () => void; label?: string }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom: 26,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        height: 54,
        borderRadius: radius.pill,
        backgroundColor: c.accent,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        opacity: pressed ? 0.9 : 1,
      })}>
      <Icon sf="plus" size={18} color={c.onAccent} weight="bold" />
      <Text style={{ color: c.onAccent, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

/* --------------------------------- Misc -------------------------------- */

export function Money({
  value,
  masked,
  size = 'amount',
  sign,
  color,
  currency,
}: {
  value: number;
  masked?: boolean;
  size?: 'amount' | 'amountLarge';
  sign?: boolean;
  color?: string;
  currency?: string;
}) {
  const c = useTheme();
  return (
    <Txt variant={size} color={color ?? c.text}>
      {formatMoney(value, { masked, sign, currency })}
    </Txt>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const c = useTheme();
  const tint = color ?? c.accent;
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: c.dark ? `${tint}22` : `${tint}18`,
      }}>
      <Txt variant="caption" color={tint} weight="600">
        {label}
      </Txt>
    </View>
  );
}

export function ProgressBar({
  value,
  color,
  height = 8,
  track,
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const c = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: track ?? c.surfaceAlt,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? c.accent,
        }}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: selected ? c.accent : c.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? c.accent : c.border,
      }}>
      {icon ? <Icon sf={icon} size={13} color={selected ? c.onAccent : c.textMuted} /> : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: selected ? c.onAccent : c.textMuted,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.surfaceAlt,
        borderRadius: radius.sm,
        padding: 3,
        gap: 3,
      }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: radius.sm - 2,
              alignItems: 'center',
              backgroundColor: active ? c.surface : 'transparent',
              borderWidth: active ? StyleSheet.hairlineWidth : 0,
              borderColor: c.border,
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? c.text : c.textMuted,
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24, gap: 8 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.surfaceAlt,
          marginBottom: 6,
        }}>
        <Icon sf={icon} size={24} color={c.textMuted} />
      </View>
      <Txt variant="h3" align="center">
        {title}
      </Txt>
      {description ? (
        <Txt variant="label" color={c.textMuted} align="center" style={{ maxWidth: 300 }}>
          {description}
        </Txt>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 12 }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
        </View>
      ) : null}
    </View>
  );
}

export function Input({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt variant="caption" color={c.textMuted}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={c.textFaint}
        {...props}
        style={[
          {
            backgroundColor: c.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: error ? c.expense : c.border,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 16,
            color: c.text,
          },
          style,
        ]}
      />
      {error ? (
        <Txt variant="caption" color={c.expense}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

export function Loading() {
  const c = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  valueColor,
  onPress,
  showChevron = true,
  right,
}: {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  right?: ReactNode;
}) {
  const c = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.surfaceAlt,
          }}>
          <Icon sf={icon} size={17} color={iconColor ?? c.textMuted} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body" weight="500" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={c.textMuted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant="amount" color={valueColor ?? c.text} style={{ fontSize: 15 }}>
          {value}
        </Txt>
      ) : null}
      {right}
      {onPress && showChevron ? <Icon sf="chevron.right" size={13} color={c.textFaint} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
      {content}
    </Pressable>
  );
}

export const uiStyles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: spacing(5) },
});

const styles = uiStyles;

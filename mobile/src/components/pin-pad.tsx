import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { Txt } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({
  title,
  subtitle,
  onComplete,
  onBiometric,
  errorTrigger = 0,
  length = 6,
  footer,
}: {
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  onBiometric?: () => void;
  errorTrigger?: number;
  length?: number;
  footer?: React.ReactNode;
}) {
  const c = useTheme();
  const [pin, setPin] = useState('');
  const [shake] = useState(() => new Animated.Value(0));
  const [lastError, setLastError] = useState(errorTrigger);

  // Clear the digits as soon as a new error arrives (guarded render-time update).
  if (errorTrigger !== lastError) {
    setLastError(errorTrigger);
    setPin('');
  }

  useEffect(() => {
    if (errorTrigger > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: -0.4, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: 0, duration: 80, useNativeDriver: true, easing: Easing.linear }),
      ]).start();
    }
  }, [errorTrigger, shake]);

  function press(key: string) {
    if (key === 'del') {
      Haptics.selectionAsync();
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (!key || pin.length >= length) return;
    Haptics.selectionAsync();
    const next = pin + key;
    setPin(next);
    if (next.length === length) {
      setTimeout(() => onComplete(next), 80);
    }
  }

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-12, 12] });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 34 }}>
        <Txt variant="h1" align="center">
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="label" color={c.textMuted} align="center" style={{ maxWidth: 280 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>

      <Animated.View style={{ flexDirection: 'row', gap: 14, transform: [{ translateX }], marginBottom: 46 }}>
        {Array.from({ length }).map((_, index) => {
          const filled = index < pin.length;
          return (
            <View
              key={index}
              style={{
                width: 13,
                height: 13,
                borderRadius: 7,
                backgroundColor: filled ? c.accent : 'transparent',
                borderWidth: filled ? 0 : 1.5,
                borderColor: c.borderStrong,
              }}
            />
          );
        })}
      </Animated.View>

      <View style={{ width: 288, flexDirection: 'row', flexWrap: 'wrap' }}>
        {KEYS.map((key, index) => {
          if (!key) {
            return (
              <View key={`blank-${index}`} style={{ width: 96, height: 74, alignItems: 'center', justifyContent: 'center' }}>
                {onBiometric && index === 9 ? (
                  <Pressable
                    accessibilityLabel="Buka dengan Face ID"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onBiometric();
                    }}
                    hitSlop={8}
                    style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sf="faceid" size={26} color={c.accent} />
                  </Pressable>
                ) : null}
              </View>
            );
          }
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Hapus' : key}
              onPress={() => press(key)}
              style={({ pressed }) => ({
                width: 96,
                height: 74,
                alignItems: 'center',
                justifyContent: 'center',
              })}>
              {({ pressed }) => (
                <View
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? c.surfaceAlt : c.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: c.border,
                  }}>
                  {key === 'del' ? (
                    <Icon sf="delete.left" size={20} color={c.text} />
                  ) : (
                    <Txt style={{ fontSize: 27, fontWeight: '400', letterSpacing: 0 }}>{key}</Txt>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {footer ? <View style={{ marginTop: 28 }}>{footer}</View> : null}
    </View>
  );
}

import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { StyleSheet, type ViewStyle } from 'react-native';

type IconProps = {
  sf: SFSymbol | string;
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: ViewStyle;
  fallback?: React.ReactNode;
};

/**
 * iOS-first icon. Uses SF Symbols on iOS and Material Symbols elsewhere.
 * Unknown names degrade to a neutral glyph instead of crashing.
 */
export function Icon({ sf, size = 20, color, weight = 'medium', style, fallback }: IconProps) {
  return (
    <SymbolView
      name={{ ios: sf as SFSymbol, android: 'circle', web: 'circle' } as SymbolViewProps['name']}
      size={size}
      tintColor={color}
      weight={weight}
      style={[styles.icon, { width: size, height: size }, style]}
      fallback={fallback ?? null}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

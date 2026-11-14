import { useColorScheme } from 'react-native';

import { Dark, Light, type ThemeColors } from '@/lib/theme';
import { useSettings } from '@/store/settings';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  const { settings } = useSettings();
  const mode = settings.theme === 'system' ? scheme : settings.theme;
  return mode === 'dark' ? Dark : Light;
}

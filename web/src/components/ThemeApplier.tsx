import { useEffect } from 'react';
import { useSettings } from '../store/settings';

export default function ThemeApplier() {
  const { settings } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);
  return null;
}

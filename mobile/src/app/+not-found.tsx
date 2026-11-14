import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Txt } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

export default function NotFound() {
  const c = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
      <Txt variant="h1" align="center">
        Halaman tidak ditemukan
      </Txt>
      <Txt variant="body" color={c.textMuted} align="center">
        Sepertinya kamu tersesat. Yuk kembali ke beranda.
      </Txt>
      <Button label="Ke Beranda" onPress={() => router.replace('/')} style={{ marginTop: 8 }} />
    </View>
  );
}

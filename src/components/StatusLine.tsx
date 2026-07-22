import { Linking, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';

// §5.11 durum satırı: 6pt amber nokta + 13pt/400 metin.
// Eyleme çağıran hal (izin kapalı) 44pt dokunma hedefi + Ayarlar derin bağlantısı.

export function StatusLine({ label, onPress }: { label: string; onPress?: () => void }) {
  const { colors } = useTheme();

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8, height: onPress ? 44 : 32 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warnFill }} />
      <Text style={{ fontSize: 13, fontWeight: '400', color: colors.textSecondary, flexShrink: 1 }}>{label}</Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

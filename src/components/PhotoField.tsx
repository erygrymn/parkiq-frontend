import { SymbolView } from 'expo-symbols';
import { Image, Pressable, Text, View } from 'react-native';
import { t } from '../localization';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { Overline } from './Typography';

// §7.3 spot fotoğrafı. Foto yokken 44pt eylem satırı, varken 88pt önizleme +
// yeniden çek / kaldır. Kapalı otoparkta arabayı bulmanın asıl aracı budur.

export function PhotoField({
  uri,
  onCapture,
  onRemove,
}: {
  uri: string | null;
  onCapture: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();

  if (!uri) {
    return (
      <View style={{ gap: spacing.s8 }}>
        <Overline>{t('photo')}</Overline>
        <Pressable
          accessibilityRole="button"
          onPress={onCapture}
          style={({ pressed }) => ({
            height: 44,
            borderRadius: radius.r12,
            backgroundColor: pressed ? colors.insetPressed : colors.inset,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.s8,
            paddingHorizontal: spacing.s12,
          })}
        >
          <SymbolView name="camera" size={17} tintColor={colors.ink} weight="regular" />
          <Text style={{ fontSize: 15, color: colors.ink }}>{t('addPhoto')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.s8 }}>
      <Overline>{t('photo')}</Overline>
      <View style={{ flexDirection: 'row', gap: spacing.s12, alignItems: 'center' }}>
        <Image
          source={{ uri }}
          style={{ width: 88, height: 88, borderRadius: radius.r16, backgroundColor: colors.inset }}
          accessibilityIgnoresInvertColors
        />
        <View style={{ gap: spacing.s8 }}>
          <Pressable accessibilityRole="button" onPress={onCapture} hitSlop={8}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('retakePhoto')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8}>
            <Text style={{ fontSize: 15, color: colors.textSecondary }}>{t('removePhoto')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

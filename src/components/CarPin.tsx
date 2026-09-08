import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { lightColors, radius, shadow } from '../theme/tokens';

/**
 * design.md §4 araba pini = marka işareti: app ikonunun kendisi (mürekkep kare + beyaz P + yeşil
 * nokta), 36pt, 2pt beyaz ring, shadow/1, altta uç. Tema bağımsız: ikon = pin = LA glyph'i tek DNA.
 * Haritadaki gerçek pin ve pin bırakma katmanındaki artı işareti aynı bileşendir.
 */
export function CarPin() {
  const { colors, scheme } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.r12,
          borderCurve: 'continuous',
          backgroundColor: colors.la,
          borderWidth: 2,
          borderColor: lightColors.card,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: shadow.s1.ambient.color,
          shadowOffset: { width: 0, height: shadow.s1.ambient.offsetY },
          shadowRadius: shadow.s1.ambient.blur,
          shadowOpacity: scheme === 'dark' ? 0 : 1,
        }}
      >
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/brand/mark.png')}
          style={{ width: 24, height: 24 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <View
        style={{
          width: 10,
          height: 10,
          marginTop: -5,
          borderRadius: 2,
          backgroundColor: colors.la,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

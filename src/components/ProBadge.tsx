import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// Premium işareti: altın taç. Kilitli her yüzeyde AYNI işaret durur — kullanıcı ikinci
// gördüğünde ne demek olduğunu bilir. Yalnız `!isPremium` iken çizilir; satın alma
// sonrası tüm çağrı yerleri bunu düşürür ve özellik olduğu gibi açılır.
//
// Renk `proFill` (altın), amberden ayrı: design.md §2'de amber yalnız gerçek fiyat artışına
// bağlıdır. Emoji yok (§5.13: SF Symbols).

/** Metnin/ikonun yanına giren satır içi taç. */
export function ProBadge({ size = 12 }: { size?: number }) {
  const { colors } = useTheme();
  return <SymbolView name="crown.fill" size={size} tintColor={colors.proFill} weight="semibold" />;
}

/**
 * Kare bir kontrolün (cam ikon buton, çip) sağ üst köşesine oturan rozet.
 * Zemin kartın rengi: taç ikonun üstüne binse de okunur kalır.
 */
export function ProCorner({ size = 16 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -spacing.s4,
        right: -spacing.s4,
        width: size,
        height: size,
        borderRadius: radius.rFull,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ProBadge size={size - 6} />
    </View>
  );
}

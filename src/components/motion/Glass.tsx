import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { glass } from '../../theme/tokens';

// design.md §4 cam: yalnız harita ya da kamera üstünde yüzen öğelerde (kare ikon butonlar,
// chip'ler, arama, AR HUD kartı). Ekranda en fazla 3, hepsi statik; blur yarıçapı animasyona
// girmez. Sheet ve kartlar asla cam değildir. Android ve desteksiz durumda düz dolgu.

export function Glass({
  radius,
  tone = 'auto',
  style,
  children,
}: {
  radius: number;
  /** Kamera gibi her zaman koyu zeminlerde tema ne olursa olsun koyu reçete. */
  tone?: 'auto' | 'dark';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { scheme } = useTheme();
  const dark = tone === 'dark' || scheme === 'dark';
  const recipe = dark ? glass.dark : glass.light;
  const blurs = Platform.OS === 'ios';

  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: blurs ? 'transparent' : dark ? glass.fallbackDark : glass.fallbackLight,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: recipe.innerHairline,
        },
        style,
      ]}
    >
      {blurs && (
        <>
          <BlurView intensity={recipe.blurIntensity} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: recipe.bg }]} />
        </>
      )}
      {children}
    </View>
  );
}

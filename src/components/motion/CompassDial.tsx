import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { springTo, useReducedMotion } from '../../theme/motion';

// design.md §5 pusula kadranı: 96pt hairline halka, ibre = mürekkep NOKTA (İlke 8). Nokta, halka
// üzerinde arabanın göreli yönüne yürür; ≤20 m'de merkeze iner ve yeşil olur ("buradasın").
// Heading ve bearing shared value'dur: sensör olayları React re-render üretmez.

const SIZE = 96;
const DOT = 8;
const RING = SIZE / 2 - DOT / 2 - 2;

export function CompassDial({
  bearing,
  heading,
  accuracy,
  near,
}: {
  /** Kullanıcıdan arabaya yön (kuzeyden saat yönünde derece). */
  bearing: SharedValue<number>;
  /** Cihazın baktığı yön (derece, sürekli — sarmalanmamış). */
  heading: SharedValue<number>;
  /** iOS pusula doğruluğu 0–3; ≤1 güvenilmez → nokta soluklaşır. */
  accuracy: SharedValue<number>;
  near: boolean;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const nearness = useSharedValue(near ? 1 : 0);

  useEffect(() => {
    nearness.value = springTo(near ? 1 : 0, reduced);
  }, [near, reduced, nearness]);

  const dot = useAnimatedStyle(() => {
    const rel = ((bearing.value - heading.value) * Math.PI) / 180;
    const r = RING * (1 - nearness.value);
    const shaky = accuracy.value <= 1 && nearness.value < 0.5;
    return {
      opacity: shaky ? 0.45 : 1,
      backgroundColor: interpolateColor(nearness.value, [0, 1], [colors.ink, colors.accentFill]),
      transform: [{ translateX: r * Math.sin(rel) }, { translateY: -r * Math.cos(rel) }, { scale: 1 + nearness.value * 0.5 }],
    };
  }, [colors.ink, colors.accentFill]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 1.5,
        borderColor: colors.gridline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Üst işaret: cihazın baktığı yön (sabit). */}
      <View
        style={{
          position: 'absolute',
          top: -1.5,
          width: 2,
          height: 8,
          borderRadius: 1,
          backgroundColor: colors.textTertiary,
        }}
      />
      <Animated.View style={[{ width: DOT, height: DOT, borderRadius: DOT / 2 }, dot]} />
    </View>
  );
}

import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PRESS_MS, springTo, useReducedMotion } from '../../theme/motion';

// design.md §3: her dokunulabilir basılınca 120 ms'de 0.97'ye iner, bırakınca SPRING ile döner.
// Dış Pressable yalnız dokunmayı yakalar ve yerleşimi taşır; görsel stil iç Animated.View'dadır,
// böylece pressed zemin rengi ile ölçek aynı yüzeyde birleşir.

type PressStyle = StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);

export function PressScale({
  style,
  containerStyle,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: PressStyle;
  containerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(event) => {
        if (!reduced) scale.value = withTiming(0.97, { duration: PRESS_MS });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = springTo(1, reduced);
        onPressOut?.(event);
      }}
    >
      {({ pressed }) => (
        <Animated.View style={[typeof style === 'function' ? style(pressed) : style, animated]}>{children}</Animated.View>
      )}
    </Pressable>
  );
}

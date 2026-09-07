import { Easing, useReducedMotion, withSpring, withTiming, type WithSpringConfig } from 'react-native-reanimated';

// design.md §3 — hareket token'ları. Tek genel spring + nokta damgası spring'i;
// üçüncü bir spring yazılmaz. Sabit süreler yalnız crossfade ve layout içindir.

export const SPRING = { damping: 18, stiffness: 180, mass: 1 } as const satisfies WithSpringConfig;
/** Nokta damgası: response ≈ 0.35 s, ~%15 overshoot. */
export const DOT_SPRING = { damping: 12, stiffness: 260, mass: 0.8 } as const satisfies WithSpringConfig;

export const CROSSFADE_MS = 200;
export const LAYOUT_MS = 300;
export const PRESS_MS = 120;
/** Count-up tek sayısal istisnadır: spring değil, easeOut. */
export const COUNT_UP_MS = 800;
export const countUpEasing = Easing.out(Easing.cubic);

export { useReducedMotion };

/** Reduce Motion açıkken spring yerine 200 ms crossfade (design.md §3). */
export function springTo(value: number, reduced: boolean, config: WithSpringConfig = SPRING) {
  'worklet';
  return reduced ? withTiming(value, { duration: CROSSFADE_MS }) : withSpring(value, config);
}

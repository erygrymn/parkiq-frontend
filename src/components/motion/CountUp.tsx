import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COUNT_UP_MS, countUpEasing, useReducedMotion } from '../../theme/motion';

// design.md §3 kutlama count-up'ı. Sayı UI thread'de yazılır (useAnimatedProps → TextInput);
// JS yalnız başta biçim parçalarını çıkarır ve detent/bitiş callback'lerini alır.
// Sayaç son değerin genişliğinde sağa hizalı akar: rakam sayısı değişince layout zıplamaz.

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const DETENTS = [0.34, 0.67, 1];

function splitFormat(format: (n: number) => string): { prefix: string; suffix: string; groupSep: string } {
  const zero = format(0);
  const first = zero.search(/\d/);
  const lastMatch = zero.match(/\d(?!.*\d)/);
  const last = lastMatch?.index ?? -1;
  const thousand = format(1000).match(/\d([^\d])\d{3}/);
  return {
    prefix: first < 0 ? '' : zero.slice(0, first),
    suffix: last < 0 ? '' : zero.slice(last + 1),
    groupSep: thousand ? thousand[1] : '',
  };
}

function group(digits: string, separator: string): string {
  'worklet';
  if (!separator || digits.length <= 3) return digits;
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += separator;
  }
  return out;
}

export function CountUp({
  value,
  format,
  style,
  durationMs = COUNT_UP_MS,
  onTick,
  onDone,
}: {
  value: number;
  /** Biçimlendirici (para/metre). Ondalık taşıyorsa yalnız son karede görünür. */
  format: (n: number) => string;
  style: StyleProp<TextStyle>;
  durationMs?: number;
  /** En fazla 3 detent (design.md §3 haptik haritası). */
  onTick?: () => void;
  onDone?: () => void;
}) {
  const reduced = useReducedMotion();
  const finalText = useMemo(() => format(value), [format, value]);
  const parts = useMemo(() => splitFormat(format), [format]);
  const target = Math.round(Math.abs(value));
  const [measured, setMeasured] = useState(false);
  /**
   * Animasyon bitince sayı DÜZ metne devredilir.
   *
   * Animasyonlu TextInput'un son değeri yalnız Reanimated bir kare daha yazarsa
   * doğru kalıyor; bileşen yeniden bağlandığında (paywall'da plan listesi gelince
   * oluyordu) native alan `defaultValue`'suna, yani "₺0"a düşüyordu — sayaç yukarı
   * sayıp sonunda sıfıra iniyordu. Düz metin bu sınıfın tamamını kapatır.
   */
  const [settled, setSettled] = useState(false);
  const progress = useSharedValue(0);

  const tickRef = useRef(onTick);
  tickRef.current = onTick;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const tick = useCallback(() => tickRef.current?.(), []);
  const done = useCallback(() => {
    setSettled(true);
    doneRef.current?.();
  }, []);

  useEffect(() => {
    if (!measured) return;
    setSettled(false);
    if (reduced) {
      progress.value = 1;
      done();
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: durationMs, easing: countUpEasing }, (finished) => {
      'worklet';
      if (finished) runOnJS(done)();
    });
    return () => cancelAnimation(progress);
  }, [measured, reduced, durationMs, target, progress, done]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous === null) return;
      for (const detent of DETENTS) {
        if (previous < detent && current >= detent) runOnJS(tick)();
      }
    },
    [tick],
  );

  const animatedProps = useAnimatedProps(() => {
    const p = progress.value;
    // 'text' TextInput'un beyan edilmiş prop'u değil (whitelist ile native'e iner); tip burada geçilir.
    if (p >= 1) return { text: finalText } as unknown as Partial<TextInputProps>;
    const digits = String(Math.round(target * p));
    return { text: parts.prefix + group(digits, parts.groupSep) + parts.suffix } as unknown as Partial<TextInputProps>;
  });

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      {/* Son değer akışta ama görünmez: kutunun boyu buradan gelir, sayaç üstüne biner. */}
      <Text style={[style, { opacity: 0 }]} onLayout={() => setMeasured(true)} allowFontScaling={false}>
        {finalText}
      </Text>
      {settled && (
        <Text
          style={[style, { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, textAlign: 'right' }]}
          allowFontScaling={false}
        >
          {finalText}
        </Text>
      )}
      {measured && !settled && (
        <AnimatedTextInput
          editable={false}
          allowFontScaling={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          defaultValue={reduced ? finalText : `${parts.prefix}0${parts.suffix}`}
          animatedProps={animatedProps}
          style={[
            style,
            { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, textAlign: 'right', padding: 0, margin: 0 },
          ]}
        />
      )}
    </View>
  );
}

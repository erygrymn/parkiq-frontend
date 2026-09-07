import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, type NativeSyntheticEvent, type StyleProp, type TextLayoutEventData, type TextStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { upper } from '../../localization';
import { useTheme } from '../../theme';
import { CROSSFADE_MS, DOT_SPRING, useReducedMotion } from '../../theme/motion';
import { typeScale } from '../../theme/tokens';

// design.md §3 damga sekansı: metin 150 ms fade/rise → 150 ms sonra nokta DOT_SPRING ile iner.
// İlke 8: nokta uygulamanın tek "bespoke" hareket varlığıdır; burada ve CelebrationHero'da yaşar.

const TEXT_MS = 150;
const DOT_DELAY_MS = 150;
/** SF Pro cap height / font size — onTextLayout'tan gerçek punto geri türetilir (adjustsFontSizeToFit). */
const CAP_HEIGHT_RATIO = 0.705;

/**
 * İmza noktası glyph'i. `land` true olunca (opsiyonel gecikmeyle) 0 → 1 spring; inişte `onLanded`.
 * Reduce Motion'da 200 ms crossfade. `instant` ile animasyonsuz (statik yüzeyler).
 */
export function Dot({
  color,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  land,
  delayMs = 0,
  instant = false,
  onLanded,
  style,
}: {
  color: string;
  fontSize: number;
  lineHeight?: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
  land: boolean;
  delayMs?: number;
  instant?: boolean;
  onLanded?: () => void;
  style?: StyleProp<TextStyle>;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(instant ? 1 : 0);
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  const landed = useCallback(() => landedRef.current?.(), []);

  useEffect(() => {
    if (!land || instant) return;
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(landed)();
    };
    scale.value = reduced
      ? withTiming(1, { duration: CROSSFADE_MS }, finish)
      : withDelay(delayMs, withSpring(1, DOT_SPRING, finish));
  }, [land, instant, reduced, delayMs, scale, landed]);

  const animated = useAnimatedStyle(() => ({
    opacity: reduced ? scale.value : 1,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      allowFontScaling={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        { fontSize, lineHeight, fontWeight, letterSpacing, color, transformOrigin: '50% 78%' },
        style,
        animated,
      ]}
    >
      .
    </Animated.Text>
  );
}

/**
 * Display damga: `PARKED.` / `SAVED ₺X.` / `PARKED 1H 45M.` / `PRO.`
 * Inline nokta yalnız yer tutar (şeffaf); görünen nokta son satırın ucuna onTextLayout ile konur
 * ve ayrı animasyon alır. Nokta rengi çağıran belirler: whitelist yeşil, süre damgası ve yer adı ink.
 */
export function Stamp({
  text,
  dotColor,
  size = 'M',
  animate = true,
  onLanded,
}: {
  text: string;
  dotColor: string;
  size?: 'S' | 'M';
  /** false: statik (liste/detay gibi hareket bütçesi olmayan yerler). */
  animate?: boolean;
  onLanded?: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const token = size === 'M' ? typeScale.displayM : typeScale.displayS;
  const [line, setLine] = useState<{ x: number; y: number; width: number; height: number; fontSize: number } | null>(null);
  const [dotWidth, setDotWidth] = useState<number | null>(null);
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withTiming(1, { duration: reduced ? CROSSFADE_MS : TEXT_MS });
  }, [animate, reduced, progress]);

  const textAnimated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  const onTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = event.nativeEvent.lines;
    const last = lines[lines.length - 1];
    if (!last) return;
    const capHeight = (last as { capHeight?: number }).capHeight;
    const fontSize = capHeight && capHeight > 0 ? Math.round((capHeight / CAP_HEIGHT_RATIO) * 2) / 2 : token.fontSize;
    setLine({ x: last.x, y: last.y, width: last.width, height: last.height, fontSize });
  };

  const glyphStyle: TextStyle = {
    fontSize: line?.fontSize ?? token.fontSize,
    lineHeight: line?.height,
    fontWeight: token.fontWeight,
    letterSpacing: token.letterSpacing,
  };

  return (
    <View>
      <Animated.Text
        accessibilityLabel={`${upper(text)}.`}
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        onTextLayout={onTextLayout}
        style={[
          {
            fontSize: token.fontSize,
            fontWeight: token.fontWeight,
            letterSpacing: token.letterSpacing,
            color: colors.ink,
          },
          textAnimated,
        ]}
      >
        {upper(text)}
        <Text style={{ color: 'transparent' }}>.</Text>
      </Animated.Text>

      {line !== null && (
        <Text
          style={[glyphStyle, { position: 'absolute', opacity: 0 }]}
          allowFontScaling={false}
          onLayout={(event) => setDotWidth(event.nativeEvent.layout.width)}
        >
          .
        </Text>
      )}

      {line !== null && dotWidth !== null && (
        <Dot
          color={dotColor}
          fontSize={glyphStyle.fontSize as number}
          lineHeight={line.height}
          fontWeight={token.fontWeight}
          letterSpacing={token.letterSpacing}
          land
          instant={!animate}
          delayMs={DOT_DELAY_MS}
          onLanded={onLanded}
          style={{ position: 'absolute', left: line.x + line.width - dotWidth, top: line.y }}
        />
      )}
    </View>
  );
}

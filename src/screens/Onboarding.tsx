import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { t, upper } from '../localization';
import { useTheme } from '../theme';
import { CROSSFADE_MS, DOT_SPRING, useReducedMotion } from '../theme/motion';
import { spacing } from '../theme/tokens';

// design.md §7.1 — 3 tipografik manifesto posteri (poster katmanı).
// POSTER KATMANI: krem ve tam yüzeyli siyah istisnaları YALNIZ burada geçerli.
// App Store screenshot seti bu 3 kareden üretilir. Özellik turu YOK.
//
// Scene sheet: hero = imza noktası. Tek nokta üç poster boyunca kelimeden kelimeye yürür;
// konumu, rengi ve boyu pager'ın scroll offset'inden türer (jest sürüyor, kesilebilir).
// Zemin rengi de aynı offset'ten (krem → siyah → krem). Girişte başlık 200 ms fade/rise,
// 150 ms sonra nokta DOT_SPRING ile iner. Reduce Motion: nokta yürümez, her poster kendi
// noktasını taşır; zemin crossfade.

const CREAM = '#F5F2EB';
const CREAM_DARK = '#131315';
const POSTER_BLACK = '#141416';
const DOT_ON_LIGHT = '#0B7A3E'; // krem üstünde 4.9:1
const DOT_ON_DARK = '#2FE07A';
const CAP_HEIGHT_RATIO = 0.705;
const TITLE_MS = 200;
const DOT_DELAY_MS = 150;

interface DotSlot {
  x: number;
  y: number;
  lineHeight: number;
  fontSize: number;
}

interface PosterProps {
  index: number;
  width: number;
  title: string;
  titleSize: number;
  titleColor: string;
  dotColor: string;
  body: string;
  bodyColor: string;
  bottomInset: number;
  /** Reduce Motion: nokta inline ve renkli; gezen overlay yok. */
  inlineDot: boolean;
  onSlot: (index: number, slot: DotSlot) => void;
}

function Poster({
  index,
  width,
  title,
  titleSize,
  titleColor,
  dotColor,
  body,
  bodyColor,
  bottomInset,
  inlineDot,
  onSlot,
}: PosterProps) {
  const textRef = useRef<Text>(null);
  const [line, setLine] = useState<{ x: number; y: number; width: number; height: number; fontSize: number } | null>(null);
  const [dotWidth, setDotWidth] = useState<number | null>(null);

  const onTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = event.nativeEvent.lines;
    const last = lines[lines.length - 1];
    if (!last) return;
    const capHeight = (last as { capHeight?: number }).capHeight;
    const fontSize = capHeight && capHeight > 0 ? capHeight / CAP_HEIGHT_RATIO : titleSize;
    setLine({ x: last.x, y: last.y, width: last.width, height: last.height, fontSize });
  };

  // Noktanın yuvası: metnin pencere konumu (sayfa ofseti düşülmüş) + son satırın ucu.
  // Giriş yükselmesi (translateY 12 → 0) bitmeden ölçülürse yuva 12pt yukarıda kalır; beklenir.
  useEffect(() => {
    if (!line || dotWidth === null || inlineDot) return;
    const id = setTimeout(() => {
      textRef.current?.measureInWindow((x, y) => {
        onSlot(index, {
          x: x - index * width + line.x + line.width - dotWidth,
          y: y + line.y,
          lineHeight: line.height,
          fontSize: line.fontSize,
        });
      });
    }, TITLE_MS + 40);
    return () => clearTimeout(id);
  }, [line, dotWidth, inlineDot, index, width, onSlot]);

  const lineHeight = titleSize * 1.16;

  return (
    <View
      style={{
        width,
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.s24,
        paddingBottom: bottomInset,
      }}
    >
      <View style={{ gap: spacing.s16 }}>
        <Text
          ref={textRef}
          accessibilityLabel={`${upper(title)}.`}
          onTextLayout={onTextLayout}
          style={{
            fontSize: titleSize,
            // Türkçe İ/Ğ gibi harflerin üstü kırpılmasın diye ascender payı bırakılır
            lineHeight,
            fontWeight: '900',
            letterSpacing: titleSize * -0.03,
            color: titleColor,
          }}
          allowFontScaling={false}
        >
          {upper(title)}
          {/* Inline nokta yalnız yer tutar; gezen nokta overlay'de. Reduce Motion'da renkli kalır. */}
          <Text style={{ color: inlineDot ? dotColor : 'transparent' }}>.</Text>
        </Text>
        {line !== null && dotWidth === null && (
          <Text
            allowFontScaling={false}
            onLayout={(event) => setDotWidth(event.nativeEvent.layout.width)}
            style={{
              position: 'absolute',
              opacity: 0,
              fontSize: line.fontSize,
              lineHeight: line.height,
              fontWeight: '900',
              letterSpacing: titleSize * -0.03,
            }}
          >
            .
          </Text>
        )}
        <Text
          style={{ fontSize: 17, lineHeight: 25, fontWeight: '400', color: bodyColor, maxWidth: 460 }}
          maxFontSizeMultiplier={1.4}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width } = Dimensions.get('window');
  const [page, setPage] = useState(0);
  const scrollX = useSharedValue(0);
  const titleProgress = useSharedValue(0);
  const dotScale = useSharedValue(0);
  const [slots, setSlots] = useState<Record<number, DotSlot>>({});
  const [slotTimeout, setSlotTimeout] = useState(false);

  const lightBg = scheme === 'dark' ? CREAM_DARK : CREAM;
  const lightInk = scheme === 'dark' ? '#F0F0F2' : colors.ink;
  const lightDot = scheme === 'dark' ? DOT_ON_DARK : DOT_ON_LIGHT;
  const bodyOnLight = scheme === 'dark' ? '#9B9BA4' : '#5A5A64';

  const sizes = [Math.min(84, width * 0.19), Math.min(66, width * 0.155), Math.min(72, width * 0.165)];
  const dotColors = [lightDot, DOT_ON_DARK, lightDot];
  const backgrounds = [lightBg, POSTER_BLACK, lightBg];

  // Giriş sekansı: başlık 200 ms fade/rise, nokta 150 ms sonra DOT_SPRING (§3).
  useEffect(() => {
    if (reduced) {
      titleProgress.value = withTiming(1, { duration: CROSSFADE_MS });
      dotScale.value = withTiming(1, { duration: CROSSFADE_MS });
      return;
    }
    titleProgress.value = withTiming(1, { duration: TITLE_MS });
    dotScale.value = withDelay(TITLE_MS + DOT_DELAY_MS, withSpring(1, DOT_SPRING));
  }, [reduced, titleProgress, dotScale]);

  // Yuvalar ölçülemezse (beklenmedik durum) nokta inline'a düşer; 600 ms yeter.
  useEffect(() => {
    const id = setTimeout(() => setSlotTimeout(true), 600);
    return () => clearTimeout(id);
  }, []);

  const onSlot = useCallback((index: number, slot: DotSlot) => {
    setSlots((current) => (current[index] ? current : { ...current, [index]: slot }));
  }, []);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const requestLocation = () => {
    void Location.requestForegroundPermissionsAsync().finally(onDone);
  };

  const ready = slots[0] !== undefined;
  const inlineDot = reduced || (slotTimeout && !ready);
  const stops = [0, width, width * 2];

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollX.value, stops, backgrounds),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: (1 - titleProgress.value) * 12 }],
  }));

  // Gezen nokta: konum ve boy yuvalar arasında scroll offset'iyle interpolasyon. Sayfa ölçeği
  // SOL ÜST köşe etrafında (yuva = glyph kutusunun sol üstü), iniş zıplaması ayrı katmanda glyph
  // merkezinde: iki farklı origin tek transformda ifade edilemez, o yüzden iç içe iki view.
  // (Tek katmanda merkez origin, 2. ve 3. sayfada noktayı sağa-aşağı kaydırıyordu.)
  // Henüz ölçülmemiş yuva 0. sayfanınkine düşer; nokta ilk yuva gelir gelmez görünür.
  const first = slots[0];
  const baseFont = first?.fontSize ?? sizes[0];
  const dotFrame = useAnimatedStyle(() => {
    if (!first) return { opacity: 0 };
    const s1 = slots[1] ?? first;
    const s2 = slots[2] ?? first;
    return {
      opacity: 1,
      transform: [
        { translateX: interpolate(scrollX.value, stops, [first.x, s1.x, s2.x], 'clamp') },
        { translateY: interpolate(scrollX.value, stops, [first.y, s1.y, s2.y], 'clamp') },
        { scale: interpolate(scrollX.value, stops, [1, s1.fontSize / baseFont, s2.fontSize / baseFont], 'clamp') },
      ],
    };
  }, [first, slots, baseFont]);
  const dotGlyph = useAnimatedStyle(
    () => ({
      color: interpolateColor(scrollX.value, stops, dotColors),
      transform: [{ scale: dotScale.value }],
    }),
    [dotColors],
  );

  const bottomInsetShort = insets.bottom + 72;
  const bottomInsetTall = insets.bottom + 160;
  const skipColor = page === 1 ? '#8A8A93' : lightInk;

  return (
    <Animated.View style={[{ flex: 1 }, backgroundStyle]}>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
      >
        <Animated.View style={[{ flexDirection: 'row' }, contentStyle]}>
          <Poster
            index={0}
            width={width}
            title={t('onbTitle1')}
            titleSize={sizes[0]}
            titleColor={lightInk}
            dotColor={dotColors[0]}
            body={t('onbBody1')}
            bodyColor={bodyOnLight}
            bottomInset={bottomInsetShort}
            inlineDot={inlineDot}
            onSlot={onSlot}
          />
          {/* S2 — her iki temada siyah; İlke 6'nın poster istisnası */}
          <Poster
            index={1}
            width={width}
            title={t('onbTitle2')}
            titleSize={sizes[1]}
            titleColor="#FFFFFF"
            dotColor={dotColors[1]}
            body={t('onbBody2')}
            bodyColor="#9B9BA4"
            bottomInset={bottomInsetShort}
            inlineDot={inlineDot}
            onSlot={onSlot}
          />
          <Poster
            index={2}
            width={width}
            title={t('onbTitle3')}
            titleSize={sizes[2]}
            titleColor={lightInk}
            dotColor={dotColors[2]}
            body={t('onbBody3')}
            bodyColor={bodyOnLight}
            bottomInset={bottomInsetTall}
            inlineDot={inlineDot}
            onSlot={onSlot}
          />
        </Animated.View>
      </Animated.ScrollView>

      {/* Gezen imza noktası (İlke 8): pager'ın üstünde, jestle yürür. */}
      {!inlineDot && first && (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, top: 0, transformOrigin: 'top left' }, dotFrame]}
        >
          <Animated.Text
            allowFontScaling={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              {
                fontSize: baseFont,
                lineHeight: first.lineHeight,
                fontWeight: '900',
                letterSpacing: sizes[0] * -0.03,
                transformOrigin: '50% 78%',
              },
              dotGlyph,
            ]}
          >
            .
          </Animated.Text>
        </Animated.View>
      )}

      {/* Skip — sağ üst text buton */}
      {page < 2 && (
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          hitSlop={12}
          style={{ position: 'absolute', top: insets.top + spacing.s12, right: spacing.s20 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: skipColor }}>{t('skip')}</Text>
        </Pressable>
      )}

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + spacing.s20,
          paddingHorizontal: spacing.s24,
          gap: spacing.s20,
        }}
      >
        {/* S3: bu ekranın kendisi pre-prompt'tur — ayrı açıklama kartı yok (§7.1) */}
        {page === 2 && (
          <Animated.View entering={FadeIn.duration(CROSSFADE_MS)} style={{ gap: spacing.s8 }}>
            <PrimaryCta label={t('enableLocation')} onPress={requestLocation} />
            <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={{ fontSize: 15, color: scheme === 'dark' ? '#9B9BA4' : '#6E6E78' }}>{t('notNow')}</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.s8, justifyContent: 'center' }}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: page === 1 ? '#FFFFFF' : lightInk,
                opacity: index === page ? 1 : 0.3,
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

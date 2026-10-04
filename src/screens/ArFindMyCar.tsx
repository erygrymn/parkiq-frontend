import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  isArAvailable,
  ParkiqArView,
  type ArCar,
  type ArStatus,
  type ArTargetEvent,
  type ArUserFix,
} from '../../modules/parkiq-ar';
import { PrimaryCta } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { Glass } from '../components/motion/Glass';
import { PhotoThumb } from '../components/motion/PhotoViewer';
import { PressScale } from '../components/motion/PressScale';
import { formatDistance } from '../lib/geo';
import { hapticTick } from '../lib/haptics';
import { getLocale, t, upper } from '../localization';
import type { ArNotice } from '../state/uiStore';
import { SPRING } from '../theme/motion';
import { darkColors, glass, lightColors, radius, spacing, typeScale } from '../theme/tokens';

// design.md §7.7 HUD. Sahne RealityKit'te yaşar; burası yalnız okunabilir katman: cam kapatma
// karesi, cam mesafe kartı, koyu yüzey CTA'sı ve hedef ekran dışındayken kenar göstergesi.
// Kamera koyu yüzey ailesidir: token'lar tema bağımsız dark değerleridir.
//
// Giriş (§7.7): kamera ilk kare gelene kadar görünmez; altta harita kararır ama görünür kalır,
// kamera onun üstüne açılır. Eskiden ekran önce simsiyah oluyordu.
//
// Yön: hedef ekrandaysa "işarete yürü"; değilse hangi yana dönüleceği SÖYLENİR. Eskiden yalnız
// ekran kenarında 10 pt'lik bir nokta vardı ve arkada kalan hedef fark edilmiyordu.

export { isArAvailable };

/** Haritanın kamera açılırken ne kadar karardığı (§7.7: harita 1 → 0.6). */
const MAP_DIM = 0.4;
const EDGE_INSET = 20;
const EDGE_DOT = 10;
/** Kapatma karesinin altından başlar: gösterge düğmenin üstüne binmesin. */
const EDGE_TOP_RESERVE = 72;
/** Hedef bu açının içindeyse "önde" sayılır; arkasına düşerse "arkana dön". */
const AHEAD_DEG = 30;
const BEHIND_DEG = 135;

type Guidance = 'ahead' | 'left' | 'right' | 'behind' | 'raise';

function guidanceOf(event: ArTargetEvent): Guidance {
  if (event.onScreen) return 'ahead';
  const angle = event.relativeDeg;
  if (Math.abs(angle) >= BEHIND_DEG) return 'behind';
  // Önde ama kadrajın üstünde: telefon yere bakıyor.
  if (Math.abs(angle) <= AHEAD_DEG) return event.y < 0 ? 'raise' : 'ahead';
  return angle > 0 ? 'right' : 'left';
}

function statusLine(status: ArStatus, guidance: Guidance | null, weakGps: boolean, hasTarget: boolean): string {
  if (status === 'limited') return t('arLimited');
  if (status !== 'ready' && status !== 'near') return t('arInitializing');
  // İlk GPS düzeltmesi gelene kadar sahnede işaret yok: "işarete yürü" demek yanlıştı.
  if (!hasTarget) return t('locating');
  switch (guidance) {
    case 'left':
      return t('arTurnLeft');
    case 'right':
      return t('arTurnRight');
    case 'behind':
      return t('arTurnAround');
    case 'raise':
      return t('arRaisePhone');
    default:
      // Yakında yerde belirsizlik halkası var: cümle ona işaret eder.
      if (status === 'near') return t('arLookInCircle');
      return weakGps ? t('arWeakGps') : t('arHint');
  }
}

export function ArFindMyCar({
  car,
  user,
  gpsDistanceM,
  weakGps,
  placeName,
  floor,
  photoUri,
  onClose,
  onFound,
  onUnavailable,
}: {
  car: ArCar;
  user: ArUserFix | null;
  /** AR hedefi oturana kadar gösterilen GPS mesafesi. */
  gpsDistanceM: number | null;
  /** Canlı GPS doğruluğu kötü: işaret birkaç metre kayık olabilir, söylenir. */
  weakGps: boolean;
  placeName: string | null;
  floor: string | null;
  photoUri: string | null;
  onClose: () => void;
  onFound: () => void;
  /** AR bu cihazda/bu an çalışamıyor: haritaya dönülür, sebep panelde söylenir. */
  onUnavailable: (reason: ArNotice) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const locale = getLocale();
  const [status, setStatus] = useState<ArStatus>('initializing');
  const [coaching, setCoaching] = useState(false);
  // Görünen rakam ve yön cümlesi: 6 Hz olay React'e yalnız GÖRÜNEN değer değişince iner (§3).
  const [reading, setReading] = useState<{ meters: number; guidance: Guidance } | null>(null);
  const nearFired = useRef(false);
  const unavailableSent = useRef(false);

  // Hedef izdüşümü shared value'da: kenar göstergesi React re-render'sız yürür.
  const targetX = useSharedValue(width / 2);
  const targetY = useSharedValue(height / 2);
  const offScreen = useSharedValue(0);
  /** Alttaki kartın kapladığı yükseklik: gösterge kartın arkasına düşmesin. */
  const bottomReserve = useSharedValue(insets.bottom + EDGE_INSET);
  const edgeWidth = useSharedValue(0);

  // Yakın eşiğine ilk girişte tek impactLight (§3 haptik haritası).
  useEffect(() => {
    if (status === 'near' && !nearFired.current) {
      nearFired.current = true;
      hapticTick();
    }
  }, [status]);

  // Son durumlar: AR bir daha kendiliğinden açılmaz, haritaya dönülür (§7.7).
  useEffect(() => {
    if (unavailableSent.current) return;
    if (status === 'cameraDenied' || status === 'failed' || status === 'unsupported') {
      unavailableSent.current = true;
      onUnavailable(status === 'cameraDenied' ? 'camera' : 'tracking');
    }
  }, [status, onUnavailable]);

  const edgeStyle = useAnimatedStyle(() => {
    const cx = width / 2;
    const cy = height / 2;
    const dx = targetX.value - cx;
    const dy = targetY.value - cy;
    const half = edgeWidth.value / 2;
    const left = EDGE_INSET + half;
    const right = width - EDGE_INSET - half;
    const top = insets.top + EDGE_TOP_RESERVE;
    const bottom = height - bottomReserve.value;
    // Merkezden hedefe giden ışın, kapatma karesi ile kartın arasında kalan çerçeveye kırpılır.
    const tx = dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Number.POSITIVE_INFINITY;
    const ty = dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Number.POSITIVE_INFINITY;
    const clip = Math.min(1, tx, ty);
    return {
      opacity: offScreen.value,
      transform: [{ translateX: cx + dx * clip - half }, { translateY: cy + dy * clip - EDGE_DOT }],
    };
  });

  const showCard = !coaching && (status === 'ready' || status === 'near' || status === 'limited');
  const near = status === 'near';
  const meters = reading?.meters ?? gpsDistanceM;
  const distanceText = meters === null ? null : formatDistance(meters, locale);
  const overline = [placeName, floor].filter(Boolean).join(' · ');
  const line = statusLine(status, reading?.guidance ?? null, weakGps, reading !== null);

  return (
    <View style={{ flex: 1 }}>
      {/* Kamera açılırken harita kararır ama görünür kalır; kamera onun üstüne gelir. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: darkColors.la, opacity: MAP_DIM }]} />

      {ParkiqArView !== null && (
        <ParkiqArView
          style={StyleSheet.absoluteFill}
          car={car}
          user={user}
          onStatus={(event) => {
            setStatus(event.nativeEvent.state);
            setCoaching(event.nativeEvent.coaching === true);
          }}
          onTarget={(event) => {
            const target = event.nativeEvent;
            targetX.value = target.x;
            targetY.value = target.y;
            offScreen.value = target.onScreen ? 0 : 1;
            const next = { meters: Math.round(target.distanceM), guidance: guidanceOf(target) };
            setReading((current) =>
              current !== null && current.meters === next.meters && current.guidance === next.guidance ? current : next,
            );
          }}
        />
      )}

      {/* Kenar göstergesi (§7.7): hedef ekran dışındayken o kenarda mürekkep nokta + beyaz halka +
          mesafe. Hareketli olduğu için cam değil düz koyu dolgu (blur kare başı yeniden çizilmesin). */}
      {showCard && (
        <Animated.View
          pointerEvents="none"
          onLayout={(event) => {
            edgeWidth.value = event.nativeEvent.layout.width;
          }}
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.s8,
              height: EDGE_DOT * 2,
              paddingHorizontal: spacing.s8,
              borderRadius: radius.rFull,
              backgroundColor: glass.fallbackDark,
            },
            edgeStyle,
          ]}
        >
          <View
            style={{
              width: EDGE_DOT,
              height: EDGE_DOT,
              borderRadius: EDGE_DOT / 2,
              backgroundColor: lightColors.ink,
              borderWidth: 2,
              borderColor: lightColors.card,
            }}
          />
          {distanceText !== null && (
            <Text
              style={{
                fontSize: typeScale.overline.fontSize,
                fontWeight: typeScale.overline.fontWeight,
                letterSpacing: typeScale.overline.letterSpacing,
                color: darkColors.ink,
                fontVariant: ['tabular-nums'],
              }}
              allowFontScaling={false}
            >
              {upper(distanceText)}
            </Text>
          )}
        </Animated.View>
      )}

      <View style={{ position: 'absolute', top: insets.top + spacing.s12, left: spacing.s20 }}>
        <PressScale accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} hitSlop={8}>
          <Glass tone="dark" radius={radius.r12} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="xmark" size={18} color={darkColors.ink} weight="light" />
          </Glass>
        </PressScale>
      </View>

      {showCard && (
        <Animated.View
          entering={FadeInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness).mass(SPRING.mass)}
          onLayout={(event) => {
            bottomReserve.value = event.nativeEvent.layout.height + insets.bottom + spacing.s20 + spacing.s16;
          }}
          style={{
            position: 'absolute',
            left: spacing.s20,
            right: spacing.s20,
            bottom: insets.bottom + spacing.s20,
            gap: spacing.s12,
          }}
        >
          <Glass
            tone="dark"
            radius={radius.r24}
            style={{
              paddingHorizontal: spacing.s20,
              paddingVertical: spacing.s16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.s16,
            }}
          >
            <View style={{ flex: 1, gap: spacing.s4 }}>
              {overline.length > 0 && (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: typeScale.overline.fontSize,
                    fontWeight: typeScale.overline.fontWeight,
                    letterSpacing: typeScale.overline.letterSpacing,
                    color: darkColors.textTertiary,
                  }}
                >
                  {upper(overline)}
                </Text>
              )}
              {distanceText !== null && (
                <Text
                  accessibilityLabel={distanceText}
                  style={{
                    fontSize: 44,
                    fontWeight: '900',
                    letterSpacing: 44 * -0.03,
                    color: darkColors.ink,
                    fontVariant: ['tabular-nums'],
                  }}
                  maxFontSizeMultiplier={1.3}
                >
                  {distanceText}
                </Text>
              )}
              <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, color: darkColors.textSecondary }}>
                {line}
              </Text>
            </View>
            {/* Yakında aranan şey artık bir araba: kaydedilen fotoğraf onu tanıtır. */}
            {near && photoUri !== null && (
              <PhotoThumb uri={photoUri}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 64, height: 64, borderRadius: radius.r12, backgroundColor: darkColors.inset }}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors
                />
              </PhotoThumb>
            )}
          </Glass>
          <PrimaryCta tone="onDark" label={t('foundIt')} onPress={onFound} />
        </Animated.View>
      )}
    </View>
  );
}

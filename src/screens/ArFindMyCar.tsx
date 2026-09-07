import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isArAvailable, ParkiqArView, type ArStatus } from '../../modules/parkiq-ar';
import { PrimaryCta } from '../components/Buttons';
import { Glass } from '../components/motion/Glass';
import { PressScale } from '../components/motion/PressScale';
import type { Coords } from '../lib/geo';
import { formatDistance } from '../lib/geo';
import { hapticTick } from '../lib/haptics';
import { getLocale, t, upper } from '../localization';
import { darkColors, lightColors, radius, spacing, typeScale } from '../theme/tokens';

// design.md §7.7 HUD. Sahne RealityKit'te yaşar; burası yalnız okunabilir katman: cam kapatma
// karesi, cam mesafe kartı, koyu yüzey CTA'sı ve hedef ekran dışındayken kenar göstergesi.
// Kamera koyu yüzey ailesidir: token'lar tema bağımsız dark değerleridir.

export { isArAvailable };

const EDGE_INSET = 28;
const EDGE_DOT = 10;

function statusCopy(status: ArStatus): string {
  switch (status) {
    case 'near':
      return t('youAreClose');
    case 'ready':
      return t('arHint');
    case 'failed':
    case 'unsupported':
      return t('arFailed');
    case 'limited':
    case 'initializing':
      return t('arInitializing');
  }
}

export function ArFindMyCar({
  car,
  user,
  distanceM,
  placeName,
  floor,
  onClose,
  onFound,
}: {
  car: Coords;
  user: Coords | null;
  distanceM: number | null;
  placeName: string | null;
  floor: string | null;
  onClose: () => void;
  onFound: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const locale = getLocale();
  const [status, setStatus] = useState<ArStatus>('initializing');
  const nearFired = useRef(false);

  // Hedef izdüşümü shared value'da: 6 Hz olay React re-render üretmez (§3 idle kuralı).
  const targetX = useSharedValue(width / 2);
  const targetY = useSharedValue(height / 2);
  const offScreen = useSharedValue(0);

  // Yakın eşiğine ilk girişte tek impactLight (§3 haptik haritası).
  useEffect(() => {
    if (status === 'near' && !nearFired.current) {
      nearFired.current = true;
      hapticTick();
    }
  }, [status]);

  const edgeStyle = useAnimatedStyle(() => {
    const cx = width / 2;
    const cy = height / 2;
    const dx = targetX.value - cx;
    const dy = targetY.value - cy;
    const halfW = width / 2 - EDGE_INSET;
    const halfH = height / 2 - EDGE_INSET;
    // Merkezden hedefe giden ışın, kenar boşluğu bırakılmış ekran dikdörtgenine kırpılır.
    const clip = Math.min(halfW / Math.max(1, Math.abs(dx)), halfH / Math.max(1, Math.abs(dy)));
    return {
      opacity: offScreen.value,
      transform: [{ translateX: cx + dx * clip - EDGE_DOT / 2 }, { translateY: cy + dy * clip - EDGE_DOT / 2 }],
    };
  });

  const overline = [placeName, floor].filter(Boolean).join(' · ');
  const showCard = status !== 'initializing';
  const distanceText = distanceM === null ? null : formatDistance(distanceM, locale);

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.la }}>
      {ParkiqArView !== null && (
        <ParkiqArView
          style={StyleSheet.absoluteFill}
          car={car}
          user={user}
          onStatus={(event) => setStatus(event.nativeEvent.state)}
          onTarget={(event) => {
            const { x, y, onScreen } = event.nativeEvent;
            targetX.value = x;
            targetY.value = y;
            offScreen.value = onScreen ? 0 : 1;
          }}
        />
      )}

      {/* Kenar göstergesi: hedef ekran dışındayken o kenarda mürekkep nokta + beyaz halka. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: EDGE_DOT,
            height: EDGE_DOT,
            borderRadius: EDGE_DOT / 2,
            backgroundColor: lightColors.ink,
            borderWidth: 2,
            borderColor: lightColors.card,
          },
          edgeStyle,
        ]}
      />

      <View style={{ position: 'absolute', top: insets.top + spacing.s12, left: spacing.s20 }}>
        <PressScale accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} hitSlop={8}>
          <Glass tone="dark" radius={radius.r12} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <SymbolView name="xmark" size={18} tintColor={darkColors.ink} weight="light" />
          </Glass>
        </PressScale>
      </View>

      {showCard && (
        <View
          style={{
            position: 'absolute',
            left: spacing.s20,
            right: spacing.s20,
            bottom: insets.bottom + spacing.s20,
            gap: spacing.s12,
          }}
        >
          <Glass tone="dark" radius={radius.r24} style={{ paddingHorizontal: spacing.s20, paddingVertical: spacing.s16, gap: spacing.s4 }}>
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
            <Text style={{ fontSize: 13, color: darkColors.textSecondary }}>{statusCopy(status)}</Text>
          </Glass>
          <PrimaryCta tone="onDark" label={t('foundIt')} onPress={onFound} />
        </View>
      )}
    </View>
  );
}

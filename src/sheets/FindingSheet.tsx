import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { GhostButton, PrimaryCta } from '../components/Buttons';
import { trackPaywallShown } from '../lib/analytics';
import { CompassDial } from '../components/motion/CompassDial';
import { PhotoThumb } from '../components/motion/PhotoViewer';
import { ProBadge } from '../components/ProBadge';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { Body, Caption, Overline } from '../components/Typography';
import { trackFindMyCar } from '../lib/analytics';
import { bearingDegrees, distanceMeters, formatDistance, isIndoorLike, NEAR_DISTANCE_M } from '../lib/geo';
import { hapticTick } from '../lib/haptics';
import { openInMaps } from '../lib/maps';
import { getLocale, t } from '../localization';
import { isArAvailable } from '../screens/ArFindMyCar';
import { useIsPremium } from '../state/premiumStore';
import { useSessionStore, type ParkSession } from '../state/sessionStore';
import { EndConfirm } from './SessionSheets';
import { useUiStore } from '../state/uiStore';
import { useTheme } from '../theme';
import { SPRING } from '../theme/motion';
import { radius, spacing, typeScale } from '../theme/tokens';

// design.md §7.6 Arabamı Bul: ayrı ekran değil, sheet fazı (`finding`). Harita kahramandır
// (kamera kullanıcı + arabayı çerçeveler, araya hairline çizgi); sheet mesafeyi, kadranı ya da
// kapalı alanda foto/kat kartını taşır. Üç kol: foto/kat VAR → kart birincil; yok + doğruluk
// iyi → kadran; yok + doğruluk kötü → "approximate" satırı, kadran gizli.
// Sensör akışları yalnız bu faz boyunca açıktır; faz bitince kapanır (§3 idle kuralı).

/**
 * Pusula. Heading ve doğruluk shared value'ya yazılır — React re-render yok. Sarmalanma
 * (359° → 0°) kısa yay üzerinden çözülür ki ibre ters yönde dönmesin. Akış kurulamazsa
 * (izin yok, pusula yok) `available` false kalır ve kadran hiç çizilmez.
 */
function useHeading(active: boolean) {
  const heading = useSharedValue(0);
  const accuracy = useSharedValue(3);
  const [available, setAvailable] = useState(false);
  const continuous = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void Location.watchHeadingAsync((value) => {
      const raw = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      if (continuous.current === null) {
        continuous.current = raw;
        heading.value = raw;
        setAvailable(true);
      } else {
        const current = ((continuous.current % 360) + 360) % 360;
        const delta = ((raw - current + 540) % 360) - 180;
        continuous.current += delta;
        heading.value = withSpring(continuous.current, SPRING);
      }
      accuracy.value = typeof value.accuracy === 'number' ? value.accuracy : 3;
    })
      .then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch(() => setAvailable(false));

    return () => {
      cancelled = true;
      subscription?.remove();
      continuous.current = null;
      setAvailable(false);
    };
  }, [active, heading, accuracy]);

  return { heading, accuracy, available };
}

/** Canlı konum: yalnız `finding` boyunca `BestForNavigation`; uiStore'a yazılır (harita çizgisi + AR). */
function useUserFix(active: boolean): { denied: boolean } {
  const [denied, setDenied] = useState(false);
  const setUserFix = useUiStore((s) => s.setUserFix);

  useEffect(() => {
    if (!active) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setDenied(true);
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2 },
        (position) =>
          setUserFix({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
          }),
      );
      if (cancelled) sub.remove();
      else subscription = sub;
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      setUserFix(null);
    };
  }, [active, setUserFix]);

  return { denied };
}

/** Kapalı otoparkta arabayı bulmanın asıl aracı: foto + kat + not. Foto yerinde büyür. */
function SpotCard({ session }: { session: ParkSession }) {
  const { colors } = useTheme();
  const details = [session.floor, session.note].filter(Boolean);
  return (
    <View style={{ gap: spacing.s16 }}>
      {session.photoUri && (
        <PhotoThumb uri={session.photoUri}>
          <Image
            source={{ uri: session.photoUri }}
            style={{ width: '100%', height: 220, borderRadius: radius.r16, backgroundColor: colors.inset }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        </PhotoThumb>
      )}
      {details.length > 0 && (
        <View style={{ gap: spacing.s4 }}>
          {session.floor ? <Overline>{t('floor')}</Overline> : null}
          {details.map((line) => (
            <Body key={line}>{line}</Body>
          ))}
        </View>
      )}
      {!session.photoUri && details.length === 0 && <Caption>{t('noSpotDetails')}</Caption>}
    </View>
  );
}

export function FindingSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const isPremium = useIsPremium();
  const session = useSessionStore((s) => s.session);
  const { stopFinding } = useSessionStore.getState();
  const endConfirm = useUiStore((s) => s.endConfirm);
  const askEnd = useUiStore((s) => s.askEnd);
  const userFix = useUiStore((s) => s.userFix);
  const openAr = useUiStore((s) => s.openAr);
  const { denied } = useUserFix(true);
  const compass = useHeading(true);
  const bearing = useSharedValue(0);
  const nearFired = useRef(false);

  const carCoords = useMemo(
    () =>
      session?.latitude != null && session.longitude != null
        ? { latitude: session.latitude, longitude: session.longitude }
        : null,
    [session?.latitude, session?.longitude],
  );

  const distance = carCoords && userFix ? distanceMeters(userFix, carCoords) : null;
  const near = distance !== null && distance <= NEAR_DISTANCE_M;

  useEffect(() => {
    if (!carCoords || !userFix) return;
    bearing.value = bearingDegrees(userFix, carCoords);
  }, [carCoords, userFix, bearing]);

  useEffect(() => {
    trackFindMyCar(carCoords ? 'compass' : 'indoor');
  }, [carCoords]);

  // Yakın eşiğine ilk girişte tek impactLight (§3 haptik haritası).
  useEffect(() => {
    if (near && !nearFired.current) {
      nearFired.current = true;
      hapticTick();
    }
  }, [near]);

  if (!session) return null;

  // Kapalı otopark kararı KAYDIN doğruluğuna bakar; dönüş anındaki canlı doğruluk kaydı temsil etmez.
  const indoor =
    carCoords === null || isIndoorLike(session.accuracyM) || isIndoorLike(userFix?.accuracy ?? null);
  // Kadran ve AR premium; yer, foto, not ve "Open in Maps" herkese açık.
  const showCompass = isPremium && !indoor;
  const distanceText = distance === null ? null : formatDistance(distance, locale);

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={stopFinding}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: radius.r12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.insetPressed : colors.inset,
          })}
        >
          <SymbolView name="chevron.left" size={14} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Overline style={{ flex: 1 }} numberOfLines={1}>
          {[session.placeName, session.floor].filter(Boolean).join(' · ')}
        </Overline>
      </View>

      {denied && <StatusLine label={t('locationOff')} onPress={openAppSettings} />}
      {session.accuracyM != null && session.accuracyM > 0 && isIndoorLike(session.accuracyM) && (
        <StatusLine label={t('locationRough', { meters: Math.round(session.accuracyM) })} />
      )}
      {carCoords === null && <StatusLine label={t('locationMissing')} />}

      {!showCompass ? (
        <SpotCard session={session} />
      ) : (
        <View style={{ gap: spacing.s24, alignItems: 'center' }}>
          {compass.available && (
            <CompassDial bearing={bearing} heading={compass.heading} accuracy={compass.accuracy} near={near} />
          )}
          <View style={{ alignItems: 'center', gap: spacing.s4 }}>
            {distanceText !== null && (
              <Text
                style={{
                  fontSize: typeScale.displayXL.fontSize,
                  fontWeight: typeScale.displayXL.fontWeight,
                  letterSpacing: typeScale.displayXL.letterSpacing,
                  color: colors.ink,
                  fontVariant: ['tabular-nums'],
                }}
                maxFontSizeMultiplier={1.3}
              >
                {distanceText}
              </Text>
            )}
            <Caption>{!compass.available ? t('headingUnavailable') : near ? t('youAreClose') : t('walkToCar')}</Caption>
          </View>
          {session.photoUri && (
            <PhotoThumb uri={session.photoUri} style={{ alignSelf: 'stretch' }}>
              <Image
                source={{ uri: session.photoUri }}
                style={{ width: '100%', height: 120, borderRadius: radius.r16, backgroundColor: colors.inset }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            </PhotoThumb>
          )}
        </View>
      )}

      {indoor && carCoords !== null && <Caption>{t('indoorHint')}</Caption>}
      {!isPremium && !indoor && carCoords !== null && (
        <StatusLine
          label={t('compassLocked')}
          pro
          onPress={() => {
            trackPaywallShown('feature');
            onOpenPaywall();
          }}
        />
      )}

      {endConfirm ? (
        <EndConfirm session={session} />
      ) : (
        <View style={{ gap: spacing.s8 }}>
          {/* Aramanın bittiği an onay ister; blok aynı panelde açılır (§7.8). */}
          <PrimaryCta label={t('foundIt')} onPress={askEnd} />
          <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
            {/* AR premium ama düğme kilitliyken de durur: yeteneğin var olduğunu görmek,
                hiç görmemekten iyidir — dokunuş paywall'a gider (§7.10). */}
            {!indoor && carCoords !== null && isArAvailable && (
              <GhostButton
                label={t('arMode')}
                locked={!isPremium}
                onPress={
                  isPremium
                    ? openAr
                    : () => {
                        trackPaywallShown('feature');
                        onOpenPaywall();
                      }
                }
                style={{ flex: 1 }}
              />
            )}
            <GhostButton label={t('openInMaps')} onPress={() => openInMaps(session)} disabled={!carCoords} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}

import { useBottomSheet, useBottomSheetInternal } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withSpring } from 'react-native-reanimated';
import { GhostButton, PrimaryCta } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { trackFindMyCar, trackPaywallShown } from '../lib/analytics';
import { CompassDial } from '../components/motion/CompassDial';
import { PhotoThumb } from '../components/motion/PhotoViewer';
import { PressScale } from '../components/motion/PressScale';
import { ProBadge } from '../components/ProBadge';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { Body, Caption, DisplayStamp, Overline } from '../components/Typography';
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

/** iOS pusula doğruluğu (0–3) bu değerin altındaysa kalibrasyon cümlesi çıkar (§7.6). */
const CALIBRATED_ACCURACY = 2;

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

  // Kalibrasyon cümlesi yalnız eşik geçilince yeniden çizilir; okumalar re-render üretmez.
  const [calibrate, setCalibrate] = useState(false);
  useAnimatedReaction(
    () => accuracy.value < CALIBRATED_ACCURACY,
    (low, previous) => {
      if (low !== previous) runOnJS(setCalibrate)(low);
    },
  );

  return { heading, accuracy, available, calibrate: available && calibrate };
}

/** Canlı konum: yalnız `finding` boyunca `BestForNavigation`; uiStore'a yazılır (harita çizgisi + AR). */
function useUserFix(active: boolean): { denied: boolean; granted: boolean } {
  const [denied, setDenied] = useState(false);
  const [granted, setGranted] = useState(false);
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
      if (!cancelled) setGranted(true);
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2 },
        (position) =>
          setUserFix({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            timestamp: Number.isFinite(position.timestamp) ? position.timestamp : null,
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

  return { denied, granted };
}

/**
 * Arabamı Bul AÇIK kademede başlar: "Buldum" ve AR ilk bakışta elde olmalı.
 *
 * Bunu kökten `expand()` ile yapmak işe yaramıyordu: faz değişince panelin kademeleri
 * [içerik] → [kompakt, içerik] olur ve gorhom MEVCUT SIRAYI (0) korur — yani panel her
 * seferinde kompakt kademeye, yalnız başlık satırına iniyordu; aynı etkideki
 * `snapToIndex(0)` de `expand()`'i eziyordu. Burada kademeler gerçekten ikiye çıktığı an
 * (içerik ölçüldü) bir kez açılır.
 */
function useOpenExpanded() {
  const { animatedDetentsState } = useBottomSheetInternal();
  const { expand } = useBottomSheet();
  const opened = useSharedValue(false);
  useAnimatedReaction(
    () => animatedDetentsState.get().detents?.length ?? 0,
    (count) => {
      if (opened.value || count < 2) return;
      opened.value = true;
      runOnJS(expand)();
    },
  );
}

/** Kayıtta arabayı tanıtan bir şey var mı: foto, kat ya da not (§7.6 kol 1). */
function hasSpotDetails(session: ParkSession): boolean {
  return !!session.photoUri || !!session.floor || !!session.note;
}

/**
 * §7.6 kol 1 — kayıtta foto/kat/not varsa ANA KART budur: 16:9 foto (dokununca yerinde
 * büyür), altında kat display-M ink nokta, sonra not. Pusula bunun altında ikincildir.
 *
 * Eskiden Pro kullanıcıda açık alanda kadran öne geçiyor, foto en altta 120 pt'lik bir
 * şeride iniyordu; panel de kompakt açıldığı için kullanıcı çektiği fotoğrafı hiç görmüyordu.
 */
function SpotCard({ session }: { session: ParkSession }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.s12 }}>
      {session.photoUri && (
        <PhotoThumb uri={session.photoUri}>
          <Image
            source={{ uri: session.photoUri }}
            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.r16, backgroundColor: colors.inset }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        </PhotoThumb>
      )}
      {!!session.floor && (
        <View style={{ gap: spacing.s4 }}>
          <Overline>{t('floor')}</Overline>
          {/* Yer bilgisi duygu değildir: nokta ink (§2). Statik — bu sahnenin tek anı kamera
              uçuşu ve pin büyümesi (§7.6). */}
          <DisplayStamp text={session.floor} dotColor={colors.ink} animate={false} />
        </View>
      )}
      {!!session.note && <Body>{session.note}</Body>}
      {!hasSpotDetails(session) && <Caption>{t('noSpotDetails')}</Caption>}
    </View>
  );
}

/**
 * AR girişi başlık satırında durur: panel kompakt kademedeyken de görünür.
 * Eskiden "Kamera görünümü" adıyla en alttaki yarım genişlik ikinci satırdaydı ve yalnız ilk
 * GPS düzeltmesi geldikten SONRA çıkıyordu — kullanıcı ne olduğunu da nerede olduğunu da bilmiyordu.
 */
function ArEntry({ locked, onPress }: { locked: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={t('arMode')}
      onPress={onPress}
      hitSlop={4}
      style={(pressed) => ({
        height: 36,
        paddingHorizontal: spacing.s12,
        borderRadius: radius.rFull,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s4,
        backgroundColor: pressed ? colors.insetPressed : colors.inset,
      })}
    >
      {locked ? <ProBadge size={13} /> : <Icon name="arkit" size={17} color={colors.ink} weight="regular" />}
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('arShort')}</Text>
    </PressScale>
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
  const arOpen = useUiStore((s) => s.arOpen);
  const arNotice = useUiStore((s) => s.arNotice);
  const { denied, granted } = useUserFix(true);
  const bearing = useSharedValue(0);
  const nearFired = useRef(false);
  useOpenExpanded();

  const carCoords = useMemo(
    () =>
      session?.latitude != null && session.longitude != null
        ? { latitude: session.latitude, longitude: session.longitude }
        : null,
    [session?.latitude, session?.longitude],
  );
  /* Kapalı otopark kararı KAYDIN doğruluğuna bakar; dönüş anındaki canlı doğruluk kaydı temsil
     etmez. Canlı doğruluk da hesaba katılıyordu: ilk düzeltme gelene kadar (null = "kapalı")
     ve doğruluk her 35 m'yi aştığında kadran fotoğraf kartına, AR düğmesi yok olmaya
     dönüyordu — panel kullanıcının elinde değişip duruyordu. */
  const indoor = carCoords === null || isIndoorLike(session?.accuracyM ?? null);
  // Kadran ve AR premium; yer, foto, not ve "Open in Maps" herkese açık. Konum izni yoksa
  // ikisi de çalışamaz (yön, kullanıcının yerine göre hesaplanır): sunulmaz.
  const showCompass = isPremium && !indoor && !denied;
  // Pusula yalnız kadran çizilecekse akar: ücretsiz kullanıcıda ve AR açıkken (kadran kameranın
  // arkasında) sensör boşuna dönmesin. İzin verilmeden açılırsa akış reddediliyor ve izin
  // sonradan gelince bir daha denenmiyordu — kadran o ziyarette hiç çizilmiyordu.
  const compass = useHeading(showCompass && !arOpen && granted);

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

  const showAr = !indoor && !denied && isArAvailable;
  const distanceText = distance === null ? null : formatDistance(distance, locale);
  const guidance = !compass.available
    ? t('headingUnavailable')
    : compass.calibrate
      ? t('calibrateCompass')
      : near
        ? t('youAreClose')
        : t('walkToCar');

  const openPaywall = () => {
    trackPaywallShown('feature');
    onOpenPaywall();
  };

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
          <Icon name="chevron.left" size={14} color={colors.ink} weight="semibold" />
        </Pressable>
        <Overline style={{ flex: 1 }} numberOfLines={1}>
          {[session.placeName, session.floor].filter(Boolean).join(' · ')}
        </Overline>
        {/* AR premium ama giriş kilitliyken de durur: yeteneğin var olduğunu görmek,
            hiç görmemekten iyidir — dokunuş paywall'a gider. */}
        {showAr && (
          <ArEntry
            locked={!isPremium}
            onPress={
              isPremium
                ? () => {
                    trackFindMyCar('ar');
                    useUiStore.getState().openAr();
                  }
                : openPaywall
            }
          />
        )}
      </View>

      {denied && <StatusLine label={t('locationOff')} onPress={openAppSettings} />}
      {arNotice === 'camera' && <StatusLine label={t('cameraOff')} onPress={openAppSettings} />}
      {arNotice === 'tracking' && <StatusLine label={t('arFailed')} />}
      {session.accuracyM != null && session.accuracyM > 0 && isIndoorLike(session.accuracyM) && (
        <StatusLine label={t('locationRough', { meters: Math.round(session.accuracyM) })} />
      )}
      {carCoords === null && <StatusLine label={t('locationMissing')} />}

      {/* §7.6 üç kol: kayıt arabayı tanıtıyorsa kart birincil, pusula altında ikincil · kayıtta
          bir şey yok ve açık alan → pusula birincil · ikisi de yoksa "detay yok" satırı. */}
      {hasSpotDetails(session) ? (
        <View style={{ gap: spacing.s16 }}>
          <SpotCard session={session} />
          {showCompass && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s16 }}>
              {compass.available && (
                <CompassDial bearing={bearing} heading={compass.heading} accuracy={compass.accuracy} near={near} />
              )}
              <View style={{ flex: 1, gap: spacing.s4 }}>
                {distanceText !== null && (
                  <Text
                    style={{
                      fontSize: typeScale.displayS.fontSize,
                      fontWeight: typeScale.displayS.fontWeight,
                      letterSpacing: typeScale.displayS.letterSpacing,
                      color: colors.ink,
                      fontVariant: ['tabular-nums'],
                    }}
                    maxFontSizeMultiplier={1.3}
                  >
                    {distanceText}
                  </Text>
                )}
                <Caption>{guidance}</Caption>
              </View>
            </View>
          )}
        </View>
      ) : showCompass ? (
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
            <Caption>{guidance}</Caption>
          </View>
        </View>
      ) : (
        <SpotCard session={session} />
      )}

      {indoor && carCoords !== null && <Caption>{t('indoorHint')}</Caption>}
      {!isPremium && !indoor && !denied && carCoords !== null && (
        <StatusLine label={t('compassLocked')} pro onPress={openPaywall} />
      )}

      {endConfirm ? (
        <EndConfirm session={session} />
      ) : (
        <View style={{ gap: spacing.s8 }}>
          {/* Aramanın bittiği an onay ister; blok aynı panelde açılır (§7.8). */}
          <PrimaryCta label={t('foundIt')} onPress={askEnd} />
          <GhostButton label={t('openInMaps')} onPress={() => openInMaps(session)} disabled={!carCoords} />
        </View>
      )}
    </View>
  );
}

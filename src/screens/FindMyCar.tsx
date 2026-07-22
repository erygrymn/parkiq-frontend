import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryCta } from '../components/Buttons';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { Body, Caption, Overline } from '../components/Typography';
import {
  bearingDegrees,
  distanceMeters,
  formatDistance,
  isIndoorLike,
  NEAR_DISTANCE_M,
  relativeBearing,
} from '../lib/geo';
import { openInMaps } from '../lib/maps';
import { getLocale, t } from '../localization';
import type { ParkSession } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// §7.6 Find My Car.
// Açık alan: pusula oku + mesafe. Kapalı otopark (GPS doğruluğu kötü): foto/kat
// kartı öne çıkar — orada pusula yalan söyler, dürüst tasarım bunu kabul eder.
// AR katmanı (ar-find-my-car.md) bu ekranın üstüne gelecek, yerine değil.

type Fix = { coords: Location.LocationObjectCoords } | null;

function useHeading(active: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    void Location.watchHeadingAsync((value) => {
      // trueHeading yoksa (pusula kalibre değil) magHeading'e düş.
      const next = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      setHeading(next);
    }).then((sub) => {
      if (cancelled) sub.remove();
      else subscription = sub;
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active]);
  return heading;
}

function useUserFix(active: boolean): { fix: Fix; denied: boolean } {
  const [fix, setFix] = useState<Fix>(null);
  const [denied, setDenied] = useState(false);

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
        (position) => setFix({ coords: position.coords }),
      );
      if (cancelled) sub.remove();
      else subscription = sub;
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active]);

  return { fix, denied };
}

/** Kapalı otoparkta arabayı bulmanın asıl aracı: foto + kat + not. */
function SpotCard({ session, onOpenPhoto }: { session: ParkSession; onOpenPhoto: () => void }) {
  const { colors } = useTheme();
  const details = [session.floor, session.note].filter(Boolean);

  return (
    <View style={{ gap: spacing.s16 }}>
      {session.photoUri && (
        <Pressable accessibilityRole="button" onPress={onOpenPhoto}>
          <Image
            source={{ uri: session.photoUri }}
            style={{ width: '100%', height: 260, borderRadius: radius.r16, backgroundColor: colors.inset }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
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

function Compass({ rotation, near }: { rotation: number; near: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.inset,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
        <SymbolView
          name={near ? 'mappin.circle.fill' : 'location.north.fill'}
          size={near ? 88 : 96}
          tintColor={near ? colors.accentFill : colors.ink}
          weight="regular"
        />
      </View>
    </View>
  );
}

export function FindMyCar({
  visible,
  session,
  onClose,
}: {
  visible: boolean;
  session: ParkSession | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const locale = getLocale();
  const [photoOpen, setPhotoOpen] = useState(false);

  const { fix, denied } = useUserFix(visible);
  const heading = useHeading(visible);

  const carCoords = useMemo(
    () =>
      session?.latitude != null && session.longitude != null
        ? { latitude: session.latitude, longitude: session.longitude }
        : null,
    [session?.latitude, session?.longitude],
  );

  if (!session) return null;

  const userCoords = fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude } : null;
  const distance = carCoords && userCoords ? distanceMeters(userCoords, carCoords) : null;
  const bearing = carCoords && userCoords ? bearingDegrees(userCoords, carCoords) : null;
  const rotation = bearing !== null && heading !== null ? relativeBearing(bearing, heading) : 0;

  // Kapalı otopark: GPS doğruluğu kötü ya da araba konumu hiç yok.
  const indoor = carCoords === null || isIndoorLike(fix?.coords.accuracy ?? null);
  const near = distance !== null && distance <= NEAR_DISTANCE_M;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing.s20,
            paddingTop: spacing.s20,
            paddingBottom: spacing.s12,
          }}
        >
          <Overline>{[session.placeName, session.floor].filter(Boolean).join(' · ')}</Overline>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('findMyCar')}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: radius.r8 + 2,
              backgroundColor: pressed ? colors.insetPressed : colors.inset,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <SymbolView name="xmark" size={14} tintColor={colors.ink} weight="semibold" />
          </Pressable>
        </View>

        <View style={{ flex: 1, paddingHorizontal: spacing.s20, gap: spacing.s24 }}>
          {denied && <StatusLine label={t('locationOff')} onPress={openAppSettings} />}

          {indoor ? (
            <SpotCard session={session} onOpenPhoto={() => setPhotoOpen(true)} />
          ) : (
            <View style={{ gap: spacing.s24, alignItems: 'center' }}>
              <Compass rotation={rotation} near={near} />
              <View style={{ alignItems: 'center', gap: spacing.s4 }}>
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
                  {distance === null ? '—' : formatDistance(distance, locale)}
                </Text>
                <Caption>{near ? t('youAreClose') : t('walkToCar')}</Caption>
              </View>
            </View>
          )}

          <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + spacing.s20, gap: spacing.s8 }}>
            {indoor && carCoords !== null && <Caption>{t('indoorHint')}</Caption>}
            <PrimaryCta label={t('openInMaps')} onPress={() => openInMaps(session)} disabled={!carCoords} />
            {session.photoUri && !indoor && (
              <GhostButton label={t('photo')} onPress={() => setPhotoOpen(true)} />
            )}
          </View>
        </View>
      </View>

      <Modal visible={photoOpen} animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000' }} onPress={() => setPhotoOpen(false)}>
          {session.photoUri && (
            <Image
              source={{ uri: session.photoUri }}
              style={{ flex: 1 }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          )}
        </Pressable>
      </Modal>
    </Modal>
  );
}

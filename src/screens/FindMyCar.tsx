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
import { ArFindMyCar, isArAvailable } from './ArFindMyCar';
import { getLocale, t } from '../localization';
import type { ParkSession } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// §7.6 Find My Car.
// Açık alan: pusula oku + mesafe. Kapalı otopark (GPS doğruluğu kötü): foto/kat
// kartı öne çıkar — orada pusula yalan söyler, dürüst tasarım bunu kabul eder.
// AR katmanı (ar-find-my-car.md) bu ekranın üstüne gelecek, yerine değil.

type Fix = { coords: Location.LocationObjectCoords } | null;

/**
 * Pusula yönü + o yönün kalitesi.
 *
 * iOS `accuracy` alanını 0-3 olarak verir (0 = kalibrasyon yok). Bu okunmadan
 * çizilen ok, kalibresiz telefonda kendinden emin biçimde yanlış yeri gösterir
 * — pazar araştırmasındaki "yaklaştıkça 45-90 derece sapıyor" şikayeti bu.
 * Akış hiç kurulamazsa (izin yok, cihazda pusula yok) heading kalıcı null
 * kalır; o durumda ok çizilmez, mesafe tek başına gösterilir.
 */
function useHeading(active: boolean): { heading: number | null; accuracy: number | null } {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void Location.watchHeadingAsync((value) => {
      // trueHeading yoksa (pusula kalibre değil) magHeading'e düş.
      const next = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      setHeading(next);
      setAccuracy(typeof value.accuracy === 'number' ? value.accuracy : null);
    })
      .then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch(() => {
        // Pusula yoksa ya da izin reddedildiyse: sessizce yönsüz moda düş.
        setHeading(null);
        setAccuracy(null);
      });

    return () => {
      cancelled = true;
      subscription?.remove();
      setHeading(null);
      setAccuracy(null);
    };
  }, [active]);

  return { heading, accuracy };
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

function Compass({
  rotation,
  near,
  shaky,
}: {
  rotation: number;
  near: boolean;
  /** Pusula kalibre değil: ok soluklaşır, kesinlik iddiasını geri çeker. */
  shaky: boolean;
}) {
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
      <View style={{ transform: [{ rotate: `${rotation}deg` }], opacity: shaky ? 0.45 : 1 }}>
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
  isPremium,
  onClose,
  onFound,
  onOpenPaywall,
}: {
  visible: boolean;
  session: ParkSession | null;
  /** Pusula ve AR premium; konum/foto/not herkese açıktır. */
  isPremium: boolean;
  onClose: () => void;
  /** "Buldum": ekran kapanır ve oturumu bitirme sorusu açılır. */
  onFound: () => void;
  onOpenPaywall: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const locale = getLocale();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);

  const { fix, denied } = useUserFix(visible);
  const { heading, accuracy: headingAccuracy } = useHeading(visible);

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
  const hasHeading = bearing !== null && heading !== null;
  const rotation = hasHeading ? relativeBearing(bearing, heading) : 0;
  // iOS ölçeğinde 1 ve altı "güvenme" demek — expo'nun kendi getHeadingAsync'i de
  // 1'in üstünü bekler.
  const headingShaky = headingAccuracy !== null && headingAccuracy <= 1;

  // Kapalı otopark kararı KAYDIN doğruluğuna bakar. Dönüş anındaki canlı
  // doğruluk (kullanıcı çoktan dışarı çıkmış, açık gökyüzü) kaydın kalitesini
  // temsil etmiyor; otoparkta ±150 m ile alınmış bir nokta "iyi" sayılıyordu.
  const indoor =
    carCoords === null || isIndoorLike(session.accuracyM) || isIndoorLike(fix?.coords.accuracy ?? null);
  // Pusula premium. Ücretsiz kullanıcı yerini, fotoğrafını ve notunu görür —
  // yani arabayı bulmanın kapalı otoparktaki asıl aracı ücretsiz kalır.
  const showCompass = isPremium && !indoor;
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
          <Overline style={{ flex: 1 }} numberOfLines={1}>
            {[session.placeName, session.floor].filter(Boolean).join(' · ')}
          </Overline>

          {/* AR yalnız yön hesaplanabildiğinde anlamlı: kapalı otoparkta pusula
              yalan söyler, orada foto/kat kartı doğru araçtır. */}
          {isPremium && !indoor && carCoords !== null && isArAvailable && (
            <Pressable
              onPress={() => setArOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('arMode')}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.r8 + 2,
                marginRight: spacing.s8,
                backgroundColor: pressed ? colors.insetPressed : colors.inset,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <SymbolView name="camera.viewfinder" size={15} tintColor={colors.ink} weight="regular" />
            </Pressable>
          )}

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

          {/* Kaydın doğruluğu kötüyse sayı gizlenmez, SÖYLENİR: yanlış noktaya
              ters geocode'dan gelen sokak adı sahte otorite kazandırıyordu. */}
          {session.accuracyM != null && session.accuracyM > 0 && isIndoorLike(session.accuracyM) && (
            <StatusLine label={t('locationRough', { meters: Math.round(session.accuracyM) })} />
          )}
          {carCoords === null && <StatusLine label={t('locationMissing')} />}

          {!showCompass ? (
            <SpotCard session={session} onOpenPhoto={() => setPhotoOpen(true)} />
          ) : (
            <View style={{ gap: spacing.s24, alignItems: 'center' }}>
              {/* Yön yoksa ok HİÇ çizilmez: 0° "araba tam karşında" demektir ve
                  bu, elimizde olmayan bir bilgiyi uydurmak olur. */}
              {hasHeading && <Compass rotation={rotation} near={near} shaky={headingShaky} />}
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
                <Caption>
                  {!hasHeading
                    ? t('headingUnavailable')
                    : headingShaky
                      ? t('calibrateCompass')
                      : near
                        ? t('youAreClose')
                        : t('walkToCar')}
                </Caption>
              </View>
            </View>
          )}

          <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + spacing.s20, gap: spacing.s8 }}>
            {indoor && carCoords !== null && <Caption>{t('indoorHint')}</Caption>}
            {!isPremium && !indoor && carCoords !== null && (
              <StatusLine label={t('compassLocked')} onPress={onOpenPaywall} />
            )}
            {/* Aramanın bittiği an: ekran kapanır, sayaç durdurulsun mu diye sorulur. */}
            <PrimaryCta label={t('foundIt')} onPress={onFound} />
            <GhostButton label={t('openInMaps')} onPress={() => openInMaps(session)} disabled={!carCoords} />
            {session.photoUri && showCompass && (
              <GhostButton label={t('photo')} onPress={() => setPhotoOpen(true)} />
            )}
          </View>
        </View>
      </View>

      <Modal visible={arOpen} animationType="slide" onRequestClose={() => setArOpen(false)}>
        {carCoords && (
          <ArFindMyCar
            car={carCoords}
            user={userCoords}
            distanceM={distance}
            onClose={() => setArOpen(false)}
            onFound={() => {
              // İki iç içe modal AYNI KAREDE kapatılamaz: iOS alttakini kapatırken
              // üsttekinin animasyonu sürüyor ve ekranda kapatılamayan siyah bir
              // katman kalıyordu. Önce AR kapanır, kapanma bitince üst akış devam eder.
              setArOpen(false);
              setTimeout(onFound, 350);
            }}
          />
        )}
      </Modal>

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

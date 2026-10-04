import { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { ArCar, ArUserFix } from '../../modules/parkiq-ar';
import { distanceMeters } from '../lib/geo';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore, type ArNotice } from '../state/uiStore';
import { CROSSFADE_MS } from '../theme/motion';
import { ArFindMyCar } from './ArFindMyCar';

// design.md §7.7 giriş/çıkış: kök overlay, RN Modal değil. Harita kararır, kamera 250 ms içinde
// onun üstüne açılır; çıkış aynı yoldan. Kullanıcı konumu FindingSheet'in tek akışından (uiStore).

/** Bundan kötü canlı doğrulukta HUD işaretin birkaç metre kayık olabileceğini söyler. */
const WEAK_GPS_M = 20;

export function ArOverlay() {
  const session = useSessionStore((s) => s.session);
  const userFix = useUiStore((s) => s.userFix);
  const closeAr = useUiStore((s) => s.closeAr);

  const latitude = session?.latitude ?? null;
  const longitude = session?.longitude ?? null;
  const accuracy = session?.accuracyM ?? null;
  // Native tarafa her render'da yeni nesne gitmesin: araba oturum boyunca sabittir.
  const car = useMemo<ArCar | null>(
    () =>
      latitude !== null && longitude !== null
        ? { latitude, longitude, ...(accuracy !== null ? { accuracy } : {}) }
        : null,
    [latitude, longitude, accuracy],
  );
  const user = useMemo<ArUserFix | null>(() => {
    if (!userFix) return null;
    // Değeri olmayan alan gönderilmez: native sözlük null değer taşıyamaz.
    return {
      latitude: userFix.latitude,
      longitude: userFix.longitude,
      ...(userFix.accuracy !== null ? { accuracy: userFix.accuracy } : {}),
      ...(userFix.timestamp !== null ? { timestamp: userFix.timestamp } : {}),
    };
  }, [userFix]);
  const close = useCallback(() => closeAr(), [closeAr]);
  const unavailable = useCallback((reason: ArNotice) => closeAr(reason), [closeAr]);

  if (!session || !car) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(CROSSFADE_MS)}
      style={StyleSheet.absoluteFill}
    >
      <ArFindMyCar
        car={car}
        user={user}
        gpsDistanceM={userFix ? distanceMeters(userFix, car) : null}
        weakGps={userFix?.accuracy != null && userFix.accuracy > WEAK_GPS_M}
        placeName={session.placeName}
        floor={session.floor || null}
        photoUri={session.photoUri}
        onClose={close}
        onFound={() => {
          // AR kapanır, onay bloğu Arabamı Bul panelinde açılır — kamera üstünde soru sorulmaz.
          closeAr();
          useUiStore.getState().askEnd();
        }}
        onUnavailable={unavailable}
      />
    </Animated.View>
  );
}

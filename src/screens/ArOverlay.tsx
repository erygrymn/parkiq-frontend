import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { distanceMeters } from '../lib/geo';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';
import { CROSSFADE_MS } from '../theme/motion';
import { ArFindMyCar } from './ArFindMyCar';

// design.md §7.7 giriş/çıkış: kök overlay, RN Modal değil. Kamera 250 ms fade ile gelir, aynı
// yoldan gider. Kullanıcı konumu FindingSheet'in tek akışından (uiStore) okunur.

export function ArOverlay() {
  const session = useSessionStore((s) => s.session);
  const userFix = useUiStore((s) => s.userFix);
  const closeAr = useUiStore((s) => s.closeAr);


  if (!session || session.latitude == null || session.longitude == null) return null;
  const car = { latitude: session.latitude, longitude: session.longitude };
  const user = userFix ? { latitude: userFix.latitude, longitude: userFix.longitude } : null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(CROSSFADE_MS)}
      style={StyleSheet.absoluteFill}
    >
      <ArFindMyCar
        car={car}
        user={user}
        distanceM={user ? distanceMeters(user, car) : null}
        placeName={session.placeName}
        floor={session.floor || null}
        onClose={closeAr}
        onFound={() => {
          // AR kapanır, onay bloğu Arabamı Bul panelinde açılır — kamera üstünde soru sorulmaz.
          closeAr();
          useUiStore.getState().askEnd();
        }}
      />
    </Animated.View>
  );
}

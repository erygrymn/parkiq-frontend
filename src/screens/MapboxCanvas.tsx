import Mapbox, { Camera, LocationPuck, MapView, MarkerView } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { MAPBOX_PUBLIC_TOKEN, MAPBOX_STYLE_URL_DARK, MAPBOX_STYLE_URL_LIGHT } from '../config';
import { applyFilter, type PoiKind } from '../lib/parkingPoi';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, shadow } from '../theme/tokens';

// Gerçek harita katmanı — YALNIZ native build'de yüklenir (MapCanvas koruması).
// Expo Go bu dosyayı hiç require etmez.

if (!MAPBOX_PUBLIC_TOKEN) {
  // Sessiz boş harita yerine net uyarı: token build ortamından gelmemiş.
  console.warn(
    'EXPO_PUBLIC_MAPBOX_TOKEN is empty — the map will not render. Set it in .env or your shell profile.',
  );
}
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const DEFAULT_ZOOM = 15.5;

/** §5.8 araba pini: 32pt ink kare + alt uç. Harita üstündeki tek koyu öğe. */
function CarPin() {
  const { colors, scheme } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.r12,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: shadow.s1.ambient.color,
          shadowOffset: { width: 0, height: shadow.s1.ambient.offsetY },
          shadowRadius: shadow.s1.ambient.blur,
          shadowOpacity: scheme === 'dark' ? 0 : 1,
        }}
      >
        {/* Araba pini araba ikonu taşır — haritada "P" ile otopark POI'lerinden
            ayırt edilemiyordu; bu pin ARABANIN yeridir. */}
        <SymbolView name="car.fill" size={17} tintColor={colors.card} weight="regular" />
      </View>
      <View
        style={{
          width: 10,
          height: 10,
          marginTop: -5,
          borderRadius: 2,
          backgroundColor: colors.ink,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** §5.8 küçük POI pini: otopark ink, şarj yeşil (yeşil = para + şarj + canlı). */
function PoiPin({ kind, selected }: { kind: PoiKind; selected?: boolean }) {
  const { colors } = useTheme();
  const charging = kind === 'charging';
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        backgroundColor: charging ? colors.accentFill : colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
        // Seçili pin tam opak ve biraz büyük — hangisine baktığın belli olsun
        opacity: selected ? 1 : 0.9,
        transform: [{ scale: selected ? 1.25 : 1 }],
        // §2.2: krem harita üstündeki renkli işaret beyaz ring taşır
        borderWidth: 1.5,
        borderColor: colors.card,
      }}
    >
      {/* §5.13: emoji glyph yasak — şarj için SF Symbol bolt.fill */}
      {charging ? (
        <SymbolView name="bolt.fill" size={11} tintColor={colors.card} weight="regular" />
      ) : (
        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.card }}>P</Text>
      )}
    </View>
  );
}

export function MapboxCanvas() {
  const { colors, scheme } = useTheme();
  const session = useSessionStore((s) => s.session);
  const phase = useSessionStore((s) => s.phase);
  const pois = useDiscoveryStore((s) => s.pois);
  const filter = useDiscoveryStore((s) => s.filter);
  const pinTarget = useDiscoveryStore((s) => s.pinTarget);
  const pinToken = useDiscoveryStore((s) => s.pinToken);
  const followToken = useDiscoveryStore((s) => s.followToken);
  const load = useDiscoveryStore((s) => s.load);
  const selectedPoiId = useDiscoveryStore((s) => s.selectedPoiId);
  const selectPoi = useDiscoveryStore((s) => s.selectPoi);
  const pickingLocation = useSessionStore((s) => s.pickingLocation);
  const radiusM = useDiscoveryStore((s) => s.radiusM);
  const visiblePois = applyFilter(pois, filter, radiusM);
  const cameraRef = useRef<Camera>(null);

  const carCoords =
    session?.latitude != null && session.longitude != null
      ? ([session.longitude, session.latitude] as [number, number])
      : null;

  const active = phase !== 'idle';

  // Callback'ler içinden güncel değeri okumak için ref'ler (kapanış tuzağı yok).
  const followingRef = useRef(true);
  const userCoordsRef = useRef<[number, number] | null>(null);
  const hasCarRef = useRef(false);
  const carCoordsRef = useRef<[number, number] | null>(null);
  hasCarRef.current = carCoords !== null && active;
  carCoordsRef.current = carCoords;

  // Konumu KENDİMİZ dinleriz. `followUserLocation` + kontrollü zoom çakışınca
  // takip kilitleniyordu; imperatif setCamera ile tam kontrol sağlanır.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 4000 },
        (pos) => {
          const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          const first = userCoordsRef.current === null;
          userCoordsRef.current = c;
          // Takip modundayken (ve araba sahnede değilken) kamera kullanıcıyla gider.
          // İlk konumda her hâlükârda ortala — açılışta harita boş okyanusta kalmasın.
          if ((followingRef.current || first) && !hasCarRef.current) {
            cameraRef.current?.setCamera({ centerCoordinate: c, animationDuration: 500 });
            load({ latitude: c[1], longitude: c[0] });
          }
        },
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [load]);

  // Widget/Live Activity'den dönüşte harita boş kalıyordu: app arka plandayken
  // konum akışı askıya alınıyor, öne gelince kamera hiçbir komut almadığı için
  // sahne kurulmuyordu (kullanıcı bir şeye dokununca düzeliyordu). Öne gelir
  // gelmez kamerayı bilinen en iyi noktaya sür ve çevreyi tazele.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const car = hasCarRef.current ? carCoordsRef.current : null;
      const target = car ?? (followingRef.current ? userCoordsRef.current : null);
      if (!target) return;
      cameraRef.current?.setCamera({ centerCoordinate: target, animationDuration: 300 });
      if (!car) load({ latitude: target[1], longitude: target[0] });
    });
    return () => sub.remove();
  }, [load]);

  // Arama sonucu / POI: sabit koordinata git, takibi kes.
  useEffect(() => {
    if (pinToken === 0 || !pinTarget) return;
    followingRef.current = false;
    cameraRef.current?.setCamera({
      centerCoordinate: [pinTarget.longitude, pinTarget.latitude],
      zoomLevel: DEFAULT_ZOOM,
      animationDuration: 600,
    });
  }, [pinToken, pinTarget]);

  // Konuma dön butonu: takibe geri dön, kullanıcıya anında uç.
  useEffect(() => {
    if (followToken === 0) return;
    followingRef.current = true;
    const c = userCoordsRef.current;
    if (c) {
      cameraRef.current?.setCamera({ centerCoordinate: c, zoomLevel: DEFAULT_ZOOM, animationDuration: 600 });
      load({ latitude: c[1], longitude: c[0] });
    }
  }, [followToken, load]);

  // Oturum arabası: varken kameraya kilitle ve takibi kes; keşfe dönünce takip açılır.
  useEffect(() => {
    if (carCoords && active) {
      followingRef.current = false;
      cameraRef.current?.setCamera({ centerCoordinate: carCoords, zoomLevel: DEFAULT_ZOOM, animationDuration: 600 });
    } else if (phase === 'idle') {
      followingRef.current = true;
    }
    // carCoords referansı her render değişmesin diye bileşenlerine bağlanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carCoords?.[0], carCoords?.[1], active, phase]);

  const styleURL =
    scheme === 'dark'
      ? (MAPBOX_STYLE_URL_DARK ?? Mapbox.StyleURL.Dark)
      : (MAPBOX_STYLE_URL_LIGHT ?? Mapbox.StyleURL.Light);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={styleURL}
        // Mapbox kullanım şartları: wordmark + attribution ZORUNLU (kapatılamaz)
        logoEnabled
        attributionEnabled
        scaleBarEnabled={false}
        compassEnabled={false}
        // Pin bırakma modunda konumu haritanın MERKEZİ belirler: kullanıcı
        // haritayı kaydırır, artı işareti sabit durur.
        onCameraChanged={
          pickingLocation
            ? (state) => {
                const [longitude, latitude] = state.properties.center;
                useSessionStore.getState().setPickedCenter({ latitude, longitude });
              }
            : undefined
        }
      >
      {/* Kamera YALNIZ ref üzerinden sürülür (yukarıdaki efektler). Kontrollü
          zoomLevel/centerCoordinate + followUserLocation birlikteyken takibi
          kilitliyordu; hepsi kaldırıldı. */}
      <Camera ref={cameraRef} defaultSettings={{ zoomLevel: DEFAULT_ZOOM }} />
      <LocationPuck puckBearingEnabled puckBearing="heading" />

      {/* §7.2 keşif pinleri — aktif oturumda gizlenir, sahne arabaya ait olur */}
      {phase === 'idle' &&
        visiblePois.slice(0, 24).map((poi) => (
          <MarkerView
            key={poi.id}
            coordinate={[poi.longitude, poi.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={false}
          >
            {/* Pine dokunmak keşif panelini o otoparkın kartıyla değiştirir */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={poi.name ?? undefined}
              onPress={() => selectPoi(poi.id)}
              hitSlop={10}
            >
              <PoiPin kind={poi.kind} selected={poi.id === selectedPoiId} />
            </Pressable>
          </MarkerView>
        ))}

      {carCoords && !pickingLocation && (
        <MarkerView coordinate={carCoords} anchor={{ x: 0.5, y: 1 }}>
          <CarPin />
        </MarkerView>
      )}
      </MapView>

      {/* §7.5 aktif oturumda uniform scrim — dikey vignette YASAK (§6) */}
      {active && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
      )}
    </View>
  );
}

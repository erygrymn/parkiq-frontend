import Mapbox, { Camera, CircleLayer, LineLayer, LocationPuck, MapView, MarkerView, ShapeSource } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SPRING } from '../theme/motion';
import { CarPin } from '../components/CarPin';
import { MAPBOX_PUBLIC_TOKEN, MAPBOX_STYLE_URL_DARK, MAPBOX_STYLE_URL_LIGHT } from '../config';
import { hapticSelect } from '../lib/haptics';
import { buildMapStyle } from '../lib/mapStyle';
import { applyFilter, type PoiKind } from '../lib/parkingPoi';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';
import { CROSSFADE_MS } from '../theme/motion';
import { sheetIndex } from '../theme/sheetMotion';
import { useTheme } from '../theme';
import { lightColors } from '../theme/tokens';

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

/** §4 POI pini: otopark ink, şarj yeşil; beyaz ring; seçiliyken 1.25× SPRING (§3). */
function PoiPin({ kind, selected }: { kind: PoiKind; selected?: boolean }) {
  const { colors } = useTheme();
  const charging = kind === 'charging';
  const scale = useSharedValue(selected ? 1.25 : 1);
  useEffect(() => {
    scale.value = withSpring(selected ? 1.25 : 1, SPRING);
  }, [selected, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        {
          width: 22,
          height: 22,
          borderRadius: 7,
          borderCurve: 'continuous',
          backgroundColor: charging ? colors.accentFill : colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: selected ? 1 : 0.9,
          borderWidth: 1.5,
          borderColor: lightColors.card,
        },
        animated,
      ]}
    >
      {/* §5.13: emoji glyph yasak — şarj için SF Symbol bolt.fill */}
      {charging ? (
        <SymbolView name="bolt.fill" size={11} tintColor={colors.card} weight="regular" />
      ) : (
        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.card }}>P</Text>
      )}
    </Animated.View>
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
  const insets = useSafeAreaInsets();

  const carCoords =
    session?.latitude != null && session.longitude != null
      ? ([session.longitude, session.latitude] as [number, number])
      : null;

  const active = phase !== 'idle';
  const finding = phase === 'finding';
  const userFix = useUiStore((s) => s.userFix);
  const historyOpen = useUiStore((s) => s.historyOpen);
  const historySpots = useUiStore((s) => s.historySpots);
  const historySelectedId = useUiStore((s) => s.historySelectedId);
  const { height: windowHeight } = useWindowDimensions();

  // §4 derinlik davranıştan: sheet büyürken harita 0.97'ye küçülür ve scrim gelir; aktif
  // oturumda scrim sabit kalır. Yalnız transform/opacity — Mapbox view'ı yeniden boyutlanmaz.
  const activeScrim = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    activeScrim.value = withTiming(active ? 1 : 0, { duration: CROSSFADE_MS });
  }, [active, activeScrim]);
  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(sheetIndex.value, [0, 1], [1, 0.97], 'clamp') }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.max(activeScrim.value, interpolate(sheetIndex.value, [0.4, 1], [0, 1], 'clamp')),
  }));

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
      // Açılışta dünya görünümü kalmasın: son bilinen konum varsa harita anında oraya oturur.
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled && userCoordsRef.current === null) {
          const c: [number, number] = [last.coords.longitude, last.coords.latitude];
          userCoordsRef.current = c;
          cameraRef.current?.setCamera({ centerCoordinate: c, zoomLevel: DEFAULT_ZOOM, animationDuration: 0 });
          load({ latitude: c[1], longitude: c[0] });
        }
      } catch {
        /* son konum yoksa canlı düzeltme bekler */
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 4000 },
        (pos) => {
          const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          const first = userCoordsRef.current === null;
          userCoordsRef.current = c;
          // Takip modundayken (ve araba sahnede değilken) kamera kullanıcıyla gider.
          // İlk konumda her hâlükârda ortala — açılışta harita boş okyanusta kalmasın.
          if ((followingRef.current || first) && !hasCarRef.current) {
            // İlk düzeltmede zoom da verilir; yoksa kamera dünya ölçeğinde kalıyordu.
            cameraRef.current?.setCamera(
              first
                ? { centerCoordinate: c, zoomLevel: DEFAULT_ZOOM, animationDuration: 0 }
                : { centerCoordinate: c, animationDuration: 500 },
            );
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

  // §7.6 finding: kamera kullanıcı + arabayı birlikte çerçeveler (faza girişte ve ilk düzeltmede).
  const framedRef = useRef(false);
  useEffect(() => {
    if (!finding) {
      framedRef.current = false;
      return;
    }
    if (framedRef.current || !carCoords || !userFix) return;
    framedRef.current = true;
    const lngs = [carCoords[0], userFix.longitude];
    const lats = [carCoords[1], userFix.latitude];
    cameraRef.current?.setCamera({
      bounds: {
        ne: [Math.max(...lngs), Math.max(...lats)],
        sw: [Math.min(...lngs), Math.min(...lats)],
      },
      padding: { paddingTop: 140, paddingBottom: 380, paddingLeft: 64, paddingRight: 64 },
      animationDuration: 600,
    });
    // carCoords referansı bileşenlerine bağlanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finding, carCoords?.[0], carCoords?.[1], userFix?.latitude, userFix?.longitude]);

  // §7.9 Geçmiş: noktalar tek ShapeSource (native daire katmanı), seçili olan gerçek araba pini.
  // Açılışta hepsi çerçevelenir, satır seçilince kamera o noktaya uçar; sheet %62'de olduğu
  // için alt padding görünür alanı üst üçte bire taşır.
  const historyPadding = { paddingTop: insets.top + 72, paddingBottom: Math.round(windowHeight * 0.62) + 24, paddingLeft: 48, paddingRight: 48 };
  const selectedSpot = historySelectedId ? (historySpots.find((s) => s.id === historySelectedId) ?? null) : null;
  const historyWasOpenRef = useRef(false);
  useEffect(() => {
    if (!historyOpen) {
      // Kapanış: sahne neyse ona dön — keşifte kullanıcıya (takip açılır), oturumda arabaya.
      if (historyWasOpenRef.current) {
        historyWasOpenRef.current = false;
        const car = hasCarRef.current ? carCoordsRef.current : null;
        const target = car ?? userCoordsRef.current;
        if (!car && phase === 'idle') followingRef.current = true;
        if (target) cameraRef.current?.setCamera({ centerCoordinate: target, zoomLevel: DEFAULT_ZOOM, animationDuration: 600 });
      }
      return;
    }
    historyWasOpenRef.current = true;
    // Konum takibi kameraya dokunmasın; geçmiş noktaları sahnenin sahibi.
    followingRef.current = false;
    if (selectedSpot) {
      cameraRef.current?.setCamera({
        centerCoordinate: [selectedSpot.longitude, selectedSpot.latitude],
        zoomLevel: 16,
        padding: historyPadding,
        animationDuration: 600,
      });
      return;
    }
    if (historySpots.length === 0) return;
    if (historySpots.length === 1) {
      cameraRef.current?.setCamera({
        centerCoordinate: [historySpots[0].longitude, historySpots[0].latitude],
        zoomLevel: 15,
        padding: historyPadding,
        animationDuration: 600,
      });
      return;
    }
    const lngs = historySpots.map((s) => s.longitude);
    const lats = historySpots.map((s) => s.latitude);
    cameraRef.current?.setCamera({
      bounds: { ne: [Math.max(...lngs), Math.max(...lats)], sw: [Math.min(...lngs), Math.min(...lats)] },
      padding: historyPadding,
      animationDuration: 600,
    });
    // padding nesnesi her render değişir; tetik yalnız açılış, nokta listesi ve seçim
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen, historySpots, selectedSpot?.id]);

  const historyShape =
    historyOpen && historySpots.length > 0
      ? {
          type: 'FeatureCollection' as const,
          features: historySpots
            .filter((s) => s.id !== historySelectedId)
            .map((s) => ({
              type: 'Feature' as const,
              id: s.id,
              properties: {},
              geometry: { type: 'Point' as const, coordinates: [s.longitude, s.latitude] },
            })),
        }
      : null;

  const findLine =
    finding && carCoords && userFix
      ? {
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'LineString' as const, coordinates: [[userFix.longitude, userFix.latitude], carCoords] },
        }
      : null;

  // §6: Studio URL verilmişse o; yoksa gömülü krem editöryal stil (tema başına bir kez üretilir).
  const customStyleURL = scheme === 'dark' ? MAPBOX_STYLE_URL_DARK : MAPBOX_STYLE_URL_LIGHT;
  const styleJSON = useMemo(() => (customStyleURL ? undefined : buildMapStyle(scheme)), [customStyleURL, scheme]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, mapStyle]}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={customStyleURL ?? undefined}
        styleJSON={styleJSON}
        // Mapbox kullanım şartları: wordmark + attribution ZORUNLU (kapatılamaz)
        logoEnabled
        attributionEnabled
        // Sheet haritanın altını kapatıyor: Mapbox logosu ve atıf üst solda görünür kalır (ToS).
        logoPosition={{ top: insets.top + 8, left: 12 }}
        attributionPosition={{ top: insets.top + 8, left: 108 }}
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

      {/* §7.9 geçmiş noktaları: mürekkep daire + beyaz ring; seçili olan aşağıda araba pini olarak. */}
      {historyShape && (
        <ShapeSource id="history-spots" shape={historyShape}>
          <CircleLayer
            id="history-spots-layer"
            style={{
              circleRadius: 6,
              circleColor: colors.ink,
              circleStrokeWidth: 2,
              circleStrokeColor: lightColors.card,
              circleOpacity: 0.9,
            }}
          />
        </ShapeSource>
      )}
      {historyOpen && selectedSpot && (
        <MarkerView coordinate={[selectedSpot.longitude, selectedSpot.latitude]} anchor={{ x: 0.5, y: 1 }} allowOverlap allowOverlapWithPuck>
          <CarPin />
        </MarkerView>
      )}

      {/* §7.2 keşif pinleri — aktif oturumda ve geçmiş sahnesinde gizlenir */}
      {phase === 'idle' &&
        !historyOpen &&
        visiblePois.slice(0, 24).map((poi) => (
          <MarkerView
            key={poi.id}
            coordinate={[poi.longitude, poi.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={false}
            // Kullanıcının dibindeki otopark da görünsün; varsayılan puck ile çakışınca gizliyor.
            allowOverlapWithPuck
          >
            {/* Pine dokunmak keşif panelini o otoparkın kartıyla değiştirir */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={poi.name ?? undefined}
              onPress={() => {
                hapticSelect();
                selectPoi(poi.id);
              }}
              hitSlop={10}
            >
              <PoiPin kind={poi.kind} selected={poi.id === selectedPoiId} />
            </Pressable>
          </MarkerView>
        ))}

      {/* §7.6 kullanıcıdan arabaya düz hairline çizgi (kesikli değil). */}
      {findLine && (
        <ShapeSource id="find-line" shape={findLine}>
          <LineLayer id="find-line-layer" style={{ lineColor: colors.ink, lineWidth: 2, lineOpacity: 0.9, lineCap: 'round' }} />
        </ShapeSource>
      )}

      {carCoords && !pickingLocation && (
        // allowOverlapWithPuck şart: araba çoğu zaman tam kullanıcının altında ve varsayılan
        // davranış puck ile çakışan işareti GİZLİYOR — pin videoda bu yüzden yoktu.
        <MarkerView coordinate={carCoords} anchor={{ x: 0.5, y: 1 }} allowOverlap allowOverlapWithPuck>
          <CarPin />
        </MarkerView>
      )}
      </MapView>

      {/* §7.5 uniform scrim: aktif oturumda sabit, keşifte sheet ile gelir — dikey vignette YASAK */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]} />
    </Animated.View>
  );
}

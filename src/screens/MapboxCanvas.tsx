import Mapbox, { Camera, CircleLayer, LineLayer, LocationPuck, MapView, MarkerView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { getLocales } from 'expo-localization';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../components/Icon';
import { SPRING } from '../theme/motion';
import { CarPin } from '../components/CarPin';
import { MAPBOX_PUBLIC_TOKEN, MAPBOX_STYLE_URL_DARK, MAPBOX_STYLE_URL_LIGHT } from '../config';
import { distanceMeters, formatDistance } from '../lib/geo';
import { getLocale, t } from '../localization';
import { hapticSelect } from '../lib/haptics';
import { buildMapStyle } from '../lib/mapStyle';
import { applyFilter, type PoiKind } from '../lib/parkingPoi';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';
import { CROSSFADE_MS } from '../theme/motion';
import { sheetIndex, sheetTop } from '../theme/sheetMotion';
import { useTheme } from '../theme';
import { glass, lightColors, radius, spacing } from '../theme/tokens';

// Gerçek harita katmanı — YALNIZ native build'de yüklenir (MapCanvas koruması).
// Expo Go bu dosyayı hiç require etmez.

if (!MAPBOX_PUBLIC_TOKEN) {
  // Sessiz boş harita yerine net uyarı: token build ortamından gelmemiş.
  console.warn(
    'EXPO_PUBLIC_MAPBOX_TOKEN is empty — the map will not render. Set it in .env or your shell profile.',
  );
}
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
// Mapbox SDK varsayılan olarak kendi telemetrisini toplar (konum + cihaz verisi,
// Mapbox'ın amaçları için). Kapalı: ParkIQ'nun gizlilik etiketinde "üçüncü taraf
// konum topluyor" satırı olmasın, kullanıcının konumu yalnız harita karosu
// isteğinde ve rıza verdiği tarife havuzunda dolaşsın.
Mapbox.setTelemetryEnabled(false);

/** Kaydırma durduktan sonra sorgu için beklenen süre (ms). */
const PAN_SETTLE_MS = 700;

const DEFAULT_ZOOM = 15.5;

/**
 * Konum yokken (izin reddi) kameranın açılış noktası: cihaz bölgesinin ülkesi. Eskiden (0,0)
 * okyanusunda 15.5 yakınlıkta açılıyordu — izni vermeyen kullanıcının tek yolu olan "haritadan
 * pin bırak", önce okyanustan kendi şehrine kaydırmak demekti.
 */
const REGION_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  TR: { center: [35.2, 39.0], zoom: 5 },
  US: { center: [-98.5, 39.8], zoom: 3.3 },
  GB: { center: [-2.5, 54.0], zoom: 4.8 },
  DE: { center: [10.4, 51.1], zoom: 5 },
  FR: { center: [2.4, 46.6], zoom: 5 },
  ES: { center: [-3.7, 40.2], zoom: 5 },
  IT: { center: [12.6, 42.5], zoom: 5 },
  NL: { center: [5.3, 52.2], zoom: 6.5 },
  SE: { center: [16.0, 62.0], zoom: 4 },
  JP: { center: [138.3, 36.2], zoom: 4.5 },
  KR: { center: [127.8, 36.4], zoom: 6 },
  TW: { center: [121.0, 23.7], zoom: 6.5 },
  BR: { center: [-51.9, -14.2], zoom: 3.3 },
  PT: { center: [-8.2, 39.6], zoom: 5.8 },
  MX: { center: [-102.5, 23.6], zoom: 4 },
  CA: { center: [-96.8, 56.1], zoom: 3 },
  AU: { center: [134.5, -25.7], zoom: 3.3 },
};

function regionView(): { center: [number, number]; zoom: number } {
  try {
    const region = getLocales()[0]?.regionCode ?? '';
    return REGION_VIEW[region] ?? { center: [10, 30], zoom: 1.5 };
  } catch {
    return { center: [10, 30], zoom: 1.5 };
  }
}

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
        <Icon name="bolt.fill" size={11} color={colors.card} weight="regular" />
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
  const discoveryState = useDiscoveryStore((s) => s.state);
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
  const arOpen = useUiStore((s) => s.arOpen);
  const historyOpen = useUiStore((s) => s.historyOpen);
  const historySpots = useUiStore((s) => s.historySpots);
  const historySelectedId = useUiStore((s) => s.historySelectedId);
  const { height: windowHeight } = useWindowDimensions();

  // §4 derinlik davranıştan: sheet büyürken harita 0.97'ye küçülür ve scrim gelir; aktif
  // oturumda scrim sabit kalır. Yalnız transform/opacity — Mapbox view'ı yeniden boyutlanmaz.
  /* Arabamı Bul DIŞINDA sabit scrim: orada harita arka plandır. `finding` sırasında ise
     harita aranan şeyin kendisi — kullanıcı kendi noktasıyla arabayı görmek istiyor ve
     üstüne perde çekmek tam da işi engelliyor. O fazda perde yalnız sheet yükselince gelir. */
  const scrimBase = active && !finding;
  const activeScrim = useSharedValue(scrimBase ? 1 : 0);
  useEffect(() => {
    activeScrim.value = withTiming(scrimBase ? 1 : 0, { duration: CROSSFADE_MS });
  }, [scrimBase, activeScrim]);
  // Sheet yükselirken harita ÖLÇEKLENMEZ: küçültme kenarları açıp "app zoom-out" gibi görünüyordu.
  // Derinlik yalnız scrim'den gelir (§4).
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.max(activeScrim.value, interpolate(sheetIndex.value, [0.4, 1], [0, 1], 'clamp')),
  }));

  // Callback'ler içinden güncel değeri okumak için ref'ler (kapanış tuzağı yok).
  const followingRef = useRef(true);
  /** Kaydırma bitmeden sorgu atmamak için; her olay sayacı sıfırlar. */
  const panTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (panTimer.current) clearTimeout(panTimer.current); }, []);
  const userCoordsRef = useRef<[number, number] | null>(null);
  const hasCarRef = useRef(false);
  const carCoordsRef = useRef<[number, number] | null>(null);
  hasCarRef.current = carCoords !== null && active;
  carCoordsRef.current = carCoords;

  /* İzin sonradan (Ayarlar'dan) verildiğinde konum akışı hiç kurulmuyordu: harita, liste ve
     "konumuma dön" uygulama yeniden başlayana kadar ölü kalıyordu. Akış kurulamadıysa ön plana
     her dönüşte yeniden denenir; ilk denemeden sonra izin yalnız OKUNUR, pencere açılmaz. */
  const [locationAttempt, setLocationAttempt] = useState(0);
  const watchingRef = useRef(false);
  const initialView = useMemo(() => {
    const view = regionView();
    return { centerCoordinate: view.center, zoomLevel: view.zoom };
  }, []);

  // Konumu KENDİMİZ dinleriz. `followUserLocation` + kontrollü zoom çakışınca
  // takip kilitleniyordu; imperatif setCamera ile tam kontrol sağlanır.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    void (async () => {
      const { status } =
        locationAttempt === 0
          ? await Location.requestForegroundPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();
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
      if (cancelled) {
        sub.remove();
        return;
      }
      watchingRef.current = true;
    })();
    return () => {
      cancelled = true;
      sub?.remove();
      watchingRef.current = false;
    };
  }, [load, locationAttempt]);

  // Widget/Live Activity'den dönüşte harita boş kalıyordu: app arka plandayken
  // konum akışı askıya alınıyor, öne gelince kamera hiçbir komut almadığı için
  // sahne kurulmuyordu (kullanıcı bir şeye dokununca düzeliyordu). Öne gelir
  // gelmez kamerayı bilinen en iyi noktaya sür ve çevreyi tazele.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (!watchingRef.current) setLocationAttempt((n) => n + 1);
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

  /**
   * §7.6 finding: kamera kullanıcı + arabayı BİRLİKTE çerçeveler ve kullanıcı yürüdükçe
   * çerçeveyi tazeler. Kullanıcı haritayı kendi elleriyle kaydırırsa (`findFollow`
   * kapanır) karışılmaz; "ortala" düğmesi ya da paneli indirip kaldırmak takibi geri açar.
   *
   * Takip kendi bayrağını kullanır: `followingRef` aktif oturumda HER ZAMAN kapalı (kamera
   * arabaya kilitli) olduğu için ona bakan eski koşul ilk çerçeveden sonra hiç geçmiyordu —
   * "kamera takip etmiyor" düzeltmesi bu yüzden hiç çalışmamıştı.
   */
  /* Panel kademesi değişince çerçeve tazelenir: kullanıcı paneli indirip kaldırdığında
     harita yeni boşluğa göre yeniden ortalanır. Sürekli değil, kademe başına bir kez. */
  const [sheetStep, setSheetStep] = useState(0);
  useAnimatedReaction(
    () => Math.round(sheetIndex.value),
    (step, previous) => {
      if (previous !== null && step !== previous) runOnJS(setSheetStep)(step);
    },
  );

  const findFollow = useUiStore((s) => s.findFollow);
  const firstFrameRef = useRef(false);
  const framedStepRef = useRef(sheetStep);
  useEffect(() => {
    if (!finding) {
      firstFrameRef.current = false;
      if (!useUiStore.getState().findFollow) useUiStore.getState().setFindFollow(true);
      return;
    }
    if (framedStepRef.current !== sheetStep) {
      framedStepRef.current = sheetStep;
      // Paneli indirip kaldırmak da takibe döndürür (etki yeni değerle yeniden koşar).
      if (!useUiStore.getState().findFollow) {
        useUiStore.getState().setFindFollow(true);
        return;
      }
    }
    // AR açıkken harita kameranın arkasında: çerçevelemek boşuna iş. Kapanınca yeniden çerçeveler.
    if (!carCoords || arOpen) return;
    const first = !firstFrameRef.current;
    if (!first && !findFollow) return;
    if (!userFix) {
      // Konum yoksa (kapalı otopark, izin yok) "ortala" en azından arabaya döner.
      if (first) return;
      const top = sheetTop.value;
      cameraRef.current?.setCamera({
        centerCoordinate: carCoords,
        zoomLevel: DEFAULT_ZOOM,
        padding: {
          paddingTop: insets.top + spacing.s40,
          paddingBottom: top > 0 ? Math.round(windowHeight - top + spacing.s24) : 380,
          paddingLeft: 64,
          paddingRight: 64,
        },
        animationDuration: 400,
      });
      return;
    }
    firstFrameRef.current = true;
    const lngs = [carCoords[0], userFix.longitude];
    const lats = [carCoords[1], userFix.latitude];
    /* Alt boşluk PANELİN GERÇEK yüksekliğinden gelir: kullanıcı ve araba, panelin
       üstünde kalan şeride ortalanır. Sabit 380 px'ti — panel bundan yüksekken araba
       panelin altında kalıyordu, alçakken harita boşuna sıkışıyordu. Panel henüz
       ölçülmediyse (0) eski sabit kullanılır. */
    const top = sheetTop.value;
    const paddingBottom = top > 0 ? Math.round(windowHeight - top + spacing.s24) : 380;
    cameraRef.current?.setCamera({
      bounds: {
        ne: [Math.max(...lngs), Math.max(...lats)],
        sw: [Math.min(...lngs), Math.min(...lats)],
      },
      padding: { paddingTop: insets.top + spacing.s40, paddingBottom, paddingLeft: 64, paddingRight: 64 },
      animationDuration: first ? 600 : 400,
    });
    // carCoords referansı bileşenlerine bağlanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finding, sheetStep, arOpen, findFollow, carCoords?.[0], carCoords?.[1], userFix?.latitude, userFix?.longitude]);

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

  /* Çizginin üstünde aradaki mesafe: kullanıcı "ne kadar kaldı"yı paneli açmadan görsün.
     Etiket özelliğin içinde taşınır, SymbolLayer onu çizginin ortasına oturtur. */
  const findLine =
    finding && carCoords && userFix
      ? {
          type: 'Feature' as const,
          properties: {
            label: formatDistance(
              distanceMeters(
                { latitude: userFix.latitude, longitude: userFix.longitude },
                { latitude: carCoords[1], longitude: carCoords[0] },
              ),
              getLocale(),
            ),
          },
          geometry: { type: 'LineString' as const, coordinates: [[userFix.longitude, userFix.latitude], carCoords] },
        }
      : null;

  // §6: Studio URL verilmişse o; yoksa gömülü krem editöryal stil (tema başına bir kez üretilir).
  const customStyleURL = scheme === 'dark' ? MAPBOX_STYLE_URL_DARK : MAPBOX_STYLE_URL_LIGHT;
  const styleJSON = useMemo(() => (customStyleURL ? undefined : buildMapStyle(scheme)), [customStyleURL, scheme]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={customStyleURL ?? undefined}
        styleJSON={styleJSON}
        // Mapbox kullanım şartları: wordmark + attribution ZORUNLU (kapatılamaz)
        logoEnabled
        attributionEnabled
        // Sheet haritanın altını kapatıyor: Mapbox logosu ve atıf üst solda görünür kalır (ToS).
        // Mapbox şartları: logo + attribution KALDIRILAMAZ. Sağ altta, panelin arkasında
        // duruyorlar — panel yükselince örtülürler, sahneyi bölmezler. Bir ara panelin
        // üstüne alınmıştı ve ekranın ortasında asılı kalıyordu.
        logoPosition={{ bottom: insets.bottom + 8, right: 12 }}
        attributionPosition={{ bottom: insets.bottom + 8, right: 96 }}
        scaleBarEnabled={false}
        compassEnabled={false}
        // Pin bırakma modunda konumu haritanın MERKEZİ belirler: kullanıcı
        // haritayı kaydırır, artı işareti sabit durur.
        onCameraChanged={(state) => {
          const [longitude, latitude] = state.properties.center;
          if (pickingLocation) {
            useSessionStore.getState().setPickedCenter({ latitude, longitude });
            return;
          }
          // Arabamı Bul'da haritayı elle kaydıran kullanıcı oraya bakıyor: çerçeveleme durur.
          if (finding && state.gestures.isGestureActive) {
            if (useUiStore.getState().findFollow) useUiStore.getState().setFindFollow(false);
            return;
          }
          if (phase !== 'idle') return;
          /* Kullanıcı haritayı kendi kaydırdıysa oraya bakıyor demektir: takip bırakılır ve el
             çekilince o merkezin otoparkları getirilir.
             Takip modu (açılıştaki varsayılan) elle kaydırmayı HİÇ fark etmiyordu: sorgu yalnız
             `followingRef` kapalıyken atılıyordu, onu da yalnız arama kapatıyordu — kullanıcı
             bir yeri görmek için önce adres yazmak zorundaydı. Üstüne bir sonraki GPS düzeltmesi
             kamerayı kullanıcıya geri çekiyordu. Kamera bizim komutumuzla hareket ettiyse
             (takip, çerçeveleme) jest yoktur, karışılmaz.
             Gecikme şart: kaydırma sırasında saniyede onlarca olay geliyor ve Overpass
             zaten yavaş; yalnız el çekildikten sonra tek sorgu atılır. */
          if (state.gestures.isGestureActive) followingRef.current = false;
          if (followingRef.current) return;
          if (panTimer.current) clearTimeout(panTimer.current);
          panTimer.current = setTimeout(() => {
            useDiscoveryStore.getState().panTo({ latitude, longitude });
          }, PAN_SETTLE_MS);
        }}
      >
      {/* Kamera YALNIZ ref üzerinden sürülür (yukarıdaki efektler). Kontrollü
          zoomLevel/centerCoordinate + followUserLocation birlikteyken takibi
          kilitliyordu; hepsi kaldırıldı. */}
      <Camera ref={cameraRef} defaultSettings={initialView} />
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
          <SymbolLayer
            id="find-line-label"
            style={{
              textField: ['get', 'label'],
              symbolPlacement: 'line-center',
              textSize: 13,
              textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
              textColor: colors.ink,
              // Çizginin üstüne biniyor; halka onu her zemin renginde okunur tutuyor.
              textHaloColor: colors.card,
              textHaloWidth: 2,
              textOffset: [0, -0.9],
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />
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

      {/* Kaydırılan yerin otoparkları sorulurken. Overpass birkaç saniye sürebiliyor; geri
          bildirim olmayınca kullanıcı "yine gelmedi" sanıp haritayı yeniden kaydırıyordu — her
          kaydırma sorguyu baştan başlatıyor. Cam değil düz dolgu: üstteki kareler cam bütçesini
          (§4: ekranda ≤3 BlurView) kullanıyor. */}
      {discoveryState === 'loading' && phase === 'idle' && !historyOpen && !pickingLocation && (
        <Animated.View
          entering={FadeIn.duration(CROSSFADE_MS)}
          exiting={FadeOut.duration(CROSSFADE_MS)}
          pointerEvents="none"
          style={{ position: 'absolute', top: insets.top + spacing.s12, left: 0, right: 0, alignItems: 'center' }}
        >
          <View
            style={{
              height: 32,
              paddingHorizontal: spacing.s12,
              borderRadius: radius.rFull,
              justifyContent: 'center',
              backgroundColor: scheme === 'dark' ? glass.fallbackDark : glass.fallbackLight,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{t('poiSearching')}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

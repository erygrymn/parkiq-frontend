import Mapbox, { Camera, LocationPuck, MapView, MarkerView } from '@rnmapbox/maps';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
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
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.card }}>P</Text>
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
function PoiPin({ kind }: { kind: PoiKind }) {
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
        opacity: 0.9,
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
  const visiblePois = applyFilter(pois, filter);

  const styleURL =
    scheme === 'dark'
      ? (MAPBOX_STYLE_URL_DARK ?? Mapbox.StyleURL.Dark)
      : (MAPBOX_STYLE_URL_LIGHT ?? Mapbox.StyleURL.Light);

  const carCoords =
    session?.latitude != null && session.longitude != null
      ? ([session.longitude, session.latitude] as [number, number])
      : null;

  // Oturum varken kamera arabaya kilitlenir; yokken kullanıcıyı takip eder.
  const followUser = carCoords === null || phase === 'idle';

  const active = phase !== 'idle';

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
      >
      <Camera
        defaultSettings={{ zoomLevel: DEFAULT_ZOOM }}
        zoomLevel={DEFAULT_ZOOM}
        followUserLocation={followUser}
        followZoomLevel={DEFAULT_ZOOM}
        centerCoordinate={followUser ? undefined : (carCoords ?? undefined)}
        animationDuration={600}
      />
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
            <PoiPin kind={poi.kind} />
          </MarkerView>
        ))}

      {carCoords && (
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

import BottomSheet, {
  BottomSheetModalProvider,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import Animated, { FadeIn, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { AUTO_PARK_KIND } from './src/lib/notifications';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { t } from './src/localization';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryCta } from './src/components/Buttons';
import { CarPin } from './src/components/CarPin';
import { Glass } from './src/components/motion/Glass';
import { PhotoViewer } from './src/components/motion/PhotoViewer';
import { ProStamp } from './src/components/motion/ProStamp';
import { ArOverlay } from './src/screens/ArOverlay';
import { FindingSheet } from './src/sheets/FindingSheet';
import { HistoryScene } from './src/sheets/HistoryScene';
import { useUiStore } from './src/state/uiStore';
import { consumePendingEnd, refreshSessionActivity } from './src/lib/liveActivity';
import { CROSSFADE_MS, SPRING } from './src/theme/motion';
import { sheetIndex } from './src/theme/sheetMotion';
import { PressScale } from './src/components/motion/PressScale';
import { Caption } from './src/components/Typography';
import { initAnalytics, trackPaywallShown } from './src/lib/analytics';
import { ForceUpdateScreen, useForcedUpdate } from './src/screens/ForceUpdateGate';
import { MapCanvas } from './src/screens/MapCanvas';
import { Onboarding } from './src/screens/Onboarding';
import { FilterSheet } from './src/sheets/FilterSheet';
import { PaywallSheet } from './src/sheets/PaywallSheet';
import { PoiSheet } from './src/sheets/PoiSheet';
import { SettingsSheet } from './src/sheets/SettingsSheet';
import { ActiveSheet, EndedSheet, IdleSheet, ParkingSheet } from './src/sheets/SessionSheets';
import { startAutoDetect } from './modules/parkiq-autodetect';
import { useDiscoveryStore } from './src/state/discoveryStore';
import { useNetworkStore } from './src/state/networkStore';
import { useIsPremium, usePremiumStore } from './src/state/premiumStore';
import { useSessionStore, type PickTarget, type SessionPhase } from './src/state/sessionStore';
import { useSettingsStore } from './src/state/settingsStore';
import { ThemeProvider, useTheme } from './src/theme';
import { radius, shadow, spacing } from './src/theme/tokens';

// design.md §7 mimarisi: tab bar yok — Root = MapCanvas + her zaman açık,
// durum-güdümlü bottom sheet. Geçmiş = pageSheet (§7.8).
//
// Panel yüksekliği İÇERİKTEN gelir (enableDynamicSizing): sabit yüzdeler
// kutlama/oturum gibi kısa içeriklerde kocaman boşluk bırakıyordu. Keşifte
// ek olarak tek bir kompakt kademe var — arama çubuğu + "Park Ettim" kadar;
// yukarı çekilince filtreler ve otopark listesi açılır.

const IDLE_COMPACT_HEIGHT = 172;

/** İçerik ekranı aşarsa panel burada durur ve içerik kaydırılır. */
const MAX_SHEET_RATIO = 0.88;
/** Geçmiş sahnesinde harita görünür kalsın diye daha alçak tavan. */
const HISTORY_SHEET_RATIO = 0.62;

function FloatingIconButton({
  symbol,
  label,
  onPress,
}: {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
}) {
  const { colors, scheme } = useTheme();
  // design.md §5 kare cam ikon buton: gerçek blur, 22pt Light sembol, pressed 0.97 (PressScale).
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        borderRadius: radius.r12,
        shadowColor: shadow.s2.ambient.color,
        shadowOffset: { width: 0, height: shadow.s2.ambient.offsetY },
        shadowRadius: shadow.s2.ambient.blur,
        shadowOpacity: scheme === 'dark' ? 0 : 1,
      }}
    >
      <Glass radius={radius.r12} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <SymbolView name={symbol} size={22} tintColor={colors.ink} weight="light" />
      </Glass>
    </PressScale>
  );
}

function SheetContent({ phase, onOpenPaywall }: { phase: SessionPhase; onOpenPaywall: () => void }) {
  // Haritada bir pin seçiliyse keşif panelinin yerini o otoparkın kartı alır.
  const selectedPoiId = useDiscoveryStore((s) => s.selectedPoiId);
  const pois = useDiscoveryStore((s) => s.pois);
  const selectedPoi = selectedPoiId ? (pois.find((p) => p.id === selectedPoiId) ?? null) : null;
  // §7.9: Geçmiş fazdan bağımsız bir sahnedir; açıkken sheet'in içeriği odur, harita üstte kalır.
  const historyOpen = useUiStore((s) => s.historyOpen);
  const historySelectedId = useUiStore((s) => s.historySelectedId);

  // design.md §3 sheet morph: yükseklik gorhom spring'i ile, içerik 200 ms fade ile gelir.
  // Çıkış animasyonu yok: eski içerik bir an daha kalsa dinamik yükseklik ikiye katlanırdı.
  const content = (() => {
    if (historyOpen) return <HistoryScene onOpenPaywall={onOpenPaywall} />;
    switch (phase) {
      case 'idle':
        return selectedPoi ? <PoiSheet poi={selectedPoi} /> : <IdleSheet onOpenPaywall={onOpenPaywall} />;
      case 'parking':
        return <ParkingSheet onOpenPaywall={onOpenPaywall} />;
      case 'active':
        return <ActiveSheet onOpenPaywall={onOpenPaywall} />;
      case 'finding':
        return <FindingSheet onOpenPaywall={onOpenPaywall} />;
      case 'ended':
        // Kutlama kök seviyede kapak olarak çizilir; panel boş kalır.
        return null;
    }
  })();
  if (!content) return null;
  const key = historyOpen
    ? `history:${historySelectedId ?? 'list'}`
    : phase === 'idle'
      ? selectedPoi
        ? `poi:${selectedPoi.id}`
        : 'idle'
      : phase;
  return (
    <Animated.View key={key} entering={FadeIn.duration(CROSSFADE_MS)}>
      {content}
    </Animated.View>
  );
}

/**
 * Haritadan pin bırakma katmanı: harita altta kayar, artı işareti ekranın
 * ORTASINDA sabit durur. Sürüklenebilir marker yerine bu kalıp seçildi — parmak
 * hedefi kapatmaz ve tek elle kullanılır.
 */
function PickLocationLayer({ target }: { target: PickTarget }) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { cancelPickingLocation, confirmPickedLocation, useMyLocationForPark } = useSessionStore.getState();
  const forPark = target === 'park';

  return (
    <>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Park: gerçek araba pini (marka işareti); alan seçimi: mürekkep büyüteç karesi.
              Ucun altındaki yeşil nokta, koordinatın tam olarak nereye düşeceğini gösterir. */}
          {forPark ? (
            <CarPin />
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.r12,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SymbolView name="magnifyingglass" size={17} tintColor={colors.card} weight="regular" />
            </View>
          )}
          <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: colors.accentFill }} />
        </View>
      </View>

      <View
        style={{
          position: 'absolute',
          left: spacing.s20,
          right: spacing.s20,
          bottom: insets.bottom + spacing.s20,
          gap: spacing.s8,
          padding: spacing.s16,
          borderRadius: radius.r24,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          shadowColor: shadow.s2.ambient.color,
          shadowOffset: { width: 0, height: shadow.s2.ambient.offsetY },
          shadowRadius: shadow.s2.ambient.blur,
          shadowOpacity: scheme === 'dark' ? 0 : 1,
        }}
      >
        <Caption>{t(forPark ? 'pickOnMapHint' : 'pickAreaHint')}</Caption>
        <PrimaryCta label={t(forPark ? 'usePin' : 'useThisArea')} onPress={confirmPickedLocation} />
        {/* Konum düzeltmenin tek yüzeyi burası: "konumumu kullan" da bu kartta, formda ayrı buton yok. */}
        {forPark && (
          <GhostButton
            label={t('useMyLocation')}
            onPress={() => {
              useMyLocationForPark();
              cancelPickingLocation();
            }}
          />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={cancelPickingLocation}
          hitSlop={8}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>{t('cancel')}</Text>
        </Pressable>
      </View>
    </>
  );
}

function Root() {
  const { colors, scheme } = useTheme();
  const phase = useSessionStore((s) => s.phase);
  const pickingLocation = useSessionStore((s) => s.pickingLocation);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const arOpen = useUiStore((s) => s.arOpen);
  const historyOpen = useUiStore((s) => s.historyOpen);
  const sheetSprings = useBottomSheetSpringConfigs(SPRING);

  // Geçmiş açılınca sheet yükselir ama haritanın üst üçte biri görünür kalır: noktalar orada.
  useEffect(() => {
    if (historyOpen) sheetRef.current?.expand();
    else sheetRef.current?.snapToIndex(0);
  }, [historyOpen]);

  // §4 derinlik davranıştan: sheet full detent'e giderken yüzen cam kareler çekilir.
  const floatingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetIndex.value, [0.6, 1], [1, 0], 'clamp'),
  }));

  // Live Activity dakikada bir tazelenir: sayaç sistemde akar, çubuk/amber burada güncellenir.
  // §4.10: premium kontrolü YOK — Live Activity işletim sistemi yeteneğidir, satılmaz.
  const session = useSessionStore((s) => s.session);
  const warnThresholdMin = useSettingsStore((s) => s.warnThresholdMin);
  const sessionLive = (phase === 'active' || phase === 'finding') && session !== null;
  useEffect(() => {
    if (!sessionLive || !session) return;
    const id = setInterval(() => refreshSessionActivity(session, warnThresholdMin), 60_000);
    return () => clearInterval(id);
  }, [sessionLive, session, warnThresholdMin]);

  // Faz değişince panel ilk kademesine döner: keşifte kompakt çubuk,
  // diğer fazlarda tek kademe olan içerik yüksekliği.
  useEffect(() => {
    sheetRef.current?.snapToIndex(0);
    // Keşiften çıkarken haritada seçili kalan pin temizlenir.
    if (phase !== 'idle') useDiscoveryStore.getState().selectPoi(null);
    // Faz değişince geçici overlay'ler ve geçmiş sahnesi kapanır (AR yalnız finding'de yaşar).
    if (phase !== 'finding') useUiStore.getState().closeAr();
    useUiStore.getState().closeHistory();
  }, [phase]);

  // Haritada pin seçilince kart kompakt kademede yarım kalmasın.
  const selectedPoiId = useDiscoveryStore((s) => s.selectedPoiId);
  useEffect(() => {
    sheetRef.current?.snapToIndex(selectedPoiId ? 1 : 0);
  }, [selectedPoiId]);

  // §5.11 offline satırı için ağ durumu dinlenir.
  useEffect(() => useNetworkStore.getState().subscribe(), []);

  // Kilit ekranı "Bitir" (Live Activity düğmesi): niyet App Group'a bitiş anını yazar,
  // oturum burada o anla kapanır; kutlama kapağı app açılınca görülür. Niyet app'i arka
  // planda başlatabildiği için hydrate önce garanti edilir (idempotent).
  useEffect(() => {
    const consume = () => {
      useSessionStore.getState().hydrate();
      const at = consumePendingEnd();
      if (at !== null) useSessionStore.getState().endSession(at);
    };
    consume();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') consume();
    });
    return () => sub.remove();
  }, []);

  // Widget kısayolu: parkiq://park app'i açar ve kaydı başlatır. Oturum zaten
  // varsa `park()` kendi içinde yok sayar — tek aktif oturum kuralı korunur.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (url?.startsWith('parkiq://park')) useSessionStore.getState().park();
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (event) => handle(event.url));
    return () => sub.remove();
  }, []);

  // Ön plana dönüş: iOS Live Activity'yi ~8 saatte kendisi bitiriyor ve geri
  // getirmenin tek yolu ön planda yeniden kurmak. Gece boyu ya da havaalanı
  // parkında kilit ekranı kartı bir daha hiç gelmiyordu.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      useSessionStore.getState().resumeLiveActivity();
      // Yetki app ömrü boyunca tek kez okunuyordu: iptal, yenileme ya da başka
      // cihazdaki satın alma bu oturumda hiç yansımıyordu.
      usePremiumStore.getState().refreshEntitlement();
    });
    return () => sub.remove();
  }, []);

  // Oto-algılama bildirimine dokunuş: park akışı kopuş noktasından başlar.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as {
        kind?: string;
        latitude?: number;
        longitude?: number;
        atMs?: number;
      };
      if (data.kind !== AUTO_PARK_KIND) return;
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
      useSessionStore.getState().parkAt({
        latitude: data.latitude,
        longitude: data.longitude,
        atMs: typeof data.atMs === 'number' ? data.atMs : Date.now(),
      });
    });
    return () => sub.remove();
  }, []);

  // §7.4b oto-algılama (premium): araç bağlantısı kopunca otomatik kayıt.
  const isPremium = useIsPremium();
  const autoDetectEnabled = useSettingsStore((s) => s.autoDetectEnabled);
  useEffect(() => {
    if (!isPremium || !autoDetectEnabled) return;
    return startAutoDetect(() => useSessionStore.getState().autoPark());
  }, [isPremium, autoDetectEnabled]);

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: colors.card, borderRadius: radius.r24 }),
    [colors.card],
  );

  const { height: windowHeight } = useWindowDimensions();
  // Geçmişte sheet %62'de durur; üstte kalan harita geçmiş noktalarını gösterir.
  const maxSheetHeight = Math.round(windowHeight * (historyOpen ? HISTORY_SHEET_RATIO : MAX_SHEET_RATIO));
  // Yalnız keşifte ikinci (kompakt) kademe var; dinamik içerik kademesi kütüphane
  // tarafından sona eklenir. Diğer fazlarda tek kademe = içerik yüksekliği.
  const snapPoints = useMemo(
    () => (phase === 'idle' ? [IDLE_COMPACT_HEIGHT + insets.bottom] : undefined),
    [phase, insets.bottom],
  );

  return (
    <BottomSheetModalProvider>
    <View style={{ flex: 1 }}>
      <MapCanvas />

      {pickingLocation && <PickLocationLayer target={pickingLocation} />}

      {/* §5 kare cam ikon butonlar — harita üstünde yüzen kontroller; sheet büyüyünce çekilir */}
      {!pickingLocation && (
      <Animated.View style={[{ position: 'absolute', top: insets.top + spacing.s8, right: spacing.s12, gap: spacing.s8 }, floatingStyle]}>
        <FloatingIconButton
          symbol="clock.arrow.circlepath"
          label={t('history')}
          onPress={() => (historyOpen ? useUiStore.getState().closeHistory() : useUiStore.getState().openHistory())}
        />
        <FloatingIconButton symbol="gearshape" label={t('settings')} onPress={() => setSettingsOpen(true)} />
        {/* Filtre yalnız keşifte anlamlı: oturum başlayınca sahne arabaya aittir. */}
        {phase === 'idle' && (
          <FloatingIconButton
            symbol="line.3.horizontal.decrease"
            label={t('filters')}
            onPress={() => {
              if (!isPremium) {
                trackPaywallShown('feature');
                setPaywallOpen(true);
                return;
              }
              setFilterOpen(true);
            }}
          />
        )}
      </Animated.View>
      )}

      {!pickingLocation && (
      <BottomSheet
        ref={sheetRef}
        index={0}
        // Keşifte kompakt kademe + içerik kademesi; diğer fazlarda yalnız içerik.
        snapPoints={snapPoints}
        enableDynamicSizing
        maxDynamicContentSize={maxSheetHeight}
        // Park formu aşağı çekilerek de terk edilebilir (kayıt silinir, keşfe döner).
        // Diğer fazlarda panel kapanamaz: harita tek başına çıkışsız bir ekran olurdu.
        enablePanDownToClose={phase === 'parking' && !historyOpen}
        onClose={() => useSessionStore.getState().cancelPark()}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        // §3: yükseklik tek genel spring ile; index shared value'su harita ve kareleri sürer.
        animationConfigs={sheetSprings}
        animatedIndex={sheetIndex}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={{ backgroundColor: colors.insetPressed, width: 36, height: 4.5 }}
      >
        {/* İçerik ekranı aşarsa kaydırılabilir; aşmazsa panel içeriğe küçülür. */}
        <BottomSheetScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          <SheetContent phase={phase} onOpenPaywall={() => setPaywallOpen(true)} />
        </BottomSheetScrollView>
      </BottomSheet>
      )}

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenPaywall={() => {
          setSettingsOpen(false);
          setPaywallOpen(true);
        }}
      />
      {/* Pin bırakılırken filtre GEÇİCİ olarak çekilir; `filterOpen` bozulmadığı
          için onay ya da vazgeç sonrası kendiliğinden geri gelir. */}
      <FilterSheet
        visible={filterOpen && pickingLocation !== 'filter'}
        onClose={() => setFilterOpen(false)}
      />
      <PaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* Kök overlay'ler (İlke 9): kutlama kapağı, AR kamera, tam ekran foto. Sheet'in ÜSTÜNDE. */}
      {phase === 'ended' && <EndedSheet onOpenPaywall={() => setPaywallOpen(true)} />}
      {arOpen && phase === 'finding' && <ArOverlay />}
      <PhotoViewer />
      <ProStamp />
      <StatusBar style={scheme === 'dark' || (arOpen && phase === 'finding') ? 'light' : 'dark'} />
    </View>
    </BottomSheetModalProvider>
  );
}

export default function App() {
  // Twice ilk render'dan önce başlatılır: oturum sayacı ve elde tutma ölçümü
  // uygulamanın açıldığı andan itibaren işler.
  useEffect(() => initAnalytics(), []);
  const forcedUpdate = useForcedUpdate();

  // Ayarlar ve aktif oturum ilk render'dan ÖNCE senkron yüklenir:
  // tema/dil doğru başlar, idle→active geçişinde titreme olmaz (§7).
  const [locale] = useState(() => {
    useSettingsStore.getState().hydrate();
    useSessionStore.getState().hydrate();
    usePremiumStore.getState().init();
    return useSettingsStore.getState().locale;
  });
  const currentLocale = useSettingsStore((s) => s.locale);
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* key: dil değişince ağaç tazelenir — t() modül seviyesinde okunur */}
          {forcedUpdate ? (
            <ForceUpdateScreen />
          ) : onboardingSeen ? (
            <Root key={currentLocale || locale} />
          ) : (
            <Onboarding key={currentLocale || locale} onDone={completeOnboarding} />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

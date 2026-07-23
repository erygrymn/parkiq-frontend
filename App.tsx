import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, useWindowDimensions, View } from 'react-native';
import { t } from './src/localization';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas } from './src/screens/MapCanvas';
import { Onboarding } from './src/screens/Onboarding';
import { HistorySheet } from './src/sheets/HistorySheet';
import { PaywallSheet } from './src/sheets/PaywallSheet';
import { PoiSheet } from './src/sheets/PoiSheet';
import { SettingsSheet } from './src/sheets/SettingsSheet';
import { ActiveSheet, EndedSheet, IdleSheet, ParkingSheet } from './src/sheets/SessionSheets';
import { startAutoDetect } from './modules/parkiq-autodetect';
import { useDiscoveryStore } from './src/state/discoveryStore';
import { useNetworkStore } from './src/state/networkStore';
import { useIsPremium, usePremiumStore } from './src/state/premiumStore';
import { useSessionStore, type SessionPhase } from './src/state/sessionStore';
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.r12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.insetPressed : colors.card,
        shadowColor: shadow.s2.ambient.color,
        shadowOffset: { width: 0, height: shadow.s2.ambient.offsetY },
        shadowRadius: shadow.s2.ambient.blur,
        shadowOpacity: scheme === 'dark' ? 0 : 1,
      })}
    >
      <SymbolView name={symbol} size={19} tintColor={colors.ink} weight="light" />
    </Pressable>
  );
}

function SheetContent({ phase, onOpenPaywall }: { phase: SessionPhase; onOpenPaywall: () => void }) {
  // Haritada bir pin seçiliyse keşif panelinin yerini o otoparkın kartı alır.
  const selectedPoiId = useDiscoveryStore((s) => s.selectedPoiId);
  const pois = useDiscoveryStore((s) => s.pois);
  const selectedPoi = selectedPoiId ? (pois.find((p) => p.id === selectedPoiId) ?? null) : null;

  switch (phase) {
    case 'idle':
      return selectedPoi ? <PoiSheet poi={selectedPoi} /> : <IdleSheet />;
    case 'parking':
      return <ParkingSheet onOpenPaywall={onOpenPaywall} />;
    case 'active':
    case 'ending':
      return <ActiveSheet onOpenPaywall={onOpenPaywall} />;
    case 'ended':
      return <EndedSheet onOpenPaywall={onOpenPaywall} />;
  }
}

function Root() {
  const { colors, scheme } = useTheme();
  const phase = useSessionStore((s) => s.phase);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  // Faz değişince panel ilk kademesine döner: keşifte kompakt çubuk,
  // diğer fazlarda tek kademe olan içerik yüksekliği.
  useEffect(() => {
    sheetRef.current?.snapToIndex(0);
    // Keşiften çıkarken haritada seçili kalan pin temizlenir.
    if (phase !== 'idle') useDiscoveryStore.getState().selectPoi(null);
  }, [phase]);

  // Haritada pin seçilince kart kompakt kademede yarım kalmasın.
  const selectedPoiId = useDiscoveryStore((s) => s.selectedPoiId);
  useEffect(() => {
    sheetRef.current?.snapToIndex(selectedPoiId ? 1 : 0);
  }, [selectedPoiId]);

  // §5.11 offline satırı için ağ durumu dinlenir.
  useEffect(() => useNetworkStore.getState().subscribe(), []);

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
  const maxSheetHeight = Math.round(windowHeight * MAX_SHEET_RATIO);
  // Yalnız keşifte ikinci (kompakt) kademe var; dinamik içerik kademesi kütüphane
  // tarafından sona eklenir. Diğer fazlarda tek kademe = içerik yüksekliği.
  const snapPoints = useMemo(
    () => (phase === 'idle' ? [IDLE_COMPACT_HEIGHT + insets.bottom] : undefined),
    [phase, insets.bottom],
  );

  return (
    <View style={{ flex: 1 }}>
      <MapCanvas />

      {/* §5.4 kare cam ikon butonlar — harita üstünde yüzen kontroller */}
      <View style={{ position: 'absolute', top: insets.top + spacing.s8, right: spacing.s12, gap: spacing.s8 }}>
        <FloatingIconButton
          symbol="clock.arrow.circlepath"
          label={t('history')}
          onPress={() => setHistoryOpen(true)}
        />
        <FloatingIconButton symbol="gearshape" label={t('settings')} onPress={() => setSettingsOpen(true)} />
      </View>

      <BottomSheet
        ref={sheetRef}
        index={0}
        // Keşifte kompakt kademe + içerik kademesi; diğer fazlarda yalnız içerik.
        snapPoints={snapPoints}
        enableDynamicSizing
        maxDynamicContentSize={maxSheetHeight}
        // Park formu aşağı çekilerek de terk edilebilir (kayıt silinir, keşfe döner).
        // Diğer fazlarda panel kapanamaz: harita tek başına çıkışsız bir ekran olurdu.
        enablePanDownToClose={phase === 'parking'}
        onClose={() => useSessionStore.getState().cancelPark()}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
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

      <HistorySheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenPaywall={() => {
          setHistoryOpen(false);
          setPaywallOpen(true);
        }}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenPaywall={() => {
          setSettingsOpen(false);
          setPaywallOpen(true);
        }}
      />
      <PaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
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
          {onboardingSeen ? (
            <Root key={currentLocale || locale} />
          ) : (
            <Onboarding key={currentLocale || locale} onDone={completeOnboarding} />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

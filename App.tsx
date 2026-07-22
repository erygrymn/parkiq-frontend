import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from './src/localization';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas } from './src/screens/MapCanvas';
import { Onboarding } from './src/screens/Onboarding';
import { HistorySheet } from './src/sheets/HistorySheet';
import { PaywallSheet } from './src/sheets/PaywallSheet';
import { SettingsSheet } from './src/sheets/SettingsSheet';
import { ActiveSheet, EndedSheet, IdleSheet, ParkingSheet } from './src/sheets/SessionSheets';
import { startAutoDetect } from './modules/parkiq-autodetect';
import { useNetworkStore } from './src/state/networkStore';
import { useIsPremium, usePremiumStore } from './src/state/premiumStore';
import { useSessionStore, type SessionPhase } from './src/state/sessionStore';
import { useSettingsStore } from './src/state/settingsStore';
import { useVehicleStore } from './src/state/vehicleStore';
import { ThemeProvider, useTheme } from './src/theme';
import { radius, shadow, spacing } from './src/theme/tokens';

// design.md §7 mimarisi: tab bar yok — Root = MapCanvas + her zaman açık,
// durum-güdümlü bottom sheet. Detent'ler: 148pt / %46 / %88.
// Geçmiş = pageSheet (§7.8); giriş noktası harita üstü kare buton.

const SNAP_POINTS = [148, '46%', '88%'];

const PHASE_SNAP_INDEX: Record<SessionPhase, number> = {
  idle: 0,
  parking: 2,
  active: 1,
  ending: 1,
  ended: 2,
};

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
  switch (phase) {
    case 'idle':
      return <IdleSheet onOpenPaywall={onOpenPaywall} />;
    case 'parking':
      return <ParkingSheet onOpenPaywall={onOpenPaywall} />;
    case 'active':
    case 'ending':
      return <ActiveSheet />;
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

  useEffect(() => {
    sheetRef.current?.snapToIndex(PHASE_SNAP_INDEX[phase]);
  }, [phase]);

  // §5.11 offline satırı için ağ durumu dinlenir.
  useEffect(() => useNetworkStore.getState().subscribe(), []);

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
        index={PHASE_SNAP_INDEX[phase]}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose={false}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={{ backgroundColor: colors.insetPressed, width: 36, height: 4.5 }}
      >
        <BottomSheetView>
          <SheetContent phase={phase} onOpenPaywall={() => setPaywallOpen(true)} />
        </BottomSheetView>
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
    useVehicleStore.getState().hydrate();
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

import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';
import { GhostButton } from '../components/Buttons';
import { ChipGroup } from '../components/ChipGroup';
import { PopupSheet } from '../components/PopupSheet';
import { SearchBar } from '../components/SearchBar';
import { Caption, Overline } from '../components/Typography';
import { formatTariffSummary } from '../lib/format';
import { formatDistance } from '../lib/geo';
import { captureCurrentPlace } from '../lib/location';
import { openCoordsInMaps } from '../lib/maps';
import { RADIUS_OPTIONS, walkMinutes, type PoiFilter } from '../lib/parkingPoi';
import { getLocale, t, upper } from '../localization';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// §7.2 filtre yüzeyi — haritanın üstündeki çipler hızlı geçiş içindir; burası
// aramanın kendisini kurar: NEREDE, NE KADAR UZAĞA, NE TÜRÜ. Sonuçlar aynı
// popup'ta listelenir ki kullanıcı ayarı değiştirip etkisini anında görsün.
//
// Aynı store'u yazar: çipler ve bu ekran tek durumun iki yüzüdür.

function poiRow(poi: {
  name: string | null;
  kind: 'parking' | 'charging';
  hasCharging: boolean;
  covered: boolean | null;
  distanceM: number;
}) {
  return [
    t('minWalk', { minutes: walkMinutes(poi.distanceM) }),
    formatDistance(poi.distanceM, getLocale()),
    poi.covered === true ? t('filterCovered') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function FilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const filter = useDiscoveryStore((s) => s.filter);
  const radiusM = useDiscoveryStore((s) => s.radiusM);
  const pois = useDiscoveryStore((s) => s.pois);
  const state = useDiscoveryStore((s) => s.state);
  const { setFilter, setRadius, pinTo, requestFollow, visiblePois, selectPoi } =
    useDiscoveryStore.getState();
  const startPickingLocation = useSessionStore((s) => s.startPickingLocation);

  const results = visiblePois();

  const rememberedFor = (poi: { latitude: number; longitude: number }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
      return repo.findRememberedTariff(poi.latitude, poi.longitude);
    } catch {
      return null;
    }
  };

  return (
    <PopupSheet visible={visible} title={t('filters')} onClose={onClose}>
      {/* NEREDE — varsayılan mevcut konum; adres ya da haritadan pin de olur. */}
      <View style={{ gap: spacing.s8 }}>
        <Overline>{t('parkLocation')}</Overline>
        <SearchBar
          onPick={(result) => pinTo(result.coords)}
          // Sondaki buton haritadan alan seçer: popup çekilir, kullanıcı haritayı
          // kaydırır, onaylayınca buraya geri döner. Kendi konumu alttaki butonda.
          trailingSymbol="mappin.and.ellipse"
          trailingLabel={t('pickArea')}
          onLocate={() => {
            // Kamerayı aramanın mevcut merkezine getir: artı işareti ile onaya
            // gidecek değer aynı noktayı göstersin (park akışındaki kalıp).
            const center = useDiscoveryStore.getState().center;
            if (center) pinTo(center);
            startPickingLocation('filter');
          }}
        />
        <GhostButton
          label={t('useMyLocation')}
          onPress={() => {
            requestFollow();
            void captureCurrentPlace().then((outcome) => {
              if (outcome.status === 'ok') {
                pinTo({ latitude: outcome.place.latitude, longitude: outcome.place.longitude });
              }
            });
          }}
        />
      </View>

      {/* NE KADAR UZAĞA */}
      <View style={{ gap: spacing.s8 }}>
        <Overline>{t('searchRadius')}</Overline>
        <ChipGroup<number>
          options={RADIUS_OPTIONS.map((meters) => ({
            key: meters,
            label: formatDistance(meters, locale),
          }))}
          value={radiusM}
          onChange={setRadius}
        />
      </View>

      {/* NE TÜRÜ */}
      <View style={{ gap: spacing.s8 }}>
        <Overline>{t('filters')}</Overline>
        <ChipGroup<PoiFilter>
          options={[
            { key: 'all', label: t('filterAll') },
            { key: 'charging', label: t('filterCharging') },
            { key: 'covered', label: t('filterCovered') },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {/* SONUÇ — ayarın etkisi aynı ekranda görünür. */}
      <View style={{ gap: spacing.s12 }}>
        <Overline>{t('results', { count: results.length })}</Overline>

        {state === 'loading' && (
          <View style={{ height: 56, borderRadius: radius.r12, backgroundColor: colors.inset }} />
        )}
        {state === 'ready' && results.length === 0 && <Caption>{t('noNearbyForFilter')}</Caption>}
        {state === 'error' && <Caption color={colors.warnText}>{t('plansError')}</Caption>}

        {results.slice(0, 12).map((poi) => {
          const remembered = rememberedFor(poi);
          return (
            <Pressable
              key={poi.id}
              accessibilityRole="button"
              onPress={() => {
                // Haritada göster: popup kapanır, pin o otoparka gider.
                selectPoi(poi.id);
                pinTo({ latitude: poi.latitude, longitude: poi.longitude });
                onClose();
              }}
              style={({ pressed }) => ({
                gap: spacing.s4,
                padding: spacing.s12,
                borderRadius: radius.r12,
                backgroundColor: pressed ? colors.insetPressed : colors.inset,
              })}
            >
              <Overline>{poiRow(poi)}</Overline>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8 }}>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 17, fontWeight: '900', color: colors.ink }}
                >
                  {upper(poi.name ?? t(poi.kind === 'charging' ? 'poiCharging' : 'poiParking'))}
                </Text>
                {/* Şarjlı otopark: EV sürücüsünün aradığı tek ayrım. */}
                {poi.hasCharging && (
                  <SymbolView name="bolt.fill" size={14} tintColor={colors.accentFill} weight="regular" />
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openCoordsInMaps(poi, poi.name)}
                  hitSlop={8}
                >
                  <Caption color={colors.ink} style={{ fontWeight: '600' }}>
                    {t('directions')}
                  </Caption>
                </Pressable>
              </View>
              {remembered && (
                <Caption color={colors.accentText}>{formatTariffSummary(remembered, locale)}</Caption>
              )}
            </Pressable>
          );
        })}
      </View>
    </PopupSheet>
  );
}

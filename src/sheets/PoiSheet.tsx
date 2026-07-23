import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GhostButton, PrimaryCta } from '../components/Buttons';
import { PopupSheet } from '../components/PopupSheet';
import { TariffForm } from '../components/TariffForm';
import { Caption, Overline } from '../components/Typography';
import { formatTariffSummary } from '../lib/format';
import { formatDistance } from '../lib/geo';
import { openCoordsInMaps } from '../lib/maps';
import { walkMinutes, type ParkingPoi } from '../lib/parkingPoi';
import type { Tariff } from '../lib/tariffMath';
import { getLocale, t, upper } from '../localization';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

/**
 * §7.2 — haritadaki bir pine dokununca keşif panelinin yerini alan kart.
 * Panel yüksekliği içerikten gelir; kart kapatılınca keşif paneline dönülür.
 */
export function PoiSheet({ poi }: { poi: ParkingPoi }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const selectPoi = useDiscoveryStore((s) => s.selectPoi);
  const [tariffOpen, setTariffOpen] = useState(false);
  const [draft, setDraft] = useState<Tariff | null>(null);

  const repo = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
    } catch {
      return null;
    }
  };

  const remembered = (() => {
    try {
      return repo()?.findRememberedTariff(poi.latitude, poi.longitude) ?? null;
    } catch {
      return null;
    }
  })();

  const saveTariff = () => {
    if (draft) {
      try {
        repo()?.savePlaceTariff(poi.latitude, poi.longitude, draft);
      } catch {
        /* yazılamazsa kart yine kapanır; tarife bir sonraki park anında sorulur */
      }
    }
    setTariffOpen(false);
  };

  const meta = [
    t('minWalk', { minutes: walkMinutes(poi.distanceM) }),
    formatDistance(poi.distanceM, locale),
    poi.covered === true ? t('filterCovered') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={() => selectPoi(null)}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: radius.r12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.insetPressed : colors.inset,
          })}
        >
          <SymbolView name="chevron.left" size={14} tintColor={colors.ink} weight="semibold" />
        </Pressable>

        <View style={{ flex: 1, gap: spacing.s4 }}>
          <Overline>{meta}</Overline>
          <Text
            numberOfLines={2}
            style={{ fontSize: 21, fontWeight: '900', letterSpacing: 21 * -0.02, color: colors.ink }}
          >
            {upper(poi.name ?? t(poi.kind === 'charging' ? 'poiCharging' : 'poiParking'))}
          </Text>
        </View>
      </View>

      {remembered ? (
        <Caption color={colors.accentText}>{formatTariffSummary(remembered, locale)}</Caption>
      ) : (
        <Caption>{t('noTariffYet')}</Caption>
      )}

      <PrimaryCta label={t('directions')} onPress={() => openCoordsInMaps(poi, poi.name)} />
      <GhostButton label={remembered ? t('editTariff') : t('addTariff')} onPress={() => setTariffOpen(true)} />

      <PopupSheet visible={tariffOpen} title={t('tariff')} onClose={saveTariff}>
        <TariffForm value={remembered} onChange={setDraft} />
      </PopupSheet>
    </View>
  );
}

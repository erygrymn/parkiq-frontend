import { Text, View } from 'react-native';
import { formatDurationStamp, formatMoney } from '../lib/format';
import type { SessionStats } from '../lib/stats';
import { getLocale, t } from '../localization';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { Overline } from './Typography';

// design.md §7.9 KPI satırı: KUTUSUZ. Üç sütun, overline + değer, altta 1px gridline.
// Total saved hero 28/900 `accent-text` proportional; Sessions ve Avg duration 22/900 ink.

function Column({ label, value, hero }: { label: string; value: string; hero?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: spacing.s4 }}>
      <Overline numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Overline>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: hero ? 28 : 22,
          fontWeight: '900',
          letterSpacing: hero ? 28 * -0.02 : 22 * -0.02,
          color: hero ? colors.accentText : colors.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function StatTiles({ stats }: { stats: SessionStats }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const saved =
    stats.totalSaved !== null && stats.savedCurrency
      ? formatMoney(stats.totalSaved, stats.savedCurrency, locale)
      : null;
  const avg = stats.avgDurationMs !== null ? formatDurationStamp(stats.avgDurationMs).toLowerCase() : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.s12,
        paddingBottom: spacing.s16,
        marginBottom: spacing.s24,
        borderBottomWidth: 1,
        borderBottomColor: colors.gridline,
      }}
    >
      {/* Veri yoksa sütun hiç çizilmez: "—" placeholder yasak (§2). */}
      {saved !== null && <Column label={t('totalSaved')} value={saved} hero />}
      <Column label={t('sessionsCount')} value={String(stats.sessionCount)} />
      {avg !== null && <Column label={t('avgDuration')} value={avg} />}
    </View>
  );
}

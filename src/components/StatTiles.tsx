import { Text, View } from 'react-native';
import { formatDurationStamp, formatMoney } from '../lib/format';
import type { SessionStats } from '../lib/stats';
import { getLocale, t } from '../localization';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { Overline } from './Typography';

// §7.8 KPI satırı: Total saved (hero 28pt, accent-text) · Sessions · Avg duration (22pt ink).
// Değerler PROPORTIONAL (§3.2: duran hero rakamlar tabular değildir).

function Tile({ label, value, hero }: { label: string; value: string; hero?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.r16,
        backgroundColor: colors.inset,
        padding: spacing.s12,
        gap: spacing.s4,
      }}
    >
      <Overline numberOfLines={1}>{label}</Overline>
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
  const locale = getLocale();
  const saved =
    stats.totalSaved !== null && stats.savedCurrency
      ? formatMoney(stats.totalSaved, stats.savedCurrency, locale)
      : '—';
  const avg = stats.avgDurationMs !== null ? formatDurationStamp(stats.avgDurationMs).toLowerCase() : '—';

  return (
    <View style={{ flexDirection: 'row', gap: spacing.s8, marginBottom: spacing.s24 }}>
      <Tile label={t('totalSaved')} value={saved} hero />
      <Tile label={t('sessionsCount')} value={String(stats.sessionCount)} />
      <Tile label={t('avgDuration')} value={avg} />
    </View>
  );
}

import { Text, View } from 'react-native';
import { formatMoney } from '../lib/format';
import { niceMax, type MonthBucket } from '../lib/monthlyStats';
import { getLocale, t } from '../localization';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { Overline } from './Typography';

// §11.2b — tek seri yeşil kolon. Legend YOK; direct label yalnız güncel ay + max ay.
// Gridline 1px DÜZ hairline (kesikli yasak). Kolon ≤24px, üst uç 4px radius,
// taban köşesiz, kolonlar arası gap yüzey rengiyle.

const CHART_HEIGHT = 120;
const BAR_MAX_WIDTH = 24;

function monthLabel(startMs: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' })
      .format(new Date(startMs))
      .toUpperCase();
  } catch {
    return '';
  }
}

export function MonthlySavingsChart({
  buckets,
  currency,
}: {
  buckets: MonthBucket[];
  currency: string | null;
}) {
  const { colors } = useTheme();
  const locale = getLocale();

  const max = niceMax(Math.max(...buckets.map((b) => b.saved), 0));
  const hasAny = buckets.some((b) => b.saved > 0);
  if (!hasAny) return null;

  const peakIndex = buckets.reduce((best, b, i) => (b.saved > buckets[best].saved ? i : best), 0);
  const currentIndex = buckets.length - 1;

  return (
    <View style={{ gap: spacing.s8, marginBottom: spacing.s24 }}>
      <Overline>{t('monthlySaved')}</Overline>

      <View style={{ height: CHART_HEIGHT, justifyContent: 'flex-end' }}>
        {/* Gridline: 1px düz hairline, üst sınır */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.gridline,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.s8, height: '100%' }}>
          {buckets.map((bucket, index) => {
            const ratio = max > 0 ? bucket.saved / max : 0;
            const labelled = index === currentIndex || index === peakIndex;
            return (
              <View key={bucket.key} style={{ flex: 1, alignItems: 'center', gap: spacing.s4 }}>
                {labelled && bucket.saved > 0 && currency && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: colors.accentText,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatMoney(bucket.saved, currency, locale)}
                  </Text>
                )}
                <View
                  style={{
                    width: '100%',
                    maxWidth: BAR_MAX_WIDTH,
                    height: Math.max(2, ratio * (CHART_HEIGHT - 24)),
                    backgroundColor: colors.accentFill,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
        {buckets.map((bucket) => (
          <Text
            key={`l${bucket.key}`}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 11 * 0.14,
              color: colors.textTertiary,
            }}
          >
            {monthLabel(bucket.startMs, locale)}
          </Text>
        ))}
      </View>
    </View>
  );
}

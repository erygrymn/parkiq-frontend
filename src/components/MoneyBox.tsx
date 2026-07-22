import { Text, View } from 'react-native';
import { formatClock, formatMoney } from '../lib/format';
import { getLocale, t } from '../localization';
import type { TariffState } from '../lib/tariffMath';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// §5.10 uyarı/para kutusu. Görünme koşulu: dilim sınırına ≤30 dk.
// Copy her zaman §5.9 formülünden üretilir: "Exit before {t} and pay {now} instead of {next}".

const SHOW_THRESHOLD_MIN = 30;

export function MoneyBox({ state }: { state: TariffState }) {
  const { colors } = useTheme();
  if (
    state.mode !== 'tiered' ||
    state.minutesToBoundary === null ||
    state.minutesToBoundary > SHOW_THRESHOLD_MIN ||
    state.nextBoundaryAtMs === null ||
    state.nowPrice === null ||
    state.nextPrice === null ||
    state.currency === null
  ) {
    return null;
  }

  const amber = state.barTone === 'amber-approaching';
  const bg = amber ? colors.alertBgWarn : colors.alertBgMoney;
  const border = amber ? 'rgba(180,83,9,0.25)' : 'rgba(0,166,80,0.22)';
  const textColor = amber ? colors.warnText : colors.accentText;
  const locale = getLocale();

  const parts = t('exitBeforePay', {
    time: formatClock(state.nextBoundaryAtMs),
    now: formatMoney(state.nowPrice, state.currency, locale),
    next: formatMoney(state.nextPrice, state.currency, locale),
  });

  return (
    <View
      style={{
        borderRadius: radius.r16,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        paddingVertical: spacing.s12,
        paddingHorizontal: spacing.s16,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '400', lineHeight: 18, color: textColor }}>{parts}</Text>
    </View>
  );
}

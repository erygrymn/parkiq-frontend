import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney } from '../../lib/format';
import { hapticStamp, hapticTick } from '../../lib/haptics';
import { getLocale, t, upper } from '../../localization';
import { useTheme } from '../../theme';
import { spacing, typeScale } from '../../theme/tokens';
import { CountUp } from './CountUp';
import { Dot } from './Stamp';

// design.md §7.8 varyant c hero: "SAVED" display-S ink → "₺50." display-XL yeşil count-up →
// nokta EN SON iner (DOT_SPRING) ve notificationSuccess ile eşlenir. Ekranın tek imza noktası.
// Satır sırası dile bağlı: İngilizce "SAVED / ₺50.", Türkçe "₺50 / CEBİNDE." (SavingsCard ile aynı).

export function CelebrationHero({
  amount,
  currency,
  haptics = true,
}: {
  amount: number;
  currency: string;
  /** Paywall'da kapalı: satın alma ekranında titretmek zorlama olur, kutlama değil. */
  haptics?: boolean;
}) {
  const { colors } = useTheme();
  const locale = getLocale();
  const moneyFirst = locale === 'tr';
  const [counted, setCounted] = useState(false);
  const format = useCallback((n: number) => formatMoney(n, currency, locale), [currency, locale]);

  const xl = typeScale.displayXL;
  const s = typeScale.displayS;
  const amountStyle = {
    fontSize: xl.fontSize,
    lineHeight: Math.round(xl.fontSize * 1.1),
    fontWeight: xl.fontWeight,
    letterSpacing: xl.letterSpacing,
    color: colors.accentText,
    fontVariant: ['tabular-nums' as const],
  };
  const wordStyle = {
    fontSize: s.fontSize,
    lineHeight: Math.round(s.fontSize * 1.15),
    fontWeight: s.fontWeight,
    letterSpacing: s.letterSpacing,
    color: colors.ink,
  };

  const dot = (host: 'amount' | 'word') => (
    <Dot
      color={colors.accentText}
      fontSize={host === 'amount' ? amountStyle.fontSize : wordStyle.fontSize}
      lineHeight={host === 'amount' ? amountStyle.lineHeight : wordStyle.lineHeight}
      fontWeight={host === 'amount' ? amountStyle.fontWeight : wordStyle.fontWeight}
      letterSpacing={host === 'amount' ? amountStyle.letterSpacing : wordStyle.letterSpacing}
      land={counted}
      onLanded={haptics ? hapticStamp : undefined}
    />
  );

  const amountRow = (withDot: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <CountUp
        value={amount}
        format={format}
        style={amountStyle}
        onTick={haptics ? hapticTick : undefined}
        onDone={() => setCounted(true)}
      />
      {withDot && dot('amount')}
    </View>
  );

  const wordRow = (withDot: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={wordStyle} maxFontSizeMultiplier={1.3} accessibilityLabel={`${upper(t('savedWord'))} ${format(amount)}.`}>
        {upper(t('savedWord'))}
      </Text>
      {withDot && dot('word')}
    </View>
  );

  return (
    <View style={{ gap: spacing.s4 }}>
      {moneyFirst ? amountRow(false) : wordRow(false)}
      {moneyFirst ? wordRow(true) : amountRow(true)}
    </View>
  );
}

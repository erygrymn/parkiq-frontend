import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { typeScale, type TypeToken } from '../theme/tokens';

function tokenStyle(token: TypeToken): TextStyle {
  return {
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
    letterSpacing: token.letterSpacing,
    ...(token.uppercase ? { textTransform: 'uppercase' as const } : {}),
    ...(token.tabular ? { fontVariant: ['tabular-nums' as const] } : {}),
  };
}

interface TypoProps extends TextProps {
  color?: string;
}

/** §3.1 overline: 11/800, +0.14em, UPPER — varsayılan renk text-tertiary. */
export function Overline({ color, style, ...rest }: TypoProps) {
  const { colors } = useTheme();
  return <Text {...rest} style={[tokenStyle(typeScale.overline), { color: color ?? colors.textTertiary }, style]} />;
}

export function Caption({ color, style, ...rest }: TypoProps) {
  const { colors } = useTheme();
  return <Text {...rest} style={[tokenStyle(typeScale.caption), { color: color ?? colors.textSecondary }, style]} />;
}

export function Body({ color, style, ...rest }: TypoProps) {
  const { colors } = useTheme();
  return <Text {...rest} style={[tokenStyle(typeScale.body), { color: color ?? colors.ink }, style]} />;
}

/**
 * §3.3 NOKTA imzası: display damga + renkli nokta. Nokta rengi çağıran belirler —
 * whitelist (PARKED. / SAVED ₺X.) yeşil, süre damgaları ve yer adları INK (kanun).
 */
export function DisplayStamp({
  text,
  dotColor,
  size = 'M',
}: {
  text: string;
  dotColor: string;
  size?: 'S' | 'M';
}) {
  const { colors } = useTheme();
  const token = size === 'M' ? typeScale.displayM : typeScale.displayS;
  return (
    <Text
      style={[tokenStyle(token), { color: colors.ink }]}
      // §3.1: display katmanı max 1.3×; yer adları 2 satır + %70'e kadar küçülür
      maxFontSizeMultiplier={1.3}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {text}
      <Text style={{ color: dotColor }}>.</Text>
    </Text>
  );
}

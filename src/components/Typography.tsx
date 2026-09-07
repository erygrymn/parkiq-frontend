import { Text, type TextProps, type TextStyle } from 'react-native';
import { upper } from '../localization';
import { useTheme } from '../theme';
import { typeScale, type TypeToken } from '../theme/tokens';
import { Stamp } from './motion/Stamp';

function tokenStyle(token: TypeToken): TextStyle {
  return {
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
    letterSpacing: token.letterSpacing,
    ...(token.tabular ? { fontVariant: ['tabular-nums' as const] } : {}),
  };
}

/**
 * Büyük harf `textTransform` ile DEĞİL, dil-duyarlı `upper()` ile yapılır — aksi
 * halde Türkçe "i" harfi "İ" yerine "I" olur (bkz. localization/upper).
 * Yalnız düz metin çocuklar çevrilir; iç içe <Text> kendi dönüşümünü uygular.
 */
function uppercased(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') return upper(children);
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? upper(c) : c));
  return children;
}

interface TypoProps extends TextProps {
  color?: string;
}

/** §3.1 overline: 11/800, +0.14em, UPPER — varsayılan renk text-tertiary. */
export function Overline({ color, style, children, ...rest }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text {...rest} style={[tokenStyle(typeScale.overline), { color: color ?? colors.textTertiary }, style]}>
      {uppercased(children)}
    </Text>
  );
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
 * design.md §2 NOKTA imzası: display damga + renkli nokta, §3 damga sekansıyla (metin fade/rise →
 * nokta DOT_SPRING). Nokta rengi çağıran belirler — whitelist (PARKED. / SAVED ₺X.) yeşil, süre
 * damgaları ve yer adları INK. `onLanded` nokta inişinde çağrılır (haptik burada bağlanır).
 */
export function DisplayStamp({
  text,
  dotColor,
  size = 'M',
  animate = true,
  onLanded,
}: {
  text: string;
  dotColor: string;
  size?: 'S' | 'M';
  animate?: boolean;
  onLanded?: () => void;
}) {
  return <Stamp text={text} dotColor={dotColor} size={size} animate={animate} onLanded={onLanded} />;
}

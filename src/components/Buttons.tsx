import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { darkColors, lightColors, radius, spacing, typeScale } from '../theme/tokens';
import { PressScale } from './motion/PressScale';
import { ProBadge } from './ProBadge';

// design.md §5 Primary CTA: 52pt hap, ekran başına TEK, gölgesiz + kenar ışığı; pressed 0.97 + SPRING.
// §5 Ghost: 44pt inset hap. Her ikisi PressScale üzerinden ölçeklenir (§3 mikro geri bildirim).

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Yerleşim (flex, margin); görsel stil bileşenin kendisindedir. */
  style?: StyleProp<ViewStyle>;
}

interface GhostButtonProps extends ButtonProps {
  /** Premium: etiketin yanında altın taç. Yetki gelince çağıran taraf bunu geçmez. */
  locked?: boolean;
}

export function PrimaryCta({
  label,
  onPress,
  disabled,
  style,
  tone = 'auto',
}: ButtonProps & {
  /** Kamera gibi her zaman koyu zeminlerde tema ne olursa olsun koyu tema CTA'sı. */
  tone?: 'auto' | 'onDark';
}) {
  const { scheme } = useTheme();
  const onDark = tone === 'onDark' || scheme === 'dark';
  const palette = onDark ? darkColors : lightColors;
  const labelColor = onDark ? lightColors.ink : lightColors.card;

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      containerStyle={style}
      style={(pressed) => ({
        height: 52,
        borderRadius: radius.rFull,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? palette.insetPressed : pressed ? palette.ctaPressed : palette.ink,
        // Kenar ışığı yalnız mürekkep hapta (koyu yüzeyde açık hap ışığa ihtiyaç duymaz).
        borderTopWidth: onDark || disabled ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.08)',
      })}
    >
      <Text
        style={{
          fontSize: typeScale.headline.fontSize,
          fontWeight: typeScale.headline.fontWeight,
          color: disabled ? palette.disabled : labelColor,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

export function GhostButton({ label, onPress, disabled, style, locked }: GhostButtonProps) {
  const { colors } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      containerStyle={style}
      style={(pressed) => ({
        height: 44,
        borderRadius: radius.rFull,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.insetPressed : colors.inset,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s4 }}>
        {locked && <ProBadge size={13} />}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: disabled ? colors.disabled : colors.ink,
          }}
        >
          {label}
        </Text>
      </View>
    </PressScale>
  );
}

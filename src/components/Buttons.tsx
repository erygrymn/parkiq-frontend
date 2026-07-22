import { Pressable, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radius, typeScale } from '../theme/tokens';

// §5.1 Primary CTA: 52pt siyah hap, ekran başına TEK; gölgesiz. §5.2 Ghost: inset zemin.

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryCta({ label, onPress, disabled, style }: ButtonProps) {
  const { colors, scheme } = useTheme();
  const labelColor = scheme === 'dark' ? '#141416' : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: radius.rFull,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? colors.insetPressed : pressed ? colors.ctaPressed : colors.ink,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: typeScale.headline.fontSize,
          fontWeight: typeScale.headline.fontWeight,
          color: disabled ? colors.disabled : labelColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, disabled, style }: ButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: 44,
          borderRadius: radius.rFull,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.insetPressed : colors.inset,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: disabled ? colors.disabled : colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

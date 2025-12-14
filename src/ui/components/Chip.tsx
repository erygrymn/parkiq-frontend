import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Platform, useWindowDimensions } from "react-native";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  onPress,
  style,
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const chipWidth = (width - 16 * 2 - 12) / 2;

  const borderColor = selected
    ? theme.isDark
      ? "rgba(48,209,88,0.65)"
      : "rgba(52,199,89,0.55)"
    : theme.colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.surface2 : "transparent",
          borderWidth: 1,
          borderColor,
          borderRadius: theme.radii.r16,
          paddingHorizontal: theme.spacing.s12,
          height: 40,
          width: chipWidth,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          textStyles.body,
          {
            color: selected ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: selected ? "600" : "400",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
  },
});

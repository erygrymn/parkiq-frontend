import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface ChipGroupProps {
  options: number[];
  selected: number;
  onSelect: (value: number) => void;
  label?: (value: number) => string;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  options,
  selected,
  onSelect,
  label = (v) => String(v),
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? theme.colors.accentGreen + "20"
                  : theme.colors.surface,
                borderWidth: 0.5,
                borderColor: isSelected
                  ? theme.colors.accentGreen
                  : theme.colors.border,
                borderRadius: theme.radii.pill,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected
                    ? theme.colors.accentGreen
                    : theme.colors.textPrimary,
                  fontSize: theme.typography.body.fontSize,
                  fontWeight: isSelected ? "600" : "400",
                },
              ]}
            >
              {label(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    lineHeight: 20,
  },
});


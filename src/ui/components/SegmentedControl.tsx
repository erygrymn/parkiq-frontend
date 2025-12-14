import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  labels?: string[];
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedIndex,
  onSelect,
  labels,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface2,
          borderRadius: theme.radii.r16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          height: 44,
          padding: 4,
        },
      ]}
    >
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        const label = labels ? labels[index] : option;

        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(index)}
            style={[
              styles.segment,
              {
                backgroundColor: isSelected ? theme.colors.surface : "transparent",
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected ? theme.colors.borderStrong : "transparent",
                borderRadius: 12,
                flex: 1,
                height: 36,
              },
            ]}
            activeOpacity={0.7}
          >
            {isSelected && (
              <View
                style={[
                  styles.accentLine,
                  {
                    backgroundColor: theme.colors.accent,
                    bottom: 0,
                  },
                ]}
              />
            )}
            <Text
              style={[
                textStyles.body,
                {
                  color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary,
                  fontWeight: isSelected ? "600" : "400",
                  textAlign: "center",
                },
              ]}
            >
              {label}
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
    overflow: "hidden",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  accentLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },
});

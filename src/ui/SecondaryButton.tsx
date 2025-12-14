import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../theme";

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  fullWidth = true,
  style,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 0.5,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.card,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.body.fontSize,
            fontWeight: "600",
            textAlign: "center",
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    lineHeight: 20,
  },
});


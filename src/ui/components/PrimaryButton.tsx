import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from "react-native";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: disabled || loading ? theme.colors.border : theme.colors.accent,
          borderRadius: theme.radii.button,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled || loading ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text
          style={[
            textStyles.body,
            {
              color: "#FFFFFF",
              fontWeight: "600",
              textAlign: "center",
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
});


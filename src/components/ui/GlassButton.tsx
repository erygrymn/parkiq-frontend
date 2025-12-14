import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "react-native";
import { useTheme } from "../../theme";

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = "primary",
}) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, { borderRadius: theme.radii.md }, disabled && styles.disabled]}
    >
      <BlurView
        intensity={theme.blur.soft}
        tint={isDark ? "dark" : "light"}
        style={styles.blur}
      >
        <View
          style={[
            styles.content,
            {
              backgroundColor:
                variant === "primary"
                  ? theme.colors.accentGreen + "20"
                  : theme.colors.surfaceGlass,
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              {
                color:
                  variant === "primary"
                    ? theme.colors.accentGreen
                    : theme.colors.textPrimary,
                fontSize: theme.typography.body.fontSize,
                fontWeight: "600",
              },
            ]}
          >
            {title}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  blur: {
    overflow: "hidden",
  },
  content: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.5,
  },
});


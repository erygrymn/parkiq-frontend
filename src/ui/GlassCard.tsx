import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "react-native";
import { useTheme } from "../theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  blur?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  blur = true,
}) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (blur) {
    return (
      <View style={[styles.container, { borderRadius: theme.radii.card }, style]}>
        <BlurView
          intensity={20}
          tint={isDark ? "dark" : "light"}
          style={styles.blur}
        >
          <View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.surfaceGlass,
                borderWidth: 0.5,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.card,
                padding: theme.spacing.md,
              },
            ]}
          >
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 0.5,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.card,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
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
    overflow: "hidden",
  },
});


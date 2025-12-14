import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "react-native";
import { useTheme } from "../theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={theme.blur.soft}
        tint={isDark ? "dark" : "light"}
        style={styles.blur}
      >
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surfaceGlass,
              borderColor: theme.colors.separator,
            },
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
  },
  blur: {
    overflow: "hidden",
  },
  content: {
    padding: 16,
    borderWidth: 0.5,
  },
});


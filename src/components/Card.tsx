/**
 * Card Component
 * Standart kart bileşeni - glass morphism olmadan
 */

import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { useTheme } from "../design";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const theme = useTheme();

  const shadowStyle = Platform.select({
    ios: theme.isDark ? theme.shadows.ios.dark : theme.shadows.ios.light,
    android: theme.isDark ? theme.shadows.android.dark : theme.shadows.android.light,
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.r20,
          padding: theme.spacing.s16,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
});


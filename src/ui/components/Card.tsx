import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { useTheme } from "../theme/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const theme = useTheme();

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: theme.isDark ? 0.35 : 0.10,
      shadowRadius: theme.isDark ? 22 : 18,
      shadowOffset: { width: 0, height: theme.isDark ? 12 : 10 },
    },
    android: {
      elevation: theme.isDark ? 4 : 3,
    },
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


/**
 * GlassSurface Component
 * Glass morphism efekti ile yüzey bileşeni
 * Tasarım detayları korunarak tek bir bileşen olarak birleştirildi
 */

import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../design";

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
  bevel?: boolean;
  intensity?: "soft" | "medium" | "strong";
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  radius = 20,
  bevel = false,
  intensity = "medium",
}) => {
  const theme = useTheme();

  const blurIntensity = theme.blur.intensity[intensity];
  const containerBgColor = theme.colors.glassContainer;
  const topInnerHighlight = theme.colors.glassHighlight;
  const bottomInnerShadow = theme.colors.glassShadow;

  const shadowStyle = Platform.select({
    ios: theme.isDark ? theme.shadows.ios.dark : theme.shadows.ios.light,
    android: theme.isDark ? theme.shadows.android.dark : theme.shadows.android.light,
  });

  const content = (
    <View
      style={[
        styles.content,
        {
          backgroundColor: containerBgColor,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          position: "relative",
          ...shadowStyle,
        },
        style,
      ]}
    >
      {bevel && (
        <>
          <View
            style={[
              styles.bevelTop,
              {
                backgroundColor: topInnerHighlight,
              },
            ]}
          />
          <View
            style={[
              styles.bevelBottom,
              {
                backgroundColor: bottomInnerShadow,
              },
            ]}
          />
        </>
      )}
      {children}
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.container, { borderRadius: radius }, style]}>
        <BlurView
          intensity={blurIntensity}
          tint={theme.isDark ? "dark" : "light"}
          style={styles.blur}
        >
          {content}
        </BlurView>
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    overflow: "hidden",
  },
  content: {
    overflow: "hidden",
  },
  bevelTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  bevelBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
});


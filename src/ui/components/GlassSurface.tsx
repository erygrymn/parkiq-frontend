import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../theme/theme";

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
  bevel?: boolean;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  radius = 20,
  bevel = false,
}) => {
  const theme = useTheme();

  const containerBgColor = theme.isDark
    ? "rgba(20,21,26,0.78)"
    : "rgba(255,255,255,0.78)";

  const topInnerHighlight = theme.isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(255,255,255,0.55)";

  const bottomInnerShadow = theme.isDark
    ? "rgba(0,0,0,0.45)"
    : "rgba(0,0,0,0.18)";

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: theme.isDark ? 0.40 : 0.14,
      shadowRadius: theme.isDark ? 28 : 24,
      shadowOffset: { width: 0, height: theme.isDark ? 16 : 14 },
    },
    android: {
      elevation: theme.isDark ? 8 : 6,
    },
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
          intensity={45}
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

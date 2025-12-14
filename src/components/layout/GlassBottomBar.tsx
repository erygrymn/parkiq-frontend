import React from "react";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme";

interface GlassBottomBarProps {
  children: React.ReactNode;
}

export const GlassBottomBar: React.FC<GlassBottomBarProps> = ({ children }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.blur}>
        <View style={[styles.content, { borderTopColor: theme.colors.border }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  blur: {
    overflow: "hidden",
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
});


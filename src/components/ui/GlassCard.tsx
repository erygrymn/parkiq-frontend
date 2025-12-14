import React from "react";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../../theme";

interface GlassCardProps {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.blur}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface + "80" }]}>
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
  },
});


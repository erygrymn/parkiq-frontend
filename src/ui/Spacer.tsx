import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface SpacerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  custom?: number;
}

export const Spacer: React.FC<SpacerProps> = ({ size = "md", custom }) => {
  const theme = useTheme();
  const height = custom ?? theme.spacing[size];

  return <View style={[styles.container, { height }]} />;
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});


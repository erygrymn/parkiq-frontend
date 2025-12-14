import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text style={[styles.header, { color: theme.colors.text }]}>{title}</Text>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
});


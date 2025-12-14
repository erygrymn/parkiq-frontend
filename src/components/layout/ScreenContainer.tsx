import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useTheme } from "../../theme";

interface ScreenContainerProps {
  children: React.ReactNode;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});


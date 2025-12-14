import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { useTheme } from "../theme";
import { useBottomTabBarHeight } from "../hooks/useBottomTabBarHeight";

interface ScreenProps {
  children: React.ReactNode;
  variant?: "default" | "edge";
  scroll?: boolean;
  contentInsetBottom?: "tab" | "safe" | number;
  style?: ViewStyle;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  variant = "default",
  scroll = false,
  contentInsetBottom = "tab",
  style,
}) => {
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

  let bottomInset = 0;
  if (contentInsetBottom === "tab") {
    bottomInset = tabBarHeight;
  } else if (contentInsetBottom === "safe") {
    bottomInset = 0;
  } else {
    bottomInset = contentInsetBottom;
  }

  const paddingHorizontal = variant === "edge" ? 0 : theme.spacing.md;

  const containerStyle: ViewStyle = {
    backgroundColor: theme.colors.background,
    paddingHorizontal,
    paddingBottom: bottomInset,
  };

  if (scroll) {
    return (
      <SafeAreaView style={[styles.container, containerStyle, style]} edges={variant === "edge" ? ["top"] : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, containerStyle, style]} edges={variant === "edge" ? ["top"] : undefined}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});


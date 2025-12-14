import React from "react";
import { View, StyleSheet, ViewStyle, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, Edge, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { TABBAR_TOTAL_HEIGHT, HEADER_BAR_HEIGHT } from "../theme/tokens";
import { useBottomTabBarHeight } from "../../hooks/useBottomTabBarHeight";

const CONTENT_TOP_GAP = 12;

interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  keyboardAvoiding?: boolean;
  variant?: "default" | "fullBleed";
  withTabBarInset?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  edges = ["left", "right"],
  scroll = false,
  contentStyle,
  style,
  keyboardAvoiding = false,
  variant = "default",
  withTabBarInset = true,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.bg,
  };

  let paddingStyle: ViewStyle = {};

  if (variant === "fullBleed") {
    paddingStyle = {
      paddingTop: 0,
      paddingBottom: 0,
      paddingHorizontal: 0,
    };
  } else {
    const paddingHorizontal = (edges.includes("left") && edges.includes("right")) ? theme.spacing.s16 : 0;
    
    // Content should start below the header. Header itself will handle safe area.
    const paddingTop = insets.top + HEADER_BAR_HEIGHT + CONTENT_TOP_GAP;
    
    // Bottom padding should avoid floating tab bar.
    const paddingBottom = withTabBarInset ? tabBarHeight + theme.spacing.s16 : (edges.includes("bottom") ? insets.bottom + theme.spacing.s16 : 0);

    paddingStyle = {
      paddingHorizontal,
      paddingTop,
      paddingBottom,
    };
  }

  const content = (
    <View style={[styles.contentFill, paddingStyle, contentStyle]}>
      {children}
    </View>
  );

  const wrappedContent = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    content
  );

  const finalContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {wrappedContent}
    </KeyboardAvoidingView>
  ) : (
    wrappedContent
  );

  return (
    <SafeAreaView style={[containerStyle, style]} edges={variant === "fullBleed" ? [] : edges}>
      {finalContent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentFill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

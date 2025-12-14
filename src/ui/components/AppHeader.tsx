import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";
import { HEADER_BAR_HEIGHT } from "../theme/tokens";

interface AppHeaderProps {
  title: string;
  variant?: "root" | "stack";
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  variant = "root",
  rightComponent,
  onBackPress,
}) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();

  const showBackButton = variant === "stack" && (onBackPress || canGoBack);

  const headerBgColor = theme.isDark
    ? "rgba(18,19,21,0.75)"
    : "rgba(255,255,255,0.85)";

  const blurContent = (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top,
          height: insets.top + HEADER_BAR_HEIGHT,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            height: HEADER_BAR_HEIGHT,
            paddingHorizontal: theme.spacing.s20,
          },
        ]}
      >
        <View style={styles.left}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBackPress || (() => navigation.goBack())}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={theme.colors.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.center}>
          <Text
            style={[
              textStyles.navTitle,
              {
                color: theme.colors.textPrimary,
                letterSpacing: -0.2,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View style={styles.right}>
          {rightComponent}
        </View>
      </View>
      <View
        style={[
          styles.separator,
          {
            backgroundColor: theme.colors.borderStrong,
          },
        ]}
      />
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          styles.container,
          {
            height: insets.top + HEADER_BAR_HEIGHT,
          },
        ]}
      >
        <BlurView
          intensity={45}
          tint={theme.isDark ? "dark" : "light"}
          style={styles.blur}
        >
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: headerBgColor,
              },
            ]}
          >
            {blurContent}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          height: insets.top + HEADER_BAR_HEIGHT,
        },
      ]}
    >
      <View
        style={[
          styles.blur,
          {
            backgroundColor: headerBgColor,
          },
        ]}
      >
        {blurContent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  blur: {
    flex: 1,
    overflow: "hidden",
  },
  overlay: {
    flex: 1,
  },
  headerContainer: {
    position: "relative",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  left: {
    position: "absolute",
    left: 20,
    width: 60,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 60, // Ensure title doesn't overlap with left/right buttons
  },
  right: {
    position: "absolute",
    right: 20,
    width: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

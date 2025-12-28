/**
 * FloatingTabBar Component
 * Alt tab bar bileşeni - glass morphism ile floating tasarım
 */

import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design";
import { textStyles } from "../design/typography";

interface TabItem {
  name: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

const getIconName = (tabName: string): keyof typeof Ionicons.glyphMap => {
  switch (tabName) {
    case "Map":
      return "map";
    case "Parking":
      return "car";
    case "History":
      return "time";
    case "Profile":
      return "person";
    case "Settings":
      return "settings";
    default:
      return "ellipse";
  }
};

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const containerBgColor = theme.colors.glassContainer;
  const bubbleBgColor = theme.isDark
    ? "rgba(48,209,88,0.22)"
    : "rgba(52,199,89,0.16)";
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
          borderRadius: theme.radii.r26,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          paddingHorizontal: theme.spacing.s12,
          paddingVertical: theme.spacing.s8,
          position: "relative",
          ...shadowStyle,
        },
      ]}
    >
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
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          const iconName = getIconName(tab.name);

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => onTabPress(tab.name)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                {isActive && (
                  <View
                    style={[
                      styles.iconBubble,
                      {
                        backgroundColor: bubbleBgColor,
                        borderRadius: theme.radii.r16,
                      },
                    ]}
                  />
                )}
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isActive ? theme.colors.accent : theme.colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  textStyles.tabLabel,
                  {
                    color: isActive ? theme.colors.accent : theme.colors.textSecondary,
                    marginTop: theme.spacing.s4,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          styles.container,
          {
            bottom: insets.bottom + theme.spacing.s8,
          },
        ]}
      >
        <BlurView
          intensity={theme.blur.intensity.medium}
          tint={theme.isDark ? "dark" : "light"}
          style={styles.blur}
        >
          {content}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom + theme.spacing.s8,
        },
      ]}
    >
      <View style={styles.blur}>{content}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  blur: {
    borderRadius: 26,
    overflow: "hidden",
  },
  content: {
    position: "relative",
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
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tab: {
    flex: 1,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconBubble: {
    position: "absolute",
    width: 32,
    height: 32,
    top: 0,
    left: 0,
  },
});


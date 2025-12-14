import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "react-native";
import { useTheme } from "../../theme";

interface TabItem {
  name: string;
  label: string;
  icon?: string;
}

interface GlassBottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

export const GlassBottomTabBar: React.FC<GlassBottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={styles.container}>
      <BlurView
        intensity={20}
        tint={isDark ? "dark" : "light"}
        style={styles.blur}
      >
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surface + "80",
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.name}
                onPress={() => onTabPress(tab.name)}
                style={styles.tab}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        activeTab === tab.name
                          ? theme.colors.accentGreen
                          : theme.colors.textSecondary,
                      fontWeight: activeTab === tab.name ? "600" : "400",
                      fontSize: theme.typography.caption.fontSize,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    height: 90,
    zIndex: 1000,
  },
  blur: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  content: {
    borderTopWidth: 0.5,
    paddingBottom: 34,
    paddingTop: 8,
  },
  tabs: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    lineHeight: 18,
  },
});


import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

interface ListItemProps {
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
  last?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  value,
  showChevron = false,
  onPress,
  rightComponent,
  style,
  last = false,
}) => {
  const theme = useTheme();
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      style={[
        styles.row,
        {
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: theme.colors.border,
          paddingVertical: theme.spacing.s12,
          paddingHorizontal: theme.spacing.s16,
          minHeight: 44,
        },
        style,
      ]}
      activeOpacity={0.6}
    >
      <View style={styles.left}>
        <Text
          style={[
            textStyles.body,
            {
              color: theme.colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              textStyles.caption,
              {
                color: theme.colors.textSecondary,
                marginTop: theme.spacing.s4,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        {rightComponent || (value && (
          <Text
            style={[
              textStyles.body,
              {
                color: theme.colors.textSecondary,
                marginRight: showChevron ? theme.spacing.s8 : 0,
              },
            ]}
          >
            {value}
          </Text>
        ))}
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textTertiary}
          />
        )}
      </View>
    </Component>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
});

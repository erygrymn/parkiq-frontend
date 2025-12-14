import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../theme";

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  value,
  showChevron = false,
  onPress,
  rightComponent,
  style,
}) => {
  const theme = useTheme();
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      style={[
        styles.row,
        {
          borderBottomWidth: 0.5,
          borderBottomColor: theme.colors.border,
          paddingVertical: 12,
          paddingHorizontal: theme.spacing.md,
        },
        onPress && styles.pressable,
        style,
      ]}
      activeOpacity={0.6}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.body.fontSize,
              fontWeight: "400",
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.caption.fontSize,
                marginTop: theme.spacing.xs,
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
              styles.value,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.body.fontSize,
              },
            ]}
          >
            {value}
          </Text>
        ))}
        {showChevron && (
          <Text
            style={[
              styles.chevron,
              {
                color: theme.colors.textSecondary,
                marginLeft: theme.spacing.sm,
              },
            ]}
          >
            ›
          </Text>
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
    minHeight: 44,
  },
  pressable: {},
  left: {
    flex: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    lineHeight: 20,
  },
  subtitle: {
    lineHeight: 16,
  },
  value: {
    lineHeight: 20,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 20,
  },
});


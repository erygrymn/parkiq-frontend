import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { PrimaryButton } from "./PrimaryButton";

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.headline.fontSize,
            fontWeight: theme.typography.headline.fontWeight,
            marginBottom: theme.spacing.sm,
          },
        ]}
      >
        {title}
      </Text>
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.body.fontSize,
              marginBottom: theme.spacing.lg,
            },
          ]}
        >
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <PrimaryButton title={actionLabel} onPress={onAction} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    textAlign: "center",
    lineHeight: 24,
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
  },
});


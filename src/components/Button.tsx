/**
 * Button Components
 * Primary, Secondary ve Destructive button bileşenleri
 * Tasarım detayları korunarak tek bir dosyada birleştirildi
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../design";
import { textStyles } from "../design/typography";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radii.r16,
          paddingHorizontal: theme.spacing.s16,
          height: 52,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled || loading ? 0.45 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text
          style={[
            textStyles.body,
            {
              color: "#FFFFFF",
              fontWeight: "600",
              textAlign: "center",
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.surface2,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.r16,
          paddingHorizontal: theme.spacing.s16,
          height: 52,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled || loading ? 0.45 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textPrimary} size="small" />
      ) : (
        <Text
          style={[
            textStyles.body,
            {
              color: theme.colors.textPrimary,
              fontWeight: "600",
              textAlign: "center",
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const DestructiveButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: "transparent",
          borderRadius: theme.radii.r16,
          paddingHorizontal: theme.spacing.s16,
          height: 52,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled || loading ? 0.45 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.danger} size="small" />
      ) : (
        <Text
          style={[
            textStyles.body,
            {
              color: theme.colors.danger,
              fontWeight: "600",
              textAlign: "center",
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});


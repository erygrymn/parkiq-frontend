import React from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme";

interface TextInputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
}) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.body.fontSize,
              fontWeight: "500",
              marginBottom: theme.spacing.sm,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceGlass,
            color: theme.colors.textPrimary,
            borderColor: error ? theme.colors.error : theme.colors.separator,
            borderRadius: theme.radii.md,
            fontSize: theme.typography.body.fontSize,
            padding: theme.spacing.md,
          },
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {},
  input: {
    borderWidth: 0.5,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});


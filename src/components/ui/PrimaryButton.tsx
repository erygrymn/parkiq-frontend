import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
}) => {
  const theme = useTheme();
  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: disabled
            ? theme.colors.border
            : theme.colors.primary,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: theme.colors.background }]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});


import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { useAuthStore } from "../../state/authStore";

export const AuthPlaceholderScreen: React.FC = () => {
  const theme = useTheme();
  const loadSessionFromSecureStore = useAuthStore(
    (state) => state.loadSessionFromSecureStore
  );

  const handleReload = async () => {
    await loadSessionFromSecureStore();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[textStyles.h2, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s16 }]}>
        Auth is being rebuilt
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.accent }]}
        onPress={handleReload}
      >
        <Text style={[textStyles.body, { color: "#FFFFFF", fontWeight: "600" }]}>
          Reload
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});


import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme";
import { useSettingsStore } from "@/store/useSettingsStore";

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const reminderOffsetMinutes = useSettingsStore(
    (state) => state.reminderOffsetMinutes
  );
  const setReminderOffsetMinutes = useSettingsStore(
    (state) => state.setReminderOffsetMinutes
  );
  const [offsetInput, setOffsetInput] = useState(
    reminderOffsetMinutes.toString()
  );

  const handleOffsetChange = (text: string) => {
    setOffsetInput(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 0) {
      setReminderOffsetMinutes(num);
    }
  };

  return (
    <ScreenContainer>
      <SectionHeader title={t("settings.title")} />
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t("settings.theme")}
        </Text>
        <View style={styles.options}>
          <Pressable
            style={[
              styles.option,
              themeMode === "system" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => setThemeMode("system")}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    themeMode === "system"
                      ? theme.colors.background
                      : theme.colors.text,
                },
              ]}
            >
              {t("settings.themeSystem")}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.option,
              themeMode === "light" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => setThemeMode("light")}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    themeMode === "light"
                      ? theme.colors.background
                      : theme.colors.text,
                },
              ]}
            >
              {t("settings.themeLight")}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.option,
              themeMode === "dark" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => setThemeMode("dark")}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    themeMode === "dark"
                      ? theme.colors.background
                      : theme.colors.text,
                },
              ]}
            >
              {t("settings.themeDark")}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t("settings.reminderOffset")}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={offsetInput}
          onChangeText={handleOffsetChange}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t("settings.language")}
        </Text>
        <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
          {t("settings.languageEnglish")}
        </Text>
      </View>
      <View style={styles.section}>
        <PrimaryButton
          title={t("settings.subscription")}
          onPress={() => navigation.navigate("Subscription" as never)}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  options: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C6C6C8",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  value: {
    fontSize: 16,
  },
});


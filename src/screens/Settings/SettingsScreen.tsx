import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../state/authStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { DestructiveButton } from "../../ui/components/Button";
import { Picker } from "../../ui/components/Picker";
import { StringPicker } from "../../ui/components/StringPicker";
import { SegmentedControl } from "../../ui/components/SegmentedControl";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t, setLocale } from "../../localization";
import { apiGet, apiDelete } from "../../services/api";

interface VerifiedPrice {
  currency: string;
}

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const signOut = useAuthStore((state) => state.signOut);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const reminderOffsetMinutes = useSettingsStore((state) => state.reminderOffsetMinutes);
  const setReminderOffsetMinutes = useSettingsStore((state) => state.setReminderOffsetMinutes);
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  const [currencies, setCurrencies] = useState<string[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [lastCurrencyFetchTime, setLastCurrencyFetchTime] = useState<number | null>(null);

  // Load settings on mount
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // Fetch available currencies from API (with cache)
  useEffect(() => {
    const fetchCurrencies = async () => {
      // Cache duration: 1 hour (3600000 ms)
      const CACHE_DURATION = 60 * 60 * 1000;
      const now = Date.now();

      // If we have cached currencies and it's still fresh, use them
      if (
        currencies.length > 0 &&
        lastCurrencyFetchTime &&
        now - lastCurrencyFetchTime < CACHE_DURATION
      ) {
        setLoadingCurrencies(false);
        return;
      }

      try {
        setLoadingCurrencies(true);
        // Fetch verified prices to get unique currencies
        // Using a sample location (Istanbul) to get currencies
        const prices = await apiGet<VerifiedPrice[]>(
          "/api/verified-prices?lat=41.0082&lng=28.9784&radius=10000&limit=1000"
        );
        
        // Extract unique currencies
        const uniqueCurrencies = Array.from(
          new Set(
            (prices || [])
              .map((p) => p.currency)
              .filter((c) => c && c.trim() !== "")
          )
        ).sort();

        // Add common currencies if not present
        const commonCurrencies = ["TRY", "USD", "EUR", "GBP"];
        const allCurrencies = Array.from(
          new Set([...commonCurrencies, ...uniqueCurrencies])
        ).sort();

        setCurrencies(allCurrencies);
        setLastCurrencyFetchTime(now);
      } catch (error) {
        console.error("Failed to fetch currencies", error);
        // Fallback to common currencies
        if (currencies.length === 0) {
          setCurrencies(["TRY", "USD", "EUR", "GBP"]);
        }
      } finally {
        setLoadingCurrencies(false);
      }
    };

    fetchCurrencies();
  }, []);

  const handleLogout = () => {
    Alert.alert(t("settings.logout"), t("settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t("settings.deleteAccount"),
      t("settings.deleteAccountConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              // Delete account via API
              await apiDelete("/api/user/account");
              
              // Sign out user after successful deletion
              await signOut();
              
              Alert.alert(
                t("settings.deleteAccount"),
                t("settings.accountDeleted") || "Your account has been deleted successfully."
              );
            } catch (error) {
              Alert.alert(
                t("common.error"),
                error instanceof Error ? error.message : t("settings.deleteAccountError") || "Failed to delete account"
              );
            }
          },
        },
      ]
    );
  };

  const themeOptions = ["light", "dark", "system"];
  const themeLabels = [t("settings.light"), t("settings.dark"), t("settings.system")];
  const selectedThemeIndex = themeOptions.indexOf(themeMode);

  const languageOptions = ["en", "tr"];
  const languageLabels = ["English", "Türkçe"];

  const handleLanguageChange = (newLanguage: string) => {
    const lang = newLanguage as "en" | "tr";
    setLanguage(lang);
    setLocale(lang);
  };

  return (
    <>
      <AppHeader title={t("settings.title")} variant="stack" />
      <Screen variant="default" withTabBarInset={false} scroll>
        <View style={styles.content}>
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.appearance")}
            </Text>
            <SegmentedControl
              options={themeOptions}
              selectedIndex={selectedThemeIndex}
              onSelect={(index) => setThemeMode(themeOptions[index] as "light" | "dark" | "system")}
              labels={themeLabels}
            />
          </Card>

          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.notifications")}
            </Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("settings.notifications")}
                </Text>
              </View>
              <Text
                style={[
                  textStyles.sub,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                {t("settings.enabled")}
              </Text>
            </View>
            <View
              style={[
                styles.settingRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  paddingTop: theme.spacing.s16,
                  marginTop: theme.spacing.s16,
                },
              ]}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("settings.emailNotifications")}
                </Text>
              </View>
              <Text
                style={[
                  textStyles.sub,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                {t("settings.enabled")}
              </Text>
            </View>
          </Card>

          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.reminders")}
            </Text>
            <Picker
              label={t("settings.reminderOffset")}
              value={reminderOffsetMinutes}
              onValueChange={setReminderOffsetMinutes}
              min={1}
              max={60}
              suffix={` ${t("parking.minutes")}`}
            />
          </Card>

          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.currency")}
            </Text>
            {loadingCurrencies ? (
              <View style={{ padding: theme.spacing.s16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              </View>
            ) : (
              <StringPicker
                label=""
                value={currency}
                onValueChange={setCurrency}
                options={currencies}
              />
            )}
          </Card>

          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.language")}
            </Text>
            <StringPicker
              label=""
              value={language}
              onValueChange={handleLanguageChange}
              options={languageOptions}
              getLabel={(value) => {
                const index = languageOptions.indexOf(value);
                return index >= 0 ? languageLabels[index] : value;
              }}
            />
          </Card>

          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.dataPrivacy")}
            </Text>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("settings.exportData")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.settingRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  paddingTop: theme.spacing.s16,
                  marginTop: theme.spacing.s16,
                },
              ]}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("settings.privacyPolicy")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.settingRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  paddingTop: theme.spacing.s16,
                  marginTop: theme.spacing.s16,
                },
              ]}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("settings.termsOfService")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </Card>

          <Card>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.about")}
            </Text>
            <View style={styles.settingRow}>
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                {t("settings.version")}
              </Text>
              <Text
                style={[
                  textStyles.sub,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                1.0.0
              </Text>
            </View>
            <View
              style={[
                styles.settingRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  paddingTop: theme.spacing.s16,
                  marginTop: theme.spacing.s16,
                },
              ]}
            >
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                {t("settings.buildNumber")}
              </Text>
              <Text
                style={[
                  textStyles.sub,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                2024.01.15
              </Text>
            </View>
          </Card>

          <Card style={{ marginTop: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("settings.account")}
            </Text>
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.logoutButton,
                {
                  backgroundColor: theme.colors.danger,
                  borderRadius: theme.radii.r16,
                  marginBottom: theme.spacing.s12,
                },
              ]}
              activeOpacity={0.7}
            >
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
                {t("settings.logout")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={[
                styles.deleteAccountButton,
                {
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: theme.colors.danger,
                  borderRadius: theme.radii.r16,
                },
              ]}
              activeOpacity={0.7}
            >
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
                {t("settings.deleteAccount")}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Screen>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoutButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  deleteAccountButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});

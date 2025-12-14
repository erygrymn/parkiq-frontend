import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme";
import { useParkingStore } from "@/store/useParkingStore";

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const activeSessionId = useParkingStore((state) => state.activeSessionId);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("home.title")}
        </Text>
        {activeSessionId ? (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: theme.colors.text }]}>
              Active parking session
            </Text>
            <PrimaryButton
              title="View Active Parking"
              onPress={() => navigation.navigate("ActiveParking" as never)}
            />
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
              {t("home.noActiveParking")}
            </Text>
            <PrimaryButton
              title={t("home.startParking")}
              onPress={() => navigation.navigate("StartParking" as never)}
            />
          </View>
        )}
        <View style={styles.actions}>
          <PrimaryButton
            title={t("home.viewMap")}
            onPress={() => navigation.navigate("Map" as never)}
          />
          <View style={styles.spacer} />
          <PrimaryButton
            title={t("home.viewHistory")}
            onPress={() => navigation.navigate("History" as never)}
          />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 32,
  },
  statusContainer: {
    marginBottom: 32,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  actions: {
    marginTop: "auto",
  },
  spacer: {
    height: 16,
  },
});


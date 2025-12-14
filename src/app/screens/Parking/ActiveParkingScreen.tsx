import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme";
import { useParkingStore } from "@/store/useParkingStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { parkingService } from "@/services/parkingService";
import { formatCountdown } from "@/utils/date";

export const ActiveParkingScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const activeSessionId = useParkingStore((state) => state.activeSessionId);
  const remainingSeconds = useParkingStore((state) => state.remainingSeconds);
  const tick = useParkingStore((state) => state.tick);
  const reminderOffsetMinutes = useSettingsStore(
    (state) => state.reminderOffsetMinutes
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeSessionId) {
      navigation.navigate("Home" as never);
      return;
    }
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSessionId, navigation, tick]);

  const handleEndParking = async () => {
    setLoading(true);
    try {
      await parkingService.endParking();
      navigation.navigate("Home" as never);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeSessionId) {
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("parking.activeParking")}
        </Text>
        <View style={styles.countdownContainer}>
          <Text style={[styles.countdownLabel, { color: theme.colors.textSecondary }]}>
            {t("parking.timeRemaining")}
          </Text>
          <Text style={[styles.countdown, { color: theme.colors.primary }]}>
            {remainingSeconds !== null
              ? formatCountdown(remainingSeconds)
              : "--:--"}
          </Text>
        </View>
        <PrimaryButton
          title={t("parking.endButton")}
          onPress={handleEndParking}
          disabled={loading}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 32,
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  countdownLabel: {
    fontSize: 16,
    marginBottom: 16,
  },
  countdown: {
    fontSize: 48,
    fontWeight: "700",
  },
});


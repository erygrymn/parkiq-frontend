import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { TextInputField } from "@/components/ui/TextInputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme";
import { parkingService } from "@/services/parkingService";
import { useAuthStore } from "@/store/useAuthStore";
import { getCurrentStatus } from "@/services/revenuecatClient";

export const StartParkingScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      getCurrentStatus()
        .then((status) => setIsPremium(status === "premium"))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleStartParking = async () => {
    if (!isAuthenticated) {
      Alert.alert("Error", "Please sign in first");
      return;
    }
    setLoading(true);
    try {
      await parkingService.startParking(note || undefined);
      navigation.navigate("ActiveParking" as never);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("parking.startButton")}
        </Text>
        <TextInputField
          label={t("parking.notePlaceholder")}
          value={note}
          onChangeText={setNote}
          placeholder={t("parking.notePlaceholder")}
          multiline
          numberOfLines={4}
        />
        <View style={styles.photoSection}>
          <PrimaryButton
            title={t("parking.photoButton")}
            onPress={() => {}}
            disabled={true}
          />
          {!isPremium && (
            <Text style={[styles.premiumLabel, { color: theme.colors.textSecondary }]}>
              {t("parking.photoPremium")}
            </Text>
          )}
        </View>
        <PrimaryButton
          title={t("parking.startButton")}
          onPress={handleStartParking}
          disabled={loading}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 24,
  },
  photoSection: {
    marginBottom: 24,
  },
  premiumLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});


import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { apiPost } from "../../services/api";
import { GlassCard } from "../../components/GlassCard";
import { GlassButton } from "../../components/ui/GlassButton";
import { useTheme } from "../../theme";
import { t } from "../../localization";
import { getCurrentLocation } from "../../hooks/useLocation";

export const PricesScreen: React.FC = () => {
  const theme = useTheme();
  const [placeId, setPlaceId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [priceJson, setPriceJson] = useState("{}");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      let parsedPriceJson;
      try {
        parsedPriceJson = JSON.parse(priceJson);
      } catch {
        Alert.alert(t("common.error"), "Invalid JSON format");
        setLoading(false);
        return;
      }

      await apiPost("/api/price-submissions", {
        latitude: location.latitude,
        longitude: location.longitude,
        placeId: placeId || null,
        currency,
        priceJson: parsedPriceJson,
      });

      Alert.alert("Success", "Price submission created");
      setPlaceId("");
      setCurrency("USD");
      setPriceJson("{}");
    } catch (error) {
      Alert.alert(t("common.error"), error instanceof Error ? error.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.title.fontSize,
                fontWeight: theme.typography.title.fontWeight,
                marginBottom: theme.spacing.xl,
              },
            ]}
          >
            {t("prices.submitPrice")}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceGlass,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.separator,
                borderRadius: theme.radii.md,
                fontSize: theme.typography.body.fontSize,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              },
            ]}
            placeholder={t("prices.placeId")}
            placeholderTextColor={theme.colors.textSecondary}
            value={placeId}
            onChangeText={setPlaceId}
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceGlass,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.separator,
                borderRadius: theme.radii.md,
                fontSize: theme.typography.body.fontSize,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              },
            ]}
            placeholder={t("prices.currency")}
            placeholderTextColor={theme.colors.textSecondary}
            value={currency}
            onChangeText={setCurrency}
          />

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.surfaceGlass,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.separator,
                borderRadius: theme.radii.md,
                fontSize: theme.typography.body.fontSize,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
                minHeight: 200,
                textAlignVertical: "top",
              },
            ]}
            placeholder={t("prices.priceJson")}
            placeholderTextColor={theme.colors.textSecondary}
            value={priceJson}
            onChangeText={setPriceJson}
            multiline
            numberOfLines={10}
          />

          <View style={styles.buttonContainer}>
            <GlassButton
              title={t("prices.submit")}
              onPress={handleSubmit}
              disabled={loading}
            />
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  title: {},
  input: {
    borderWidth: 0.5,
  },
  textArea: {
    borderWidth: 0.5,
  },
  buttonContainer: {
    marginTop: 16,
  },
});


import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme";
import {
  getCurrentStatus,
  purchasePremium,
  restorePurchases,
} from "@/services/revenuecatClient";

export const SubscriptionScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [status, setStatus] = useState<"free" | "premium">("free");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const currentStatus = await getCurrentStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error("Failed to load subscription status", error);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await purchasePremium();
      await loadStatus();
      Alert.alert("Success", "Premium subscription activated");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await restorePurchases();
      await loadStatus();
      Alert.alert("Success", "Purchases restored");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <SectionHeader title={t("subscription.title")} />
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t("subscription.currentStatus")}
        </Text>
        <Text
          style={[
            styles.status,
            {
              color:
                status === "premium"
                  ? theme.colors.success
                  : theme.colors.textSecondary,
            },
          ]}
        >
          {status === "premium" ? t("subscription.premium") : t("subscription.free")}
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton
          title={t("subscription.purchasePremium")}
          onPress={handlePurchase}
          disabled={loading || status === "premium"}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          title={t("subscription.restorePurchases")}
          onPress={handleRestore}
          disabled={loading}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  status: {
    fontSize: 24,
    fontWeight: "600",
  },
  actions: {
    marginTop: "auto",
  },
  spacer: {
    height: 16,
  },
});


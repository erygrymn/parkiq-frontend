import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { TextInputField } from "@/components/ui/TextInputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { validateEmail } from "@/utils/validation";

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) throw error;
      Alert.alert(
        "Check your email",
        "We've sent you a magic link to sign in"
      );
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    Alert.alert("Coming soon", "Apple Sign In will be available soon");
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("auth.loginTitle")}
        </Text>
        <TextInputField
          label={t("auth.emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <PrimaryButton
          title={t("auth.loginButton")}
          onPress={handleLogin}
          disabled={loading}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          title={t("auth.appleSignIn")}
          onPress={handleAppleSignIn}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 32,
    textAlign: "center",
  },
  spacer: {
    height: 16,
  },
});


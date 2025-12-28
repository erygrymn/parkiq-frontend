import React, { useState, useRef } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { PrimaryButton } from "../../ui/components/Button";
import { Card } from "../../ui/components/Card";
import { useAuthStore } from "../../state/authStore";
import { t } from "../../localization";
import type { AuthStackParamList } from "../../app/navigation/AuthNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const ForgotPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const handleSendReset = async () => {
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the verification.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await sendPasswordReset(email.trim(), captchaToken);
      setShowConfirmation(true);
    } catch (err: any) {
      const errorMessage = err?.message || "";
      
      if (errorMessage.includes("captcha") || errorMessage.includes("verification")) {
        setError("Verification failed. Please try again.");
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <Card>
            <View style={styles.confirmationContent}>
              <Text style={[textStyles.h2, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s16, textAlign: "center" }]}>
                Check your email
              </Text>
              <Text style={[textStyles.body, { color: theme.colors.textSecondary, textAlign: "center", marginBottom: theme.spacing.s24 }]}>
                We sent you a password reset link.
              </Text>
              <PrimaryButton
                title={t("auth.backToLogin")}
                onPress={() => navigation.navigate("Login")}
              />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.content}>
          <Text style={[textStyles.h1, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s8 }]}>
            {t("auth.resetPassword")}
          </Text>
          <Text style={[textStyles.body, { color: theme.colors.textSecondary, marginBottom: theme.spacing.s24 }]}>
            {t("auth.enterEmailForReset")}
          </Text>

          <Card>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[textStyles.label, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s8 }]}>
                  {t("auth.email")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface2,
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("auth.email")}
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                  onSubmitEditing={handleSendReset}
                />
              </View>

              {error && (
                <Text style={[textStyles.caption, { color: theme.colors.danger, marginTop: theme.spacing.s8 }]}>
                  {error}
                </Text>
              )}

              <View style={[styles.turnstileContainer, { minHeight: 65 }]}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey="0x4AAAAAACHU3lm9sz4rdEzE"
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setError(null);
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                    setError("Verification failed. Please try again.");
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                  }}
                />
              </View>

              <PrimaryButton
                title={t("auth.sendResetLink")}
                onPress={handleSendReset}
                loading={loading}
                disabled={loading || !captchaToken}
                style={{ marginTop: theme.spacing.s24 }}
              />
            </View>
          </Card>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={{ marginTop: theme.spacing.s24 }}
          >
            <Text style={[textStyles.body, { color: theme.colors.accent, textAlign: "center" }]}>
              {t("auth.backToLogin")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: "center",
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  confirmationContent: {
    alignItems: "center",
  },
  turnstileContainer: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});


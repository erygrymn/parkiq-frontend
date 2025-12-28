import React, { useState, useRef } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
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

export const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const signUp = useAuthStore((state) => state.signUp);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the verification.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signUp(email.trim(), password, captchaToken);
      setShowConfirmation(true);
    } catch (err: any) {
      const errorMessage = err?.message || "";
      const errorCode = err?.code || "";
      
      if (errorCode === "email_not_confirmed" || errorMessage.includes("email_not_confirmed")) {
        setError("Please confirm your email before logging in.");
      } else if (errorMessage.includes("already registered") || errorMessage.includes("User already registered")) {
        setError("An account with this email already exists. Try signing in.");
      } else if (errorMessage.includes("captcha") || errorMessage.includes("verification")) {
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
                We sent you a confirmation link. Open it to finish creating your account.
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={[textStyles.h1, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s8 }]}>
              {t("auth.register")}
            </Text>
            <Text style={[textStyles.body, { color: theme.colors.textSecondary, marginBottom: theme.spacing.s24 }]}>
              {t("auth.registerSubtitle")}
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
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[textStyles.label, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s8 }]}>
                    {t("auth.password")}
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
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t("auth.password")}
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[textStyles.label, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s8 }]}>
                    {t("auth.confirmPassword")}
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("auth.confirmPassword")}
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!loading}
                    onSubmitEditing={handleSignUp}
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
                  title={t("auth.registerButton")}
                  onPress={handleSignUp}
                  loading={loading}
                  disabled={loading || !captchaToken}
                  style={{ marginTop: theme.spacing.s24 }}
                />
              </View>
            </Card>

            <View style={styles.footer}>
              <Text style={[textStyles.body, { color: theme.colors.textSecondary }]}>
                {t("auth.hasAccount")}{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={[textStyles.body, { color: theme.colors.accent, fontWeight: "600" }]}>
                  {t("auth.login")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
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


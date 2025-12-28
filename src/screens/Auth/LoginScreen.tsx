import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { PrimaryButton } from "../../ui/components/Button";
import { Card } from "../../ui/components/Card";
import { useAuthStore } from "../../state/authStore";
import { t } from "../../localization";
import type { AuthStackParamList } from "../../app/navigation/AuthNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const signIn = useAuthStore((state) => state.signIn);
  const signInAnonymously = useAuthStore((state) => state.signInAnonymously);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [anonymousLoading, setAnonymousLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      const errorMessage = err?.message || "";
      const errorCode = err?.code || "";
      
      if (errorCode === "EMAIL_NOT_CONFIRMED" || errorMessage.includes("email_not_confirmed") || errorMessage.includes("Please confirm your email")) {
        setError("Please confirm your email before logging in.");
      } else if (errorMessage.includes("Invalid login credentials") || errorMessage.includes("invalid_credentials")) {
        setError("Invalid email or password.");
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("too_many_requests")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithoutAccount = async () => {
    setError(null);
    setAnonymousLoading(true);

    try {
      await signInAnonymously();
    } catch (err: any) {
      console.error("Anonymous sign-in error:", err);
      const errorMessage = err?.message || "";
      const errorCode = err?.code || "";
      
      if (errorMessage.includes("captcha") || errorCode.includes("captcha")) {
        setError("Anonymous sign-in requires CAPTCHA verification. Please check Supabase settings to disable CAPTCHA for anonymous sign-in.");
      } else if (errorMessage.includes("Anonymous sign-ins are disabled")) {
        setError("Anonymous sign-in is not enabled. Please create an account.");
      } else if (errorMessage.includes("signup_disabled")) {
        setError("Sign-up is currently disabled. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setAnonymousLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.content}>
          <Text style={[textStyles.h1, { color: theme.colors.textPrimary, marginBottom: theme.spacing.s8 }]}>
            {t("auth.login")}
          </Text>
          <Text style={[textStyles.body, { color: theme.colors.textSecondary, marginBottom: theme.spacing.s24 }]}>
            {t("auth.loginSubtitle")}
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
                  textContentType="password"
                  editable={!loading}
                  onSubmitEditing={handleSignIn}
                />
              </View>

              {error && (
                <Text style={[textStyles.caption, { color: theme.colors.danger, marginTop: theme.spacing.s8 }]}>
                  {error}
                </Text>
              )}

              <PrimaryButton
                title={t("auth.loginButton")}
                onPress={handleSignIn}
                loading={loading}
                disabled={loading}
                style={{ marginTop: theme.spacing.s24 }}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate("ForgotPassword")}
                style={{ marginTop: theme.spacing.s16 }}
              >
                <Text style={[textStyles.body, { color: theme.colors.accent, textAlign: "center" }]}>
                  {t("auth.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={[textStyles.body, { color: theme.colors.textSecondary }]}>
              {t("auth.noAccount")}{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={[textStyles.body, { color: theme.colors.accent, fontWeight: "600" }]}>
                {t("auth.register")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <Text style={[textStyles.caption, { color: theme.colors.textSecondary, marginHorizontal: theme.spacing.s16 }]}>
              or
            </Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          </View>

          <TouchableOpacity
            onPress={handleContinueWithoutAccount}
            disabled={loading || anonymousLoading}
            style={[
              styles.anonymousButton,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
                opacity: (loading || anonymousLoading) ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[textStyles.body, { color: theme.colors.textPrimary, fontWeight: "600" }]}>
              Continue without account
            </Text>
          </TouchableOpacity>

          <Text style={[textStyles.caption, { color: theme.colors.textSecondary, textAlign: "center", marginTop: theme.spacing.s8 }]}>
            Your data will stay on this device.
          </Text>
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  anonymousButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});


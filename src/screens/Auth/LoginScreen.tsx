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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      
      if (errorMessage.includes("Email not confirmed") || errorMessage.includes("email_not_confirmed")) {
        setError("Please confirm your email before signing in.");
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
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
});


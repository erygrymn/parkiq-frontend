import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../state/authStore";
import { Screen } from "../../ui/components/Screen";
import { Card } from "../../ui/components/Card";
import { PrimaryButton, SecondaryButton } from "../../ui/components/Button";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";
import { supabase } from "../../services/supabase";
import Constants from "expo-constants";

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t("common.error"), t("auth.emailRequired"));
      return;
    }
    if (!password) {
      Alert.alert(t("common.error"), t("auth.passwordRequired"));
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Profile check and creation (if needed) is now handled in signInWithEmail
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      
      if (errorMessage === "EMAIL_NOT_CONFIRMED") {
        // Check if running in Expo Go (deep links won't work)
        const isExpoGo = Constants.executionEnvironment === Constants.ExecutionEnvironment.StoreClient;
        
        Alert.alert(
          t("common.error"),
          isExpoGo 
            ? t("auth.emailNotConfirmedExpoGo") || "E-posta adresinizi onaylayın. Email'deki link'e tıklayın, sonra buraya dönüp tekrar login yapmayı deneyin."
            : t("auth.emailNotConfirmed"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("auth.resendConfirmationEmail"),
              onPress: async () => {
                try {
                  const { error: resendError } = await supabase.auth.resend({
                    type: "signup",
                    email: email.trim(),
                  });
                  
                  if (resendError) {
                    Alert.alert(
                      t("common.error"),
                      resendError.message || t("auth.resendConfirmationEmailError")
                    );
                  } else {
                    Alert.alert(
                      t("common.info"),
                      isExpoGo
                        ? t("auth.confirmationEmailResentExpoGo") || "Onay maili gönderildi. Email'inizdeki link'e tıklayın, sonra buraya dönüp login yapın."
                        : t("auth.confirmationEmailResent")
                    );
                  }
                } catch (resendErr) {
                  Alert.alert(
                    t("common.error"),
                    t("auth.resendConfirmationEmailError")
                  );
                }
              },
            },
          ]
        );
      } else if (errorMessage === "INVALID_CREDENTIALS") {
        Alert.alert(
          t("common.error"),
          t("auth.invalidCredentials") || "Geçersiz email veya şifre. Lütfen tekrar deneyin."
        );
      } else if (errorMessage === "PROFILE_NOT_FOUND") {
        Alert.alert(
          t("common.error"),
          t("auth.profileNotFound") || "Hesabınız bulunamadı. Lütfen destek ekibiyle iletişime geçin."
        );
      } else {
        // For other errors, show a user-friendly message
        const friendlyMessage = errorMessage.includes("Invalid login") || 
                                errorMessage.includes("invalid credentials") ||
                                errorMessage.includes("invalid password")
          ? (t("auth.invalidCredentials") || "Geçersiz email veya şifre. Lütfen tekrar deneyin.")
          : errorMessage;
        
        Alert.alert(
          t("common.error"),
          friendlyMessage
        );
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <Screen variant="default" scroll keyboardAvoiding>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                textStyles.title,
                {
                  color: theme.colors.textPrimary,
                  fontSize: 28,
                  fontWeight: "700",
                  marginBottom: theme.spacing.s8,
                },
              ]}
            >
              {t("auth.login")}
            </Text>
            <Text
              style={[
                textStyles.body,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {t("auth.loginSubtitle")}
            </Text>
          </View>

          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <View style={{ marginBottom: theme.spacing.s16 }}>
              <Text
                style={[
                  textStyles.section,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.s8,
                  },
                ]}
              >
                {t("auth.email")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface2,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.r16,
                    paddingLeft: theme.spacing.s16,
                    paddingRight: theme.spacing.s14,
                    paddingVertical: theme.spacing.s12,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>

            <View style={{ marginBottom: theme.spacing.s24 }}>
              <Text
                style={[
                  textStyles.section,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.s8,
                  },
                ]}
              >
                {t("auth.password")}
              </Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface2,
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.r16,
                      paddingLeft: theme.spacing.s16,
                      paddingRight: 50,
                      paddingVertical: theme.spacing.s12,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                const nav = navigation as any;
                nav.navigate("ForgotPassword");
              }}
              style={{ alignSelf: "flex-end", marginBottom: theme.spacing.s24 }}
            >
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.accent,
                    fontWeight: "600",
                  },
                ]}
              >
                {t("auth.forgotPassword")}
              </Text>
            </TouchableOpacity>

            <PrimaryButton
              title={t("auth.loginButton")}
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
            />
          </Card>


          <View style={styles.registerLink}>
            <Text
              style={[
                textStyles.body,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {t("auth.noAccount")}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const nav = navigation as any;
                nav.navigate("Register");
              }}
            >
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.accent,
                    fontWeight: "600",
                  },
                ]}
              >
                {t("auth.register")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
    height: 44,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    height: 44,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  registerLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
});

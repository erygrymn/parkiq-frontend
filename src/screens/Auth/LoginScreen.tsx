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

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const signInWithApple = useAuthStore((state) => state.signInWithApple);

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
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (error) {
      Alert.alert(t("common.error"), "Apple login failed");
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

          {Platform.OS === "ios" && (
            <Card style={{ marginBottom: theme.spacing.s16 }}>
              <SecondaryButton
                title={t("auth.appleLogin")}
                onPress={handleAppleLogin}
                disabled={loading}
                loading={loading}
              />
            </Card>
          )}

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

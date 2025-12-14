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
import { StringPicker } from "../../ui/components/StringPicker";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const signUpWithEmail = useAuthStore((state) => state.signUpWithEmail);
  const signInWithApple = useAuthStore((state) => state.signInWithApple);

  const handleRegister = async () => {
    // Validation - Only firstName, lastName, email, and password are required
    if (!firstName.trim()) {
      Alert.alert(t("common.error"), t("auth.firstNameRequired"));
      return;
    }
    if (!lastName.trim()) {
      Alert.alert(t("common.error"), t("auth.lastNameRequired"));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t("common.error"), t("auth.emailRequired"));
      return;
    }
    if (!password) {
      Alert.alert(t("common.error"), t("auth.passwordRequired"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      // TODO: Update user profile with additional info (firstName, lastName, phone, bloodType, licensePlate)
      // This would be done via API call after successful registration
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : "Registration failed"
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
              {t("auth.register")}
            </Text>
            <Text
              style={[
                textStyles.body,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {t("auth.registerSubtitle")}
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
                {t("auth.firstName")}
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
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                autoCorrect={false}
              />
            </View>

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
                {t("auth.lastName")}
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
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                autoCorrect={false}
              />
            </View>

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

            <View style={{ marginBottom: theme.spacing.s16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.s8 }}>
                <Text
                  style={[
                    textStyles.section,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {t("auth.phone")}
                </Text>
                <Text
                  style={[
                    textStyles.caption,
                    {
                      color: theme.colors.textTertiary,
                      marginLeft: theme.spacing.s4,
                    },
                  ]}
                >
                  ({t("auth.optional")})
                </Text>
              </View>
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
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                autoCorrect={false}
              />
            </View>

            <View style={{ marginBottom: theme.spacing.s16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.s8 }}>
                <Text
                  style={[
                    textStyles.section,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {t("auth.bloodType")}
                </Text>
                <Text
                  style={[
                    textStyles.caption,
                    {
                      color: theme.colors.textTertiary,
                      marginLeft: theme.spacing.s4,
                    },
                  ]}
                >
                  ({t("auth.optional")})
                </Text>
              </View>
              <StringPicker
                label=""
                value={bloodType}
                onValueChange={setBloodType}
                options={BLOOD_TYPES}
              />
            </View>

            <View style={{ marginBottom: theme.spacing.s16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.s8 }}>
                <Text
                  style={[
                    textStyles.section,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {t("auth.licensePlate")}
                </Text>
                <Text
                  style={[
                    textStyles.caption,
                    {
                      color: theme.colors.textTertiary,
                      marginLeft: theme.spacing.s4,
                    },
                  ]}
                >
                  ({t("auth.optional")})
                </Text>
              </View>
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
                value={licensePlate}
                onChangeText={setLicensePlate}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

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
                  autoComplete="password-new"
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
                {t("auth.confirmPassword")}
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
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <PrimaryButton
              title={t("auth.registerButton")}
              onPress={handleRegister}
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

          <View style={styles.loginLink}>
            <Text
              style={[
                textStyles.body,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {t("auth.hasAccount")}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const nav = navigation as any;
                nav.navigate("Login");
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
                {t("auth.login")}
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
    paddingVertical: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
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
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
});

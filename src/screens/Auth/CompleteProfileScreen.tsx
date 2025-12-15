import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../state/authStore";
import { Screen } from "../../ui/components/Screen";
import { Card } from "../../ui/components/Card";
import { PrimaryButton } from "../../ui/components/Button";
import { StringPicker } from "../../ui/components/StringPicker";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";
import { apiPatch } from "../../services/api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const CompleteProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleCompleteProfile = async () => {
    // Validation - firstName and lastName are required
    if (!firstName.trim()) {
      Alert.alert(t("common.error"), t("auth.firstNameRequired"));
      return;
    }
    if (!lastName.trim()) {
      Alert.alert(t("common.error"), t("auth.lastNameRequired"));
      return;
    }

    setLoading(true);
    try {
      // Update profile via API
      await apiPatch("/api/user/profile", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        bloodType: bloodType || null,
        licensePlate: licensePlate.trim() || null,
      });

      // Profile completed, navigate back to ProfileMain
      Alert.alert(t("common.info"), "Profil bilgileriniz güncellendi!", [
        {
          text: t("common.ok"),
          onPress: () => {
            const nav = navigation as any;
            nav.navigate("ProfileMain");
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : "Failed to update profile"
      );
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
              {t("auth.completeProfile")}
            </Text>
            <Text
              style={[
                textStyles.body,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {t("auth.completeProfileDescription")}
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
                {t("auth.firstName")} *
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
                placeholder={t("auth.firstName")}
                placeholderTextColor={theme.colors.textTertiary}
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
                {t("auth.lastName")} *
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
                placeholder={t("auth.lastName")}
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholder={t("auth.phone")}
                placeholderTextColor={theme.colors.textTertiary}
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

            <View style={{ marginBottom: theme.spacing.s24 }}>
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
                placeholder={t("auth.licensePlate")}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <PrimaryButton
              title={t("common.save")}
              onPress={handleCompleteProfile}
              disabled={loading}
              loading={loading}
            />
          </Card>
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
});


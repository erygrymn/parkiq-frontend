import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { PrimaryButton } from "../../ui/components/Button";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";
import { supabase } from "../../services/supabase";

export const ForgotPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t("common.error"), t("auth.emailRequired"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "parkiq://reset-password",
      });

      if (error) throw error;

      Alert.alert(
        t("common.done"),
        t("auth.resetLinkSent"),
        [
          {
            text: t("common.done"),
            onPress: () => {
              const nav = navigation as any;
              nav.navigate("Login");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : "Failed to send reset link"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader
        title={t("auth.resetPassword")}
        variant="stack"
        onBackPress={() => {
          const nav = navigation as any;
          nav.navigate("Login");
        }}
      />
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
                  textStyles.body,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.s24,
                    textAlign: "center",
                  },
                ]}
              >
                {t("auth.enterEmailForReset")}
              </Text>
            </View>

            <Card>
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
                  autoFocus
                />
              </View>

              <PrimaryButton
                title={t("auth.sendResetLink")}
                onPress={handleResetPassword}
                disabled={loading}
                loading={loading}
              />
            </Card>
          </View>
        </ScrollView>
      </Screen>
    </>
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
});


import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useParkingStore } from "../../state/parkingStore";
import { useParkingTimer } from "../../hooks/useParkingTimer";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { PrimaryButton, SecondaryButton } from "../../ui/components/Button";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";

export const ParkingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const activeSession = useParkingStore((state) => state.activeSession);
  const loading = useParkingStore((state) => state.loading);
  const reminderEnabled = useParkingStore((state) => state.reminderEnabled);
  const reminderOffsetMinutes = useParkingStore((state) => state.reminderOffsetMinutes);
  const endParking = useParkingStore((state) => state.endParking);
  const loadActiveSessionFromBackend = useParkingStore((state) => state.loadActiveSessionFromBackend);
  const timer = useParkingTimer();
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [localNote, setLocalNote] = useState("");

  useEffect(() => {
    loadActiveSessionFromBackend();
  }, [loadActiveSessionFromBackend]);

  useEffect(() => {
    if (activeSession) {
      setLocalNote(activeSession.note || "");
    }
  }, [activeSession]);

  const handleStartParking = () => {
    const nav = navigation as any;
    nav.navigate("PreParking");
  };

  const handleEndParking = async () => {
    if (!activeSession) return;

    try {
      const endedSession = await endParking();
      if (endedSession) {
        const nav = navigation as any;
        nav.navigate("ParkingSummary", {
          session: endedSession,
          reminderEnabled,
          reminderOffsetMinutes,
        });
      }
    } catch (error) {
      Alert.alert(t("common.error"), error instanceof Error ? error.message : "Failed to end parking");
    }
  };

  if (activeSession) {
    return (
      <Screen variant="default" withTabBarInset>
        <AppHeader title={t("parking.title")} variant="root" />
        <View style={styles.content}>
          <Card style={{ marginTop: theme.spacing.s24 }}>
            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing.s12,
                  },
                ]}
              >
                Active Parking
              </Text>
              <Text
                style={[
                  textStyles.timer,
                  {
                    color: theme.colors.accent,
                    marginBottom: theme.spacing.s4,
                  },
                ]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {String(timer.hours).padStart(2, "0")}:{String(timer.minutes).padStart(2, "0")}:{String(timer.seconds).padStart(2, "0")}
              </Text>
              <Text
                style={[
                  textStyles.caption,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.s12,
                  },
                ]}
              >
                {t("parking.timer")}
              </Text>
              {reminderEnabled && (
                <Text
                  style={[
                    textStyles.sub,
                    {
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing.s12,
                    },
                  ]}
                >
                  Reminder Enabled ({reminderOffsetMinutes} {t("parking.minutes")})
                </Text>
              )}
              <View style={{ width: "100%", marginTop: theme.spacing.s12 }}>
                <SecondaryButton
                  title={t("parking.endParking")}
                  onPress={handleEndParking}
                  disabled={loading}
                />
              </View>
            </View>
          </Card>
        </View>

        <Modal
          visible={noteModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setNoteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Card
              style={{ margin: theme.spacing.s16, maxHeight: "80%" }}
            >
              <View style={{ padding: theme.spacing.s24 }}>
                <Text
                  style={[
                    textStyles.title,
                    {
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing.s16,
                    },
                  ]}
                >
                  {t("parking.editNote")}
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.surface2,
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.r16,
                      paddingHorizontal: theme.spacing.s12,
                      paddingVertical: theme.spacing.s12,
                      minHeight: 100,
                    },
                  ]}
                  value={localNote}
                  onChangeText={setLocalNote}
                  placeholder={t("parking.notePlaceholder")}
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={{ flexDirection: "row", gap: theme.spacing.s12, marginTop: theme.spacing.s16 }}>
                  <SecondaryButton
                    title={t("common.cancel")}
                    onPress={() => setNoteModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    title={t("common.save")}
                    onPress={() => {
                      if (activeSession) {
                        useParkingStore.setState({
                          activeSession: {
                            ...activeSession,
                            note: localNote.trim() || null,
                          },
                        });
                      }
                      setNoteModalVisible(false);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </Card>
          </View>
        </Modal>
      </Screen>
    );
  }

  return (
    <Screen variant="default" withTabBarInset scroll>
      <AppHeader title={t("parking.title")} variant="root" />
      <View style={[styles.content, { flex: 1, justifyContent: "center" }]}>
        <Card>
          <View style={{ padding: theme.spacing.s24, alignItems: "center" }}>
            <Text
              style={[
                textStyles.headline,
                {
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing.s8,
                },
              ]}
            >
              {t("parking.noActiveSession")}
            </Text>
            <Text
              style={[
                textStyles.body,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s20,
                  textAlign: "center",
                },
              ]}
            >
              Start a parking session to track time and get reminded.
            </Text>
            <PrimaryButton
              title={t("parking.startParking")}
              onPress={handleStartParking}
              disabled={loading}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalInput: {
    borderWidth: 1,
    textAlignVertical: "top",
  },
});

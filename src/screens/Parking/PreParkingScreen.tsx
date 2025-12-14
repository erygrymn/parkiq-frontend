import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useParkingStore } from "../../state/parkingStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { getCurrentLocation } from "../../hooks/useLocation";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { PrimaryButton } from "../../ui/components/Button";
import { Picker } from "../../ui/components/Picker";
import { LocationPicker } from "../../ui/components/LocationPicker";
import { TimePicker } from "../../ui/components/TimePicker";
import { SegmentedControl } from "../../ui/components/SegmentedControl";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";

async function scheduleReminderNotification(triggerTime: number): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      return null;
    }
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: t("parking.reminderTitle"),
        body: t("parking.reminderBody"),
      },
      trigger: new Date(triggerTime) as any,
    });
  } catch {
    return null;
  }
}

interface PreParkingScreenProps {
  onClose?: () => void;
  onPhotoTaken?: (uri: string) => void;
}

export const PreParkingScreen: React.FC<PreParkingScreenProps> = ({ onClose, onPhotoTaken }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const startParking = useParkingStore((state) => state.startParking);
  const loading = useParkingStore((state) => state.loading);
  const reminderOffsetMinutes = useSettingsStore((state) => state.reminderOffsetMinutes);

  const [note, setNote] = useState("");
  const [parkedMinutesAgo, setParkedMinutesAgo] = useState(0);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderType, setReminderType] = useState<"time" | "duration">("duration");
  const [reminderHour, setReminderHour] = useState(0);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderDurationHour, setReminderDurationHour] = useState(0);
  const [reminderDurationMinute, setReminderDurationMinute] = useState(reminderOffsetMinutes);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  const shouldShowTabBar = false;

  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
      } catch (error) {
        Alert.alert(t("common.error"), error instanceof Error ? error.message : "Failed to get location");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const now = new Date();
    setReminderHour(now.getHours());
    setReminderMinute(now.getMinutes());
    // Set default duration reminder to 10 minutes
    setReminderDurationHour(0);
    setReminderDurationMinute(reminderOffsetMinutes);
  }, [reminderOffsetMinutes]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("common.error"),
          "Sorry, we need camera permissions to take photos!"
        );
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri;
        setPhoto(photoUri);
        if (onPhotoTaken) {
          onPhotoTaken(photoUri);
        }
      }
    } catch (error) {
      Alert.alert(t("common.error"), "Failed to take photo");
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
  };

  const handleConfirm = async () => {
    if (!location) {
      Alert.alert(t("common.error"), "Location not available");
      return;
    }

    try {
      const now = new Date();
      const adjustedStartedAt = parkedMinutesAgo > 0
        ? new Date(now.getTime() - parkedMinutesAgo * 60 * 1000).toISOString()
        : null;

          const response = await startParking({
            latitude: location.latitude,
            longitude: location.longitude,
            locationName: null,
            note: note.trim() || null,
            adjustedStartedAt: adjustedStartedAt,
            premiumTimer: false,
            hasPhoto: !!photo,
          });

      let notificationId: string | null = null;
      if (reminderEnabled) {
        let triggerTime: number;
        
        if (reminderType === "time") {
          // Set reminder for specific time today or tomorrow
          const now = new Date();
          const reminderDate = new Date();
          reminderDate.setHours(reminderHour, reminderMinute, 0, 0);
          
          // If the time has passed today, set for tomorrow
          if (reminderDate.getTime() <= now.getTime()) {
            reminderDate.setDate(reminderDate.getDate() + 1);
          }
          
          triggerTime = reminderDate.getTime();
        } else {
          // Duration-based reminder (hours and minutes)
          const startTime = adjustedStartedAt
            ? new Date(adjustedStartedAt).getTime()
            : new Date(response.started_at).getTime();
          const durationMs = (reminderDurationHour * 60 + reminderDurationMinute) * 60 * 1000;
          triggerTime = startTime + durationMs;
        }

        notificationId = await scheduleReminderNotification(triggerTime);
      }

      useParkingStore.setState({
        reminderEnabled,
        reminderOffsetMinutes: reminderDurationMinute,
        scheduledNotificationId: notificationId,
      });

      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      const errorMessage = error instanceof Error && error.message.includes("Network request failed")
        ? "Network request failed"
        : (error instanceof Error ? error.message : "Failed to start parking");
      Alert.alert(t("common.error"), errorMessage);
    }
  };

  return (
    <>
      <AppHeader 
        title={t("parking.setupParking")} 
        variant="stack"
        onBackPress={onClose}
      />
      <Screen variant="default" withTabBarInset={shouldShowTabBar} scroll={false} keyboardAvoiding={false}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + theme.spacing.s16,
          }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
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
              {t("parking.location")}
            </Text>
            <LocationPicker
              label={t("parking.location")}
              location={location}
              onLocationChange={setLocation}
              loading={locationLoading}
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
              {t("parking.note")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface2,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.r16,
                  paddingHorizontal: theme.spacing.s12,
                  paddingVertical: theme.spacing.s12,
                },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder={t("parking.notePlaceholder")}
              placeholderTextColor={theme.colors.textTertiary}
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
              {t("parking.photo")}
            </Text>
            {photo ? (
              <View
                style={[
                  styles.photoContainer,
                  {
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.r16,
                  },
                ]}
              >
                <Image
                  source={{ uri: photo }}
                  style={styles.photoPreview}
                />
                <TouchableOpacity
                  style={[
                    styles.removePhotoButton,
                    {
                      backgroundColor: theme.colors.danger,
                    },
                  ]}
                  onPress={handleRemovePhoto}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  {
                    backgroundColor: theme.colors.surface2,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.r16,
                  },
                ]}
                onPress={handleTakePhoto}
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginTop: theme.spacing.s8,
                    },
                  ]}
                >
                  {t("parking.takePhoto")}
                </Text>
              </TouchableOpacity>
            )}
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
              {t("parking.startTimeAdjustment")}
            </Text>
            <Picker
              label=""
              value={parkedMinutesAgo}
              onValueChange={setParkedMinutesAgo}
              min={0}
              max={120}
              suffix={` ${t("parking.minutes")} ${t("parking.ago")}`}
            />
          </View>

          <View style={{ marginBottom: theme.spacing.s24 }}>
            <View
              style={[
                styles.switchRow,
                {
                  borderBottomWidth: reminderEnabled ? 0.5 : 0,
                  borderBottomColor: theme.colors.border,
                  paddingBottom: reminderEnabled ? theme.spacing.s16 : 0,
                  marginBottom: reminderEnabled ? theme.spacing.s16 : 0,
                },
              ]}
            >
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textPrimary,
                    fontWeight: "600",
                  },
                ]}
              >
                {t("parking.enableReminder")}
              </Text>
              <Switch
                onValueChange={setReminderEnabled}
                value={reminderEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              />
            </View>
            {reminderEnabled && (
              <View>
                <SegmentedControl
                  options={[t("parking.atTime"), t("parking.afterDuration")]}
                  selectedIndex={reminderType === "time" ? 0 : 1}
                  onSelect={(index) => setReminderType(index === 0 ? "time" : "duration")}
                />
                {reminderType === "time" ? (
                  <View style={{ marginTop: theme.spacing.s16 }}>
                    <TimePicker
                      label={t("parking.remindAt")}
                      hour={reminderHour}
                      minute={reminderMinute}
                      onTimeChange={(h, m) => {
                        setReminderHour(h);
                        setReminderMinute(m);
                      }}
                    />
                  </View>
                ) : (
                  <View style={{ marginTop: theme.spacing.s16 }}>
                    <TimePicker
                      label={t("parking.reminderAfter")}
                      hour={reminderDurationHour}
                      minute={reminderDurationMinute}
                      onTimeChange={(h, m) => {
                        setReminderDurationHour(h);
                        setReminderDurationMinute(m);
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
          </Card>

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: theme.spacing.s16,
                paddingTop: theme.spacing.s16,
                marginTop: theme.spacing.s16,
              },
            ]}
          >
            <PrimaryButton
              title={t("parking.confirmParking")}
              onPress={handleConfirm}
              disabled={loading || locationLoading || !location}
            />
          </View>
        </ScrollView>
      </Screen>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    height: 44,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  photoButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  photoContainer: {
    position: "relative",
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 200,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  removePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    // Button inside ScrollView
  },
});

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

interface TimePickerProps {
  label: string;
  hour: number;
  minute: number;
  onTimeChange: (hour: number, minute: number) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  hour,
  minute,
  onTimeChange,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    onTimeChange(selectedHour, selectedMinute);
    setModalVisible(false);
  };

  const formatTime = (h: number, m: number) => {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          setSelectedHour(hour);
          setSelectedMinute(minute);
          setModalVisible(true);
        }}
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surface2,
            borderRadius: theme.radii.r16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.s16,
            paddingVertical: theme.spacing.s12,
          },
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            textStyles.body,
            {
              color: theme.colors.textPrimary,
            },
          ]}
        >
          {label}
        </Text>
        <View style={styles.valueContainer}>
          <Text
            style={[
              textStyles.body,
              {
                color: theme.colors.textSecondary,
                marginRight: theme.spacing.s8,
              },
            ]}
          >
            {formatTime(hour, minute)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textTertiary}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radii.r20,
                borderTopRightRadius: theme.radii.r20,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  textStyles.navTitle,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                {label}
              </Text>
              <TouchableOpacity
                onPress={handleConfirm}
                style={styles.closeButton}
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
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text
                  style={[
                    textStyles.caption,
                    {
                      color: theme.colors.textSecondary,
                      textAlign: "center",
                      marginBottom: 8,
                    },
                  ]}
                >
                  Hour
                </Text>
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {hours.map((h) => {
                    const isSelected = h === selectedHour;
                    return (
                      <TouchableOpacity
                        key={h}
                        onPress={() => setSelectedHour(h)}
                        style={[
                          styles.option,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.surface2
                              : "transparent",
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            textStyles.body,
                            {
                              color: isSelected
                                ? theme.colors.accent
                                : theme.colors.textPrimary,
                              fontWeight: isSelected ? "600" : "400",
                            },
                          ]}
                        >
                          {String(h).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text
                  style={[
                    textStyles.caption,
                    {
                      color: theme.colors.textSecondary,
                      textAlign: "center",
                      marginBottom: 8,
                    },
                  ]}
                >
                  Minute
                </Text>
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {minutes.map((m) => {
                    const isSelected = m === selectedMinute;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setSelectedMinute(m)}
                        style={[
                          styles.option,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.surface2
                              : "transparent",
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            textStyles.body,
                            {
                              color: isSelected
                                ? theme.colors.accent
                                : theme.colors.textPrimary,
                              fontWeight: isSelected ? "600" : "400",
                            },
                          ]}
                        >
                          {String(m).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pickerContainer: {
    flexDirection: "row",
    height: 300,
    paddingVertical: 16,
  },
  pickerColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 100,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
  },
});


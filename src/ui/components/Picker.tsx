import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

interface PickerProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

export const Picker: React.FC<PickerProps> = ({
  label,
  value,
  onValueChange,
  min = 1,
  max = 60,
  suffix = "",
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const handleSelect = (selectedValue: number) => {
    onValueChange(selectedValue);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
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
        {label ? (
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
        ) : null}
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
            {value}{suffix}
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
                {label || "Select"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
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

            <ScrollView
              style={styles.pickerContainer}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option === value;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleSelect(option)}
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
                      {option}{suffix}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
    maxHeight: 400,
  },
  pickerContent: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
  },
});


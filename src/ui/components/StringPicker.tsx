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

interface StringPickerProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  getLabel?: (value: string) => string;
}

export const StringPicker: React.FC<StringPickerProps> = ({
  label,
  value,
  onValueChange,
  options,
  getLabel,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setModalVisible(false);
  };

  const displayValue = getLabel ? getLabel(value) : value;

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
            {displayValue}
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
                backgroundColor: theme.colors.bg,
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
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                {label}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const optionLabel = getLabel ? getLabel(option) : option;
                const isSelected = option === value;

                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleSelect(option)}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.surface2
                          : "transparent",
                        borderBottomColor: theme.colors.border,
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
                      {optionLabel}
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});


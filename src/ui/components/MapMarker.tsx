import React from "react";
import { View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";

export type MapMarkerVariant = "user" | "car" | "location" | "parking";

interface MapMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  variant?: MapMarkerVariant;
  title?: string;
  description?: string;
  draggable?: boolean;
  onDragEnd?: (e: any) => void;
  onPress?: () => void;
  anchor?: { x: number; y: number };
  tracksViewChanges?: boolean;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  coordinate,
  variant = "car",
  title,
  description,
  draggable,
  onDragEnd,
  onPress,
  anchor = { x: 0.5, y: 1 },
  tracksViewChanges = false,
}) => {
  const theme = useTheme();

  const getMarkerStyle = () => {
    switch (variant) {
      case "user":
        return {
          backgroundColor: "rgb(52, 199, 89)",
          borderColor: "rgb(18, 80, 33)",
          iconName: "person" as const,
          barColor: theme.colors.accent,
        };
      case "car":
        return {
          backgroundColor: theme.isDark ? "rgb(206, 206, 206)" : "rgb(75, 75, 75)",
          borderColor: theme.isDark ? "rgb(51, 51, 51)" : "rgb(14, 14, 14)",
          iconName: "car" as const,
          barColor: theme.isDark ? "rgb(206, 206, 206)" : "rgb(75, 75, 75)",
        };
      case "location":
        return {
          backgroundColor: theme.colors.accent,
          borderColor: "rgb(18, 80, 33)",
          iconName: "location" as const,
          barColor: theme.colors.accent,
        };
      case "parking":
        return {
          backgroundColor: "#007AFF",
          borderColor: "#0051D5",
          iconName: "pricetag" as const,
          barColor: "#007AFF",
        };
      default:
        return {
          backgroundColor: theme.colors.textSecondary,
          borderColor: "rgb(51, 51, 51)",
          iconName: "car" as const,
          barColor: theme.colors.textSecondary,
        };
    }
  };

  const markerStyle = getMarkerStyle();

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onPress={onPress}
      anchor={anchor}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.circle,
            {
              backgroundColor: markerStyle.backgroundColor,
              borderColor: markerStyle.borderColor,
            },
          ]}
        >
          <Ionicons
            name={markerStyle.iconName}
            size={16}
            color={theme.colors.surface}
          />
        </View>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: markerStyle.barColor,
            },
          ]}
        />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bar: {
    width: 1,
    height: 6,
  },
});


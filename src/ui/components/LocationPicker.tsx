import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { MapMarker } from "./MapMarker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";
import { getCurrentLocation } from "../../hooks/useLocation";
import { PrimaryButton } from "./Button";
import { lightMapStyle, darkMapStyle } from "../mapStyles";

interface LocationPickerProps {
  label: string;
  location: { latitude: number; longitude: number } | null;
  onLocationChange: (location: { latitude: number; longitude: number }) => void;
  loading?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  location,
  onLocationChange,
  loading = false,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [mapLocation, setMapLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(location);
  const [mapLoading, setMapLoading] = useState(false);
  const [miniMapRegion, setMiniMapRegion] = useState<Region | null>(null);
  const [modalMapRegion, setModalMapRegion] = useState<Region | null>(null);

  useEffect(() => {
    if (location) {
      setMiniMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [location, theme.isDark]);

  useEffect(() => {
    if (modalVisible && !mapLocation) {
      loadCurrentLocation();
    } else if (modalVisible && location) {
      setMapLocation(location);
      setModalMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [modalVisible]);

  const loadCurrentLocation = async () => {
    setMapLoading(true);
    try {
      const loc = await getCurrentLocation();
      setMapLocation(loc);
      setModalMapRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to get location");
    } finally {
      setMapLoading(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMapLocation({ latitude, longitude });
    setModalMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const handleConfirm = () => {
    if (mapLocation) {
      onLocationChange(mapLocation);
      setModalVisible(false);
    }
  };

  return (
    <>
      <View
        style={[
          styles.miniMapContainer,
          {
            backgroundColor: theme.colors.surface2,
            borderRadius: theme.radii.r16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: "hidden",
          },
        ]}
      >
        {loading ? (
          <View
            style={[
              styles.miniMapPlaceholder,
              {
                backgroundColor: theme.colors.surface2,
              },
            ]}
          >
            <Ionicons name="location" size={24} color={theme.colors.textTertiary} />
            <Text style={[textStyles.caption, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              Loading location...
            </Text>
          </View>
        ) : location ? (
          <MapView
            key={`mini-${theme.isDark ? "dark" : "light"}-${location.latitude}-${location.longitude}`}
            style={styles.miniMap}
            region={miniMapRegion || undefined}
            initialRegion={miniMapRegion || undefined}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            customMapStyle={Platform.OS === "android" ? (theme.isDark ? darkMapStyle : lightMapStyle) : undefined}
            userInterfaceStyle={Platform.OS === "ios" ? (theme.isDark ? "dark" : "light") : undefined}
          >
            <MapMarker
              coordinate={location}
              variant="car"
            />
          </MapView>
        ) : (
          <View
            style={[
              styles.miniMapPlaceholder,
              {
                backgroundColor: theme.colors.surface2,
              },
            ]}
          >
            <Ionicons name="location-outline" size={24} color={theme.colors.textTertiary} />
            <Text style={[textStyles.caption, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              No location selected
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[
            styles.editButton,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.r12,
              borderWidth: 1,
              borderColor: theme.colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
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
            <View style={styles.closeButton} />
          </View>

          <View style={styles.mapContainer}>
            {mapLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={[textStyles.body, { color: theme.colors.textSecondary }]}>
                  Loading location...
                </Text>
              </View>
            ) : mapLocation ? (
              <MapView
                key={`modal-${theme.isDark ? "dark" : "light"}-${mapLocation.latitude}-${mapLocation.longitude}`}
                style={StyleSheet.absoluteFillObject}
                region={modalMapRegion || undefined}
                initialRegion={modalMapRegion || undefined}
                onPress={handleMapPress}
                customMapStyle={Platform.OS === "android" ? (theme.isDark ? darkMapStyle : lightMapStyle) : undefined}
                userInterfaceStyle={Platform.OS === "ios" ? (theme.isDark ? "dark" : "light") : undefined}
              >
                <MapMarker
                  coordinate={mapLocation}
                  draggable
                  variant="car"
                  onDragEnd={(e) => {
                    const newLocation = {
                      latitude: e.nativeEvent.coordinate.latitude,
                      longitude: e.nativeEvent.coordinate.longitude,
                    };
                    setMapLocation(newLocation);
                    setModalMapRegion({
                      latitude: newLocation.latitude,
                      longitude: newLocation.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                  }}
                />
              </MapView>
            ) : null}
          </View>

          <View
            style={[
              styles.modalFooter,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={loadCurrentLocation}
              style={[
                styles.useCurrentButton,
                {
                  backgroundColor: theme.colors.surface2,
                  borderRadius: theme.radii.r16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name="locate" size={20} color={theme.colors.accent} />
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.accent,
                    marginLeft: theme.spacing.s8,
                    fontWeight: "600",
                  },
                ]}
              >
                Use Current Location
              </Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Confirm"
              onPress={handleConfirm}
              disabled={!mapLocation}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  miniMapContainer: {
    height: 160,
    position: "relative",
  },
  miniMap: {
    width: "100%",
    height: "100%",
  },
  miniMapPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    paddingTop: 50,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  useCurrentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});


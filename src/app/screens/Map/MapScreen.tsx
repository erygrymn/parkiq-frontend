import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { useTheme } from "@/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { apiGet } from "@/services/api";
import { getCurrentPosition } from "@/services/locationService";

interface VerifiedPrice {
  id: string;
  latitude: number;
  longitude: number;
  place_id: string;
}

export const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [prices, setPrices] = useState<VerifiedPrice[]>([]);
  const [isPremium] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      getCurrentPosition()
        .then(setUserLocation)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (userLocation) {
      apiGet<VerifiedPrice[]>(
        `/api/verified-prices?lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=1000`
      )
        .then(setPrices)
        .catch(() => {});
    }
  }, [userLocation]);

  if (!userLocation) {
    return (
      <ScreenContainer>
        <Text style={{ color: theme.colors.text }}>Loading map...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {isPremium && (
          <View style={[styles.filterBar, { backgroundColor: theme.colors.surface }]}>
            <Text style={{ color: theme.colors.text }}>{t("map.filters")}</Text>
          </View>
        )}
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
          />
          {prices.map((price) => (
            <Marker
              key={price.id}
              coordinate={{
                latitude: price.latitude,
                longitude: price.longitude,
              }}
            />
          ))}
        </MapView>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
});


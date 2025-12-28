import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import { MapMarker } from "../../ui/components/MapMarker";
import { useLocation } from "../../hooks/useLocation";
import { apiGet } from "../../services/api";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { GlassSurface } from "../../ui/components/GlassSurface";
import { PrimaryButton, SecondaryButton } from "../../ui/components/Button";
import { StringPicker } from "../../ui/components/StringPicker";
import { apiPost } from "../../services/api";
import { useSettingsStore } from "../../store/useSettingsStore";
import { BlurView } from "expo-blur";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";
import { TABBAR_TOTAL_HEIGHT } from "../../ui/theme/tokens";
import { lightMapStyle, darkMapStyle } from "../../ui/mapStyles";
import { useParkingStore } from "../../state/parkingStore";
import { useParkingTimer } from "../../hooks/useParkingTimer";
import { PreParkingScreen } from "../Parking/PreParkingScreen";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { Linking } from "react-native";
import * as Location from "expo-location";

interface VerifiedPrice {
  id: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  currency: string;
  price_json: any;
}

interface ParkingLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export const MapScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const [prices, setPrices] = useState<VerifiedPrice[]>([]);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<VerifiedPrice | null>(
    null
  );
  const [selectedParkingLocation, setSelectedParkingLocation] = useState<ParkingLocation | null>(null);
  const [showActiveSessionPanel, setShowActiveSessionPanel] = useState(false);
  const [activeSessionAddress, setActiveSessionAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [preParkingModalVisible, setPreParkingModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [sessionPhotoUri, setSessionPhotoUri] = useState<string | null>(null);
  const [addPriceModalVisible, setAddPriceModalVisible] = useState(false);
  
  const activeSession = useParkingStore((state) => state.activeSession);
  const endParking = useParkingStore((state) => state.endParking);
  const loadActiveSessionFromBackend = useParkingStore((state) => state.loadActiveSessionFromBackend);
  const reminderEnabled = useParkingStore((state) => state.reminderEnabled);
  const reminderOffsetMinutes = useParkingStore((state) => state.reminderOffsetMinutes);
  const timer = useParkingTimer();

  // Refs for optimization
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const lastFetchLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  
  // Cache duration: 10 seconds (reduced for faster updates)
  const CACHE_DURATION = 10 * 1000;
  // Debounce delay: 300ms (reduced for faster response)
  const DEBOUNCE_DELAY = 300;
  // Minimum distance to trigger new fetch: 50 meters (approx 0.0005 degrees)
  const MIN_DISTANCE_THRESHOLD = 0.0005;

  // Helper to generate cache key
  const getCacheKey = (lat: number, lng: number, type: string) => {
    // Round to 3 decimal places (~100m precision) for caching
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${type}-${roundedLat}-${roundedLng}`;
  };

  // Helper to check if location changed significantly
  const hasLocationChanged = (lat: number, lng: number): boolean => {
    if (!lastFetchLocationRef.current) return true;
    const { lat: lastLat, lng: lastLng } = lastFetchLocationRef.current;
    const latDiff = Math.abs(lat - lastLat);
    const lngDiff = Math.abs(lng - lastLng);
    return latDiff > MIN_DISTANCE_THRESHOLD || lngDiff > MIN_DISTANCE_THRESHOLD;
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Open in Apple Maps
  const openInAppleMaps = (lat: number, lng: number, name?: string) => {
    const url = `maps://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`;
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open Apple Maps", err);
      Alert.alert(t("common.error"), "Failed to open Apple Maps");
    });
  };

  // Handle parking marker press
  const handleParkingPress = (price: VerifiedPrice | null, location: ParkingLocation | null) => {
    setSelectedPrice(price);
    setSelectedParkingLocation(location);
  };

  const fetchPrices = useCallback(async (lat: number, lng: number, signal?: AbortSignal) => {
    const cacheKey = getCacheKey(lat, lng, "prices");
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();

    // Show cached data immediately if available (optimistic update)
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setPrices(cached.data);
    }

    try {
      const data = await apiGet<VerifiedPrice[]>(
        `/api/verified-prices?lat=${lat}&lng=${lng}&radius=2000`,
        signal
      );
      
      // Check if request was aborted
      if (signal?.aborted) return;
      
      const pricesData = data || [];
      setPrices(pricesData);
      cacheRef.current.set(cacheKey, { data: pricesData, timestamp: now });
    } catch (error) {
      if (signal?.aborted) return;
      // Only show error if we don't have cached data
      if (!cached || now - cached.timestamp >= CACHE_DURATION) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch prices";
        setError(errorMessage);
        console.error("Failed to fetch prices", error);
      }
    }
  }, []);

  const fetchParkingLocations = useCallback(async (lat: number, lng: number, signal?: AbortSignal) => {
    const cacheKey = getCacheKey(lat, lng, "locations");
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();

    // Check cache (but still allow fetch if signal is not aborted)
    if (cached && now - cached.timestamp < CACHE_DURATION && !signal?.aborted) {
      setParkingLocations(cached.data);
      // Still fetch in background to update cache, but don't block
    }

    try {
      const data = await apiGet<ParkingLocation[]>(
        `/api/parking-locations?lat=${lat}&lng=${lng}&radius=2000`,
        signal
      );
      
      // Check if request was aborted
      if (signal?.aborted) return;
      
      const locationsData = data || [];
      setParkingLocations(locationsData);
      cacheRef.current.set(cacheKey, { data: locationsData, timestamp: now });
    } catch (error) {
      if (signal?.aborted) return;
      // Only log error if we don't have cached data
      if (!cached || now - cached.timestamp >= CACHE_DURATION) {
        console.error("Failed to fetch parking locations", error);
      }
    }
  }, []);

  // Optimized fetch function with debouncing and parallel requests
  const fetchMapData = useCallback((lat: number, lng: number, immediate = false) => {
    // Check if location changed significantly (skip if immediate)
    if (!immediate && !hasLocationChanged(lat, lng)) {
      return;
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Cancel previous request only if we're starting a new one
    if (abortControllerRef.current && !immediate) {
      abortControllerRef.current.abort();
    }

    const performFetch = async () => {
      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const signal = abortController.signal;

      setLoading(true);
      setError(null);

      try {
        // Fetch both in parallel
        await Promise.all([
          fetchPrices(lat, lng, signal),
          fetchParkingLocations(lat, lng, signal),
        ]);

        // Check if request was aborted after fetch
        if (signal.aborted) return;

        // Update last fetch location
        lastFetchLocationRef.current = { lat, lng };
      } catch (error) {
        if (!signal.aborted) {
          console.error("Error fetching map data", error);
          setError(error instanceof Error ? error.message : "Failed to fetch parking data");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (immediate) {
      // Execute immediately (for initial load)
      performFetch();
    } else {
      // Debounce the fetch
      debounceTimerRef.current = setTimeout(performFetch, DEBOUNCE_DELAY);
    }
  }, [fetchPrices, fetchParkingLocations]);

  useEffect(() => {
    loadActiveSessionFromBackend();
  }, [loadActiveSessionFromBackend]);

  // Fetch address for active session
  const fetchActiveSessionAddress = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: activeSession.latitude,
        longitude: activeSession.longitude,
      });
      
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const parts: string[] = [];
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (parts.length === 0 && address.name) parts.push(address.name);
        if (parts.length === 0 && address.district) parts.push(address.district);
        if (parts.length === 0 && address.region) parts.push(address.region);
        
        setActiveSessionAddress(parts.length > 0 ? parts.join(", ") : activeSession.locationName || "Unknown Location");
      } else {
        setActiveSessionAddress(activeSession.locationName || "Unknown Location");
      }
    } catch (error) {
      console.error("Failed to reverse geocode active session:", error);
      setActiveSessionAddress(activeSession.locationName || "Unknown Location");
    }
  }, [activeSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load photo URI from storage when active session loads
  useEffect(() => {
    const loadPhotoUri = async () => {
      if (activeSession?.hasPhoto && activeSession.id) {
        try {
          const storedPhotoUri = await SecureStore.getItemAsync(`parking_photo_${activeSession.id}`);
          if (storedPhotoUri) {
            setSessionPhotoUri(storedPhotoUri);
          } else {
            setSessionPhotoUri(null);
          }
        } catch (error) {
          console.error("Failed to load photo URI", error);
          setSessionPhotoUri(null);
        }
      } else {
        setSessionPhotoUri(null);
      }
    };
    loadPhotoUri();
  }, [activeSession?.id, activeSession?.hasPhoto]);

  // Save photo URI to storage when it changes
  useEffect(() => {
    const savePhotoUri = async () => {
      if (sessionPhotoUri && activeSession?.id) {
        try {
          await SecureStore.setItemAsync(`parking_photo_${activeSession.id}`, sessionPhotoUri);
        } catch (error) {
          console.error("Failed to save photo URI", error);
        }
      }
    };
    savePhotoUri();
  }, [sessionPhotoUri, activeSession?.id]);

  // Clear photo URI and storage when session ends
  useEffect(() => {
    const clearPhotoData = async () => {
      if (!activeSession) {
        // Clear current photo URI
        setSessionPhotoUri(null);
        // Try to clear any stored photo (we don't know the session ID, so we'll clear on next session load)
      }
    };
    clearPhotoData();
  }, [activeSession]);

  useEffect(() => {
    if (location) {
      if (!activeSession) {
        // Immediate fetch for initial location
        fetchMapData(location.latitude, location.longitude, true);
      }
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [location, activeSession, fetchMapData]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    if (!activeSession) {
      fetchMapData(region.latitude, region.longitude);
    }
  }, [activeSession, fetchMapData]);

  const handleEndParking = async () => {
    try {
      const endedSession = await endParking();
      const nav = navigation as any;
      nav.navigate("Map", {
        screen: "ParkingSummary",
        params: {
          session: endedSession,
          reminderEnabled,
          reminderOffsetMinutes,
        },
      });
    } catch (error) {
      Alert.alert(t("common.error"), error instanceof Error ? error.message : "Failed to end parking");
    }
  };

  if (!location) {
    return (
      <Screen variant="default" edges={["left", "right"]}>
        <AppHeader title={t("map.title")} variant="root" />
        <View style={[styles.fullScreen, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={[textStyles.body, { color: theme.colors.textPrimary, textAlign: "center" }]}>
            {t("map.noLocation")}
          </Text>
        </View>
      </Screen>
    );
  }

  const bottomSheetBottom = insets.bottom + theme.spacing.s8 + TABBAR_TOTAL_HEIGHT + theme.spacing.s12;

  return (
    <Screen variant="fullBleed" style={styles.fullScreen}>
      <AppHeader title={t("map.title")} variant="root" />
      <View style={styles.mapContainer}>
        <MapView
          key={`map-${theme.isDark ? "dark" : "light"}-${location.latitude}-${location.longitude}`}
          style={StyleSheet.absoluteFillObject}
          region={mapRegion || undefined}
          initialRegion={mapRegion || undefined}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={Platform.OS === "android" ? (theme.isDark ? darkMapStyle : lightMapStyle) : undefined}
          userInterfaceStyle={Platform.OS === "ios" ? (theme.isDark ? "dark" : "light") : undefined}
        >
          <MapMarker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Your Location"
            variant="user"
          />
          {activeSession && (
            <MapMarker
              coordinate={{
                latitude: activeSession.latitude,
                longitude: activeSession.longitude,
              }}
              variant="car"
              onPress={() => {
                setShowActiveSessionPanel(true);
                // Fetch address for active session
                fetchActiveSessionAddress();
              }}
            />
          )}
          {/* Verified prices with pricing info */}
          {prices.map((price) => {
            // Get the first price from price_json to display
            const priceEntries = price.price_json ? Object.entries(price.price_json) : [];
            const firstPrice = priceEntries.length > 0 ? priceEntries[0][1] : null;
            const priceText = firstPrice ? `${price.currency} ${firstPrice}` : price.currency;

            return (
              <MapMarker
                key={`price-${price.id}`}
                coordinate={{
                  latitude: price.latitude,
                  longitude: price.longitude,
                }}
                variant="parking"
                onPress={() => handleParkingPress(price, null)}
              />
            );
          })}
          
          {/* Parking locations from Apple Maps/OpenStreetMap */}
          {parkingLocations.map((location) => {
            // Skip if this location is already in verified prices
            const isInPrices = prices.some(p => 
              Math.abs(p.latitude - location.latitude) < 0.0001 && 
              Math.abs(p.longitude - location.longitude) < 0.0001
            );
            if (isInPrices) return null;

            return (
              <MapMarker
                key={`location-${location.id}`}
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                variant="parking"
                onPress={() => handleParkingPress(null, location)}
              />
            );
          })}
        </MapView>
      </View>

      {/* Active Session Panel */}
      {showActiveSessionPanel && activeSession && (
        <View
          style={[
            styles.parkingDetailsPanel,
            {
              bottom: bottomSheetBottom + 120,
            },
          ]}
        >
          <GlassSurface radius={theme.radii.r20} bevel>
            <View style={{ padding: theme.spacing.s16 }}>
              {/* Close button */}
              <TouchableOpacity
                onPress={() => setShowActiveSessionPanel(false)}
                style={{
                  position: "absolute",
                  top: theme.spacing.s12,
                  right: theme.spacing.s12,
                  zIndex: 1,
                }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Title */}
              <Text
                style={[
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing.s8,
                    paddingRight: theme.spacing.s32,
                  },
                ]}
              >
                {t("parking.activeParking")}
              </Text>

              {/* Address */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: theme.spacing.s12,
                }}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={theme.colors.accent}
                  style={{ marginRight: theme.spacing.s4 }}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      flex: 1,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {activeSessionAddress || activeSession.locationName || t("common.loading")}
                </Text>
              </View>

              {/* Distance */}
              {location && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: theme.spacing.s12,
                  }}
                >
                  <Ionicons
                    name="navigate"
                    size={16}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: theme.spacing.s4 }}
                  />
                  <Text
                    style={[
                      textStyles.sub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("map.distance")}:{" "}
                    {formatDistance(
                      calculateDistance(
                        location.latitude,
                        location.longitude,
                        activeSession.latitude,
                        activeSession.longitude
                      )
                    )}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={{ gap: theme.spacing.s8 }}>
                <PrimaryButton
                  title={t("map.openInMaps")}
                  onPress={() => {
                    openInAppleMaps(
                      activeSession.latitude,
                      activeSession.longitude,
                      activeSessionAddress || activeSession.locationName || undefined
                    );
                  }}
                />
              </View>
            </View>
          </GlassSurface>
        </View>
      )}

      {/* Parking Details Panel */}
      {(selectedPrice || selectedParkingLocation) && (
        <View
            style={[
            styles.parkingDetailsPanel,
            {
              bottom: activeSession
                ? bottomSheetBottom + 120
                : bottomSheetBottom + 70,
            },
          ]}
        >
          <GlassSurface radius={theme.radii.r20} bevel>
            <View style={{ padding: theme.spacing.s16 }}>
              {/* Close button */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedPrice(null);
                  setSelectedParkingLocation(null);
                }}
                style={{
                  position: "absolute",
                  top: theme.spacing.s12,
                  right: theme.spacing.s12,
                  zIndex: 1,
                }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Parking name */}
              <Text
                style={[
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing.s8,
                    paddingRight: theme.spacing.s32,
                  },
                ]}
                numberOfLines={2}
              >
                {selectedPrice?.place_id ||
                  selectedParkingLocation?.name ||
                  "Parking Spot"}
              </Text>

              {/* Distance */}
              {location && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: theme.spacing.s12,
                  }}
                >
                  <Ionicons
                    name="location"
                    size={16}
                    color={theme.colors.accent}
                    style={{ marginRight: theme.spacing.s4 }}
                  />
                  <Text
                    style={[
                      textStyles.sub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("map.distance")}:{" "}
                    {formatDistance(
                      calculateDistance(
                        location.latitude,
                        location.longitude,
                        selectedPrice?.latitude ||
                          selectedParkingLocation?.latitude ||
                          0,
                        selectedPrice?.longitude ||
                          selectedParkingLocation?.longitude ||
                          0
                      )
                    )}
                  </Text>
                </View>
              )}

              {/* Price information */}
              {selectedPrice?.price_json ? (
                <View
                  style={{
                    marginBottom: theme.spacing.s12,
                    padding: theme.spacing.s12,
                    backgroundColor: theme.colors.surface2,
                    borderRadius: theme.radii.r12,
                  }}
                >
                  <Text
                    style={[
                      textStyles.sub,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.s8,
                      },
                    ]}
                  >
                    {t("map.priceInfo")}
                  </Text>
                  {Object.entries(selectedPrice.price_json).map(
                    ([duration, price]) => (
                      <Text
                        key={duration}
                        style={[
                          textStyles.body,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {`${duration} ${t("parking.minutes")}: ${price} ${selectedPrice.currency}`}
                      </Text>
                    )
                  )}
                  <View
                    style={{
                      marginTop: theme.spacing.s8,
                      paddingTop: theme.spacing.s8,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                      flexDirection: "row",
                      alignItems: "flex-start",
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={theme.colors.textTertiary}
                      style={{ marginRight: theme.spacing.s4, marginTop: 2 }}
                    />
                    <Text
                      style={[
                        textStyles.caption,
                        {
                          color: theme.colors.textTertiary,
                          fontSize: 11,
                          flex: 1,
                        },
                      ]}
                    >
                      {t("map.priceDisclaimer")}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    marginBottom: theme.spacing.s12,
                    padding: theme.spacing.s12,
                    backgroundColor: theme.colors.surface2,
                    borderRadius: theme.radii.r12,
                  }}
                >
                  <Text
                    style={[
                      textStyles.body,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.s8,
                      },
                    ]}
                  >
                    {t("map.noPriceInfo")}
                  </Text>
                  <SecondaryButton
                    title={t("map.addPriceInfo")}
                    onPress={() => setAddPriceModalVisible(true)}
                  />
                </View>
              )}

              {/* Action buttons */}
              <View style={{ gap: theme.spacing.s8 }}>
                <PrimaryButton
                  title={t("map.openInMaps")}
                  onPress={() => {
                    const lat =
                      selectedPrice?.latitude ||
                      selectedParkingLocation?.latitude ||
                      0;
                    const lng =
                      selectedPrice?.longitude ||
                      selectedParkingLocation?.longitude ||
                      0;
                    openInAppleMaps(
                      lat,
                      lng,
                      selectedPrice?.place_id ||
                        selectedParkingLocation?.name
                    );
                  }}
                />
              </View>
            </View>
          </GlassSurface>
        </View>
      )}

      {activeSession ? (
        <View style={[styles.bottomSheet, { bottom: bottomSheetBottom }]}>
          <GlassSurface radius={theme.radii.r20} bevel>
            <View style={{ padding: theme.spacing.s16, alignItems: "center" }}>
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
                    marginBottom: theme.spacing.s12,
                  },
                ]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {timer.hours}:{timer.minutes}:{timer.seconds}
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
              {(activeSession.note || activeSession.hasPhoto) && (
                <View
                  style={[
                    {
                      width: "100%",
                      marginBottom: theme.spacing.s12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.s12,
                    },
                  ]}
                >
                  {activeSession.hasPhoto && (
                    <TouchableOpacity
                      onPress={() => setPhotoModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          {
                            width: 60,
                            height: 60,
                            borderRadius: theme.radii.r12,
                            overflow: "hidden",
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.surface2,
                          },
                        ]}
                      >
                        {sessionPhotoUri ? (
                          <Image
                            source={{ uri: sessionPhotoUri }}
                            style={{
                              width: "100%",
                              height: "100%",
                              resizeMode: "cover",
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: "100%",
                              height: "100%",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name="image-outline"
                              size={24}
                              color={theme.colors.textSecondary}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  {activeSession.note && (
                    <View
                      style={[
                        {
                          flex: 1,
                          padding: theme.spacing.s12,
                          backgroundColor: theme.colors.surface2,
                          borderRadius: theme.radii.r12,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          textStyles.sub,
                          {
                            color: theme.colors.textSecondary,
                            marginBottom: theme.spacing.s4,
                          },
                        ]}
                      >
                        Note
                      </Text>
                      <Text
                        style={[
                          textStyles.body,
                          {
                            color: theme.colors.textPrimary,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {activeSession.note}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={{ width: "100%", marginTop: theme.spacing.s12 }}>
                <SecondaryButton
                  title={t("parking.endParking")}
                  onPress={handleEndParking}
                />
              </View>
            </View>
          </GlassSurface>
        </View>
      ) : (
        <View style={[styles.startParkingButtonContainer, { bottom: bottomSheetBottom }]}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={45}
              tint={theme.isDark ? "dark" : "light"}
              style={[
                styles.startParkingButtonBlur,
                {
                  borderRadius: theme.radii.r16,
                  borderWidth: 1,
                  borderColor: theme.colors.borderStrong,
                  overflow: "hidden",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOpacity: theme.isDark ? 0.40 : 0.14,
                      shadowRadius: theme.isDark ? 28 : 24,
                      shadowOffset: { width: 0, height: theme.isDark ? 16 : 14 },
                    },
                  }),
                },
              ]}
            >
              <View
                style={{
                  backgroundColor: theme.isDark
                    ? "rgba(48,209,88,0.75)"
                    : "rgba(52,199,89,0.80)",
                }}
              >
                <PrimaryButton
                  title={t("map.startParking")}
                  onPress={() => setPreParkingModalVisible(true)}
                  style={{ backgroundColor: "transparent" }}
                />
              </View>
            </BlurView>
          ) : (
            <View
              style={[
                styles.startParkingButtonBlur,
                {
                  backgroundColor: theme.isDark
                    ? "rgba(48,209,88,0.75)"
                    : "rgba(52,199,89,0.80)",
                  borderRadius: theme.radii.r16,
                  borderWidth: 1,
                  borderColor: theme.colors.borderStrong,
                  overflow: "hidden",
                  ...Platform.select({
                    android: {
                      elevation: theme.isDark ? 8 : 6,
                    },
                  }),
                },
              ]}
            >
              <PrimaryButton
                title={t("map.startParking")}
                onPress={() => setPreParkingModalVisible(true)}
                style={{ backgroundColor: "transparent" }}
              />
            </View>
          )}
        </View>
      )}

      <Modal
        visible={preParkingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreParkingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.bg }]}>
            <PreParkingScreen
              onClose={() => setPreParkingModalVisible(false)}
              onPhotoTaken={async (uri) => {
                setSessionPhotoUri(uri);
                // Save photo URI to storage immediately
                if (activeSession?.id) {
                  try {
                    await SecureStore.setItemAsync(`parking_photo_${activeSession.id}`, uri);
                  } catch (error) {
                    console.error("Failed to save photo URI", error);
                  }
                }
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedPrice !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPrice(null)}
      >
        <View style={styles.modalOverlay}>
          <GlassSurface
            radius={theme.radii.r20}
            style={{ margin: theme.spacing.s16, maxHeight: "80%" }}
          >
            <View style={{ padding: theme.spacing.s24 }}>
              {selectedPrice && (
                <>
                  <Text
                    style={[
                      textStyles.title,
                      {
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing.s16,
                      },
                    ]}
                  >
                    Price Details
                  </Text>
                  <Text
                    style={[
                      textStyles.body,
                      {
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing.s24,
                      },
                    ]}
                  >
                    {JSON.stringify(selectedPrice.price_json, null, 2)}
                  </Text>
                  <PrimaryButton
                    title={t("common.cancel")}
                    onPress={() => setSelectedPrice(null)}
                  />
                </>
              )}
            </View>
          </GlassSurface>
        </View>
      </Modal>

      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setPhotoModalVisible(false)}
            activeOpacity={1}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: theme.spacing.s20,
              }}
            >
              {activeSession?.hasPhoto && (
                <View
                  style={[
                    {
                      width: "100%",
                      height: "80%",
                      borderRadius: theme.radii.r20,
                      overflow: "hidden",
                      backgroundColor: theme.colors.surface2,
                    },
                  ]}
                >
                  {sessionPhotoUri ? (
                    <Image
                      source={{ uri: sessionPhotoUri }}
                      style={{
                        width: "100%",
                        height: "100%",
                        resizeMode: "contain",
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="image-outline"
                        size={64}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          textStyles.body,
                          {
                            color: theme.colors.textSecondary,
                            marginTop: theme.spacing.s12,
                          },
                        ]}
                      >
                        Photo preview coming soon
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              {
                position: "absolute",
                top: insets.top + 16,
                right: 16,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(0,0,0,0.5)",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
            onPress={() => setPhotoModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add Price Modal */}
      <Modal
        visible={addPriceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPriceModalVisible(false)}
      >
        <AddPriceModal
          visible={addPriceModalVisible}
          onClose={() => setAddPriceModalVisible(false)}
          parkingLocation={{
            latitude: selectedPrice?.latitude || selectedParkingLocation?.latitude || 0,
            longitude: selectedPrice?.longitude || selectedParkingLocation?.longitude || 0,
            placeId: selectedPrice?.place_id || selectedParkingLocation?.id || null,
            name: selectedPrice?.place_id || selectedParkingLocation?.name || "Parking Spot",
          }}
          onSuccess={() => {
            setAddPriceModalVisible(false);
            // Refresh prices
            if (location) {
              fetchMapData(location.latitude, location.longitude, true);
            }
          }}
        />
      </Modal>
    </Screen>
  );
};

// Add Price Modal Component
interface AddPriceModalProps {
  visible: boolean;
  onClose: () => void;
  parkingLocation: {
    latitude: number;
    longitude: number;
    placeId: string | null;
    name: string;
  };
  onSuccess: () => void;
}

interface PriceTier {
  duration: string;
  price: string;
}

const AddPriceModal: React.FC<AddPriceModalProps> = ({
  visible,
  onClose,
  parkingLocation,
  onSuccess,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const currency = useSettingsStore((state) => state.currency);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    { duration: "1", price: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [availableCurrencies] = useState(["TRY", "USD", "EUR", "GBP"]);

  const handleAddTier = () => {
    setPriceTiers([...priceTiers, { duration: "", price: "" }]);
  };

  const handleRemoveTier = (index: number) => {
    if (priceTiers.length > 1) {
      setPriceTiers(priceTiers.filter((_, i) => i !== index));
    }
  };

  const handleTierChange = (index: number, field: "duration" | "price", value: string) => {
    const newTiers = [...priceTiers];
    newTiers[index][field] = value;
    setPriceTiers(newTiers);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedCurrency) {
      Alert.alert(t("common.error"), t("map.currencyRequired"));
      return;
    }

    const validTiers = priceTiers.filter(
      (tier) => tier.duration && tier.price && !isNaN(Number(tier.price))
    );

    if (validTiers.length === 0) {
      Alert.alert(t("common.error"), t("map.tierRequired"));
      return;
    }

    // Build price_json object
    const priceJson: Record<string, number> = {};
    validTiers.forEach((tier) => {
      priceJson[tier.duration] = Number(tier.price);
    });

    setLoading(true);
    try {
      await apiPost("/api/price-submissions", {
        latitude: parkingLocation.latitude,
        longitude: parkingLocation.longitude,
        placeId: parkingLocation.placeId,
        currency: selectedCurrency,
        priceJson,
      });

      Alert.alert(t("common.info"), t("map.priceSubmitted"), [
        {
          text: t("common.ok"),
          onPress: () => {
            onSuccess();
            // Reset form
            setPriceTiers([{ duration: "1", price: "" }]);
            setSelectedCurrency(currency);
          },
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("map.priceSubmitError");
      
      // Handle "User not found" error specifically
      if (errorMessage.includes("User not found") || errorMessage.includes("user not found")) {
        Alert.alert(
          t("common.error"),
          t("map.userNotFoundError"),
          [
            {
              text: t("common.ok"),
              onPress: () => {
                // Optionally sign out the user
              },
            },
          ]
        );
      } else {
        Alert.alert(t("common.error"), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.colors.bg,
            paddingBottom: insets.bottom + theme.spacing.s16,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.s16,
            paddingTop: insets.top + theme.spacing.s16,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: theme.spacing.s24,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing.s4,
                  },
                ]}
              >
                {t("map.addPriceTitle")}
              </Text>
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {parkingLocation.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Currency Selection */}
          <View style={{ marginBottom: theme.spacing.s24 }}>
            <Text
              style={[
                textStyles.sub,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s8,
                },
              ]}
            >
              {t("map.currency")}
            </Text>
            <StringPicker
              label=""
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
              options={availableCurrencies}
            />
          </View>

          {/* Price Tiers */}
          <View style={{ marginBottom: theme.spacing.s24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: theme.spacing.s12,
              }}
            >
              <Text
                style={[
                  textStyles.sub,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                {t("map.priceTiers")}
              </Text>
              <TouchableOpacity
                onPress={handleAddTier}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: theme.spacing.s8,
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={theme.colors.accent}
                  style={{ marginRight: theme.spacing.s4 }}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.accent,
                    },
                  ]}
                >
                  {t("map.addTier")}
                </Text>
              </TouchableOpacity>
            </View>

            {priceTiers.map((tier, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  gap: theme.spacing.s8,
                  marginBottom: theme.spacing.s12,
                  alignItems: "flex-end",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      textStyles.caption,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {t("map.tierDuration")}
                  </Text>
                  <TextInput
                    style={[
                      {
                        backgroundColor: theme.colors.surface2,
                        borderRadius: theme.radii.r12,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingHorizontal: theme.spacing.s16,
                        paddingVertical: theme.spacing.s12,
                        color: theme.colors.textPrimary,
                        fontSize: 16,
                      },
                    ]}
                    value={tier.duration}
                    onChangeText={(value) =>
                      handleTierChange(index, "duration", value)
                    }
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      textStyles.caption,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {t("map.tierPrice")}
                  </Text>
                  <TextInput
                    style={[
                      {
                        backgroundColor: theme.colors.surface2,
                        borderRadius: theme.radii.r12,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingHorizontal: theme.spacing.s16,
                        paddingVertical: theme.spacing.s12,
                        color: theme.colors.textPrimary,
                        fontSize: 16,
                      },
                    ]}
                    value={tier.price}
                    onChangeText={(value) =>
                      handleTierChange(index, "price", value)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                {priceTiers.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveTier(index)}
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: theme.spacing.s4,
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.colors.danger || "#FF3B30"}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Submit Button */}
          <PrimaryButton
            title={t("map.submitPrice")}
            onPress={handleSubmit}
            loading={loading}
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    maxHeight: 300,
  },
  startParkingButtonContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 5, // For Android
  },
  startParkingButtonBlur: {
    overflow: "hidden",
  },
  parkingDetailsPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    maxHeight: 400,
    zIndex: 1000,
    elevation: 10, // For Android
  },
  priceItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
});

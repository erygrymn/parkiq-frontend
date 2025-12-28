import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Platform } from "react-native";
import MapView, { Region } from "react-native-maps";
import { MapMarker } from "../../ui/components/MapMarker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { DestructiveButton } from "../../ui/components/Button";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t, getLocale } from "../../localization";
import { formatDuration, formatDate } from "../../utils/date";
import { apiDelete, apiGet } from "../../services/api";
import { lightMapStyle, darkMapStyle } from "../../ui/mapStyles";

interface ParkSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  latitude: number;
  longitude: number;
  location_name?: string | null;
  note?: string | null;
  adjusted_started_at?: string | null;
}

interface VerifiedPrice {
  id: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  currency: string;
  price_json: any;
}

interface RouteParams {
  session: ParkSession;
}

export const HistoryDetailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = (route.params || {}) as RouteParams;
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [priceInfo, setPriceInfo] = useState<VerifiedPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  const startDate = new Date(session.started_at);
  const endDate = session.ended_at ? new Date(session.ended_at) : null;
  const adjustedStartDate = session.adjusted_started_at ? new Date(session.adjusted_started_at) : null;

  // Format date for display (e.g., "January 15, 2024")
  const formatFullDate = (date: Date): string => {
    const locale = getLocale() === "tr" ? "tr-TR" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const mapRegion: Region = {
    latitude: session.latitude,
    longitude: session.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  // Fetch price information for this location
  useEffect(() => {
    const fetchPriceInfo = async () => {
      // Mock price info for mock session
      if (session.id === "mock-session-001") {
        const mockPriceInfo: VerifiedPrice = {
          id: "mock-price-001",
          latitude: session.latitude,
          longitude: session.longitude,
          place_id: "ChIJKxJ3V3J2yhQRl8V5V5V5V5V",
          currency: "TRY",
          price_json: {
            "0-1h": 25.00,
            "1-2h": 20.00,
            "2-4h": 18.00,
            "4-8h": 15.00,
            "8-24h": 12.00,
          },
        };
        setPriceInfo(mockPriceInfo);
        setPriceLoading(false);

        // Calculate cost for mock session
        if (session.ended_at) {
          const startTime = session.adjusted_started_at
            ? new Date(session.adjusted_started_at).getTime()
            : new Date(session.started_at).getTime();
          const endTime = new Date(session.ended_at).getTime();
          const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));
          const cost = calculateParkingCost(mockPriceInfo.price_json, durationMinutes);
          setCalculatedCost(cost);
        }
        return;
      }

      try {
        const prices = await apiGet<VerifiedPrice[]>(
          `/api/verified-prices?lat=${session.latitude}&lng=${session.longitude}&radius=100`
        );
        if (prices && prices.length > 0) {
          // Find the closest price (or use the first one)
          const closestPrice = prices[0];
          setPriceInfo(closestPrice);

          // Calculate cost if session has ended
          if (session.ended_at) {
            const startTime = session.adjusted_started_at
              ? new Date(session.adjusted_started_at).getTime()
              : new Date(session.started_at).getTime();
            const endTime = new Date(session.ended_at).getTime();
            const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));
            const cost = calculateParkingCost(closestPrice.price_json, durationMinutes);
            setCalculatedCost(cost);
          }
        }
      } catch (error) {
        console.error("Failed to fetch price info", error);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPriceInfo();
  }, [session]);

  // Calculate parking cost based on price_json and duration
  const calculateParkingCost = (priceJson: any, durationMinutes: number): number => {
    if (!priceJson || typeof priceJson !== "object") return 0;

    const durationHours = durationMinutes / 60;
    let totalCost = 0;

    // Sort intervals by start time
    const intervals = Object.entries(priceJson)
      .map(([key, value]) => {
        // Parse interval like "0-1h" or "1-2h"
        const match = key.match(/(\d+)-(\d+)h?/);
        if (match) {
          const start = parseFloat(match[1]);
          const end = parseFloat(match[2]);
          return { start, end, price: value as number };
        }
        return null;
      })
      .filter((interval): interval is { start: number; end: number; price: number } => interval !== null)
      .sort((a, b) => a.start - b.start);

    if (intervals.length === 0) return 0;

    // Calculate cost for each interval
    for (const interval of intervals) {
      if (durationHours <= interval.start) break;
      
      const intervalStart = Math.max(interval.start, 0);
      const intervalEnd = Math.min(interval.end, durationHours);
      const hoursInInterval = intervalEnd - intervalStart;
      
      if (hoursInInterval > 0) {
        totalCost += interval.price * hoursInInterval;
      }
    }

    return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
  };

  const handleDelete = () => {
    Alert.alert(
      t("history.deleteSession") || "Delete Session",
      t("history.deleteConfirm") || "Are you sure you want to delete this parking session? This action cannot be undone.",
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("history.delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            Alert.alert(
              t("common.error") || "Error",
              "Delete functionality is not available yet."
            );
          },
        },
      ]
    );
  };

  return (
    <>
      <AppHeader title={t("history.details")} variant="stack" />
      <Screen variant="default" withTabBarInset={false} scroll>
        <View style={styles.content}>
          {/* Date Card */}
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <View style={[styles.dateRow, { paddingVertical: theme.spacing.s4 }]}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={{ marginRight: theme.spacing.s8 }}
              />
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textPrimary,
                    fontWeight: "600",
                  },
                ]}
              >
                {formatFullDate(startDate)}
              </Text>
            </View>
          </Card>

          {/* Time Summary Card - Tappable */}
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <TouchableOpacity
              style={styles.timeSummaryRow}
              onPress={() => setTimeModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    textStyles.section,
                    {
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing.s4,
                    },
                  ]}
                >
                  {t("history.timeDetails")}
                </Text>
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {formatDuration(
                    session.adjusted_started_at || session.started_at,
                    session.ended_at
                  )}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </Card>

          {/* Location Card with Mini Map */}
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s12,
                },
              ]}
            >
              {t("parking.location")}
            </Text>
            <View
              style={[
                styles.miniMapContainer,
                {
                  borderRadius: theme.radii.r16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  marginTop: theme.spacing.s8,
                },
              ]}
            >
              <MapView
                key={`mini-${theme.isDark ? "dark" : "light"}-${session.latitude}-${session.longitude}`}
                style={styles.miniMap}
                region={mapRegion}
                initialRegion={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                customMapStyle={Platform.OS === "android" ? (theme.isDark ? darkMapStyle : lightMapStyle) : undefined}
                userInterfaceStyle={Platform.OS === "ios" ? (theme.isDark ? "dark" : "light") : undefined}
              >
                <MapMarker
                  coordinate={{
                    latitude: session.latitude,
                    longitude: session.longitude,
                  }}
                  variant="car"
                />
              </MapView>
              {session.location_name && (
                <View
                  style={[
                    styles.locationNameOverlay,
                    {
                      backgroundColor: theme.isDark
                        ? "rgba(18,19,21,0.85)"
                        : "rgba(255,255,255,0.90)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      textStyles.sub,
                      {
                        color: theme.colors.textPrimary,
                        fontWeight: "600",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {session.location_name}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Price Information Card */}
          {calculatedCost !== null && session.ended_at && priceInfo && (
            <Card style={{ marginBottom: theme.spacing.s16 }}>
              <Text
                style={[
                  textStyles.section,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.s12,
                  },
                ]}
              >
                {t("history.parkingCost")}
              </Text>
              <View style={styles.totalCostRow}>
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {t("history.total")}
                </Text>
                <Text
                  style={[
                    textStyles.title,
                    {
                      color: theme.colors.accent,
                    },
                  ]}
                >
                  {priceInfo.currency} {calculatedCost.toFixed(2)}
                </Text>
              </View>
            </Card>
          )}

          {/* Remove Button */}
          <DestructiveButton
            title={t("history.delete") || "Delete Session"}
            onPress={handleDelete}
            disabled={deleting}
          />
        </View>
      </Screen>

      {/* Time Details Modal */}
      <Modal
        visible={timeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModalVisible(false)}
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
                Time Details
              </Text>
              <TouchableOpacity
                onPress={() => setTimeModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.timeRow}>
                <Text
                  style={[
                    textStyles.section,
                    {
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing.s4,
                    },
                  ]}
                >
                  {t("history.startTime")}
                </Text>
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {formatDate(session.started_at, getLocale() === "tr" ? "tr-TR" : "en-US")}
                </Text>
              </View>

              {adjustedStartDate && (
                <View style={[styles.timeRow, { marginTop: theme.spacing.s16 }]}>
                  <Text
                    style={[
                      textStyles.section,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {t("parking.adjustedStartTime")}
                  </Text>
                  <Text
                    style={[
                      textStyles.body,
                      {
                        color: theme.colors.textPrimary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {formatDate(session.adjusted_started_at!, getLocale() === "tr" ? "tr-TR" : "en-US")}
                  </Text>
                </View>
              )}

              {endDate && (
                <View style={[styles.timeRow, { marginTop: theme.spacing.s16 }]}>
                  <Text
                    style={[
                      textStyles.section,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {t("history.endTime")}
                  </Text>
                  <Text
                    style={[
                      textStyles.body,
                      {
                        color: theme.colors.textPrimary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {formatDate(session.ended_at!, getLocale() === "tr" ? "tr-TR" : "en-US")}
                  </Text>
                </View>
              )}

              <View style={[styles.timeRow, { marginTop: theme.spacing.s16 }]}>
                <Text
                  style={[
                    textStyles.section,
                    {
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing.s4,
                    },
                  ]}
                >
                  {t("history.duration")}
                </Text>
                <Text
                  style={[
                    textStyles.title,
                    {
                      color: theme.colors.accent,
                    },
                  ]}
                >
                  {formatDuration(
                    session.adjusted_started_at || session.started_at,
                    session.ended_at
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniMapContainer: {
    height: 200,
  },
  miniMap: {
    flex: 1,
  },
  locationNameOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "80%",
    paddingBottom: 32,
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
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timeRow: {
    marginBottom: 16,
  },
  priceIntervalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalCostRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

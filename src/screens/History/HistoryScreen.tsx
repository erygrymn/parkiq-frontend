import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiGet } from "../../services/api";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";
import { formatDuration, formatDate } from "../../utils/date";
import { getLocale } from "../../localization";
import { useParkingStore } from "../../state/parkingStore";

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

interface GroupedSessions {
  dateKey: string;
  dateLabel: string;
  sessions: ParkSession[];
}

export const HistoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const activeSession = useParkingStore((state) => state.activeSession);
  const [sessions, setSessions] = useState<ParkSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const fetchHistory = async () => {
    try {
      setError(null);
      const data = await apiGet<Array<{
        id: string;
        started_at: string;
        ended_at: string | null;
        lat: number;
        lng: number;
        note?: string | null;
        duration_seconds?: number | null;
      }>>("/api/parking/history");
      const sessions = (data || []).map((s) => ({
        id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        latitude: s.lat,
        longitude: s.lng,
        location_name: null,
        note: s.note,
        adjusted_started_at: null,
      }));
      const endedSessions = sessions.filter((s) => s.ended_at);
      
      // Mock history record with all information
      const mockSession: ParkSession = {
        id: "mock-session-001",
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        ended_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        latitude: 41.0082,
        longitude: 28.9784,
        location_name: "Taksim Square, Istanbul",
        note: "Parked near the main entrance. Remember to check parking meter.",
        adjusted_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString(), // 15 minutes before actual start
      };
      
      setSessions([mockSession, ...endedSessions]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch history";
      setError(errorMessage);
      console.error("Failed to fetch history", error);
      
      // Even on error, show mock session
      const mockSession: ParkSession = {
        id: "mock-session-001",
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ended_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        latitude: 41.0082,
        longitude: 28.9784,
        location_name: "Taksim Square, Istanbul",
        note: "Parked near the main entrance. Remember to check parking meter.",
        adjusted_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString(),
      };
      setSessions([mockSession]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // Group sessions by date
  const groupSessionsByDate = (sessions: ParkSession[]): GroupedSessions[] => {
    const locale = getLocale() === "tr" ? "tr-TR" : "en-US";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped: Record<string, ParkSession[]> = {};

    sessions.forEach((session) => {
      const endDate = session.ended_at ? new Date(session.ended_at) : new Date(session.started_at);
      const dateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      let dateKey: string;

      if (dateOnly.getTime() === today.getTime()) {
        dateKey = "today";
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        dateKey = "yesterday";
      } else {
        dateKey = dateOnly.toISOString().split("T")[0];
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });

    // Sort dates: today first, then yesterday, then older dates (newest first)
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === "today") return -1;
      if (b === "today") return 1;
      if (a === "yesterday") return -1;
      if (b === "yesterday") return 1;
      return b.localeCompare(a); // Newest first for date strings
    });

    return sortedKeys.map((key) => {
      let dateLabel: string;
      if (key === "today") {
        dateLabel = t("common.today");
      } else if (key === "yesterday") {
        dateLabel = t("common.yesterday");
      } else {
        dateLabel = new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(key));
      }

      return {
        dateKey: key,
        dateLabel,
        sessions: grouped[key],
      };
    });
  };

  const toggleDate = (dateKey: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // Expand first date by default
  useEffect(() => {
    if (sessions.length > 0 && expandedDates.size === 0) {
      const grouped = groupSessionsByDate(sessions);
      if (grouped.length > 0) {
        setExpandedDates(new Set([grouped[0].dateKey]));
      }
    }
  }, [sessions]);

  // Fetch location names for sessions without location_name
  useEffect(() => {
    const fetchLocationNames = async () => {
      const namesToFetch: Array<{ id: string; lat: number; lng: number }> = [];
      
      sessions.forEach((session) => {
        if (!session.location_name && !locationNames[session.id]) {
          namesToFetch.push({
            id: session.id,
            lat: session.latitude,
            lng: session.longitude,
          });
        }
      });

      if (namesToFetch.length === 0) return;

      const newLocationNames: Record<string, string> = { ...locationNames };

      await Promise.all(
        namesToFetch.map(async ({ id, lat, lng }) => {
          try {
            const addresses = await Location.reverseGeocodeAsync({
              latitude: lat,
              longitude: lng,
            });
            
            if (addresses && addresses.length > 0) {
              const address = addresses[0];
              // Format: Street, City or City, Country
              const parts: string[] = [];
              if (address.street) parts.push(address.street);
              if (address.city) parts.push(address.city);
              if (parts.length === 0 && address.name) parts.push(address.name);
              if (parts.length === 0 && address.district) parts.push(address.district);
              if (parts.length === 0 && address.region) parts.push(address.region);
              if (parts.length === 0 && address.country) parts.push(address.country);
              
              newLocationNames[id] = parts.length > 0 ? parts.join(", ") : "Unknown Location";
            } else {
              newLocationNames[id] = "Unknown Location";
            }
          } catch (error) {
            console.error(`Failed to reverse geocode for session ${id}:`, error);
            newLocationNames[id] = "Unknown Location";
          }
        })
      );

      setLocationNames((prev) => ({ ...prev, ...newLocationNames }));
    };

    if (sessions.length > 0) {
      fetchLocationNames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  if (loading && sessions.length === 0) {
    return (
      <>
        <AppHeader title={t("history.title")} variant="root" />
        <Screen variant="default" withTabBarInset scroll>
          <View style={styles.loadingContainer}>
            <Text style={[textStyles.body, { color: theme.colors.textPrimary }]}>
              {t("common.loading")}
            </Text>
          </View>
        </Screen>
      </>
    );
  }

  const handleActiveSessionPress = () => {
    const nav = navigation as any;
    nav.getParent()?.navigate("Parking", { screen: "ParkingMain" });
  };

  return (
    <>
      <AppHeader title={t("history.title")} variant="root" />
      <Screen variant="default" withTabBarInset scroll>
      <View style={styles.content}>
        {activeSession && (
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <TouchableOpacity
              onPress={handleActiveSessionPress}
              style={{ paddingVertical: theme.spacing.s12 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      textStyles.body,
                      {
                        color: theme.colors.accent,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    Active session in progress
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.textTertiary}
                />
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {error && (
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <View style={{ padding: theme.spacing.s16 }}>
              <Text style={[textStyles.body, { color: theme.colors.danger }]}>
                {error}
              </Text>
            </View>
          </Card>
        )}

        {sessions.length === 0 && !loading ? (
          <Card>
            <View style={{ padding: theme.spacing.s24, alignItems: "center" }}>
              <Text
                style={[
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing.s8,
                  },
                ]}
              >
                {t("history.noHistory")}
              </Text>
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textSecondary,
                    textAlign: "center",
                  },
                ]}
              >
                Your completed parking sessions will appear here
              </Text>
            </View>
          </Card>
        ) : (
          groupSessionsByDate(sessions).map((group, groupIndex) => {
            const isExpanded = expandedDates.has(group.dateKey);
            
            return (
              <Card key={group.dateKey} style={{ marginBottom: theme.spacing.s16 }}>
                <TouchableOpacity
                  onPress={() => toggleDate(group.dateKey)}
                  style={[
                    styles.dateHeader,
                    {
                      borderBottomWidth: isExpanded ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                      paddingBottom: isExpanded ? theme.spacing.s12 : 0,
                      marginBottom: isExpanded ? theme.spacing.s12 : 0,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      textStyles.section,
                      {
                        color: theme.colors.textPrimary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {group.dateLabel}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View>
                    {group.sessions.map((item, index) => {
                      const duration = formatDuration(item.started_at, item.ended_at);
                      const isZeroDuration = duration === "0m";

                      // Get location label: location_name if available, otherwise reverse geocoded name
                      const locationLabel = item.location_name || locationNames[item.id] || t("common.loading");
                      
                      // Format date and time for end
                      const endDate = item.ended_at ? new Date(item.ended_at) : null;
                      const locale = getLocale() === "tr" ? "tr-TR" : "en-US";
                      const dateTimeLabel = endDate
                        ? new Intl.DateTimeFormat(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(endDate)
                        : formatDate(item.started_at, locale);

                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            const nav = navigation as any;
                            nav.navigate("HistoryDetail", { session: item });
                          }}
                          style={[
                            styles.row,
                            {
                              borderBottomWidth: index === group.sessions.length - 1 ? 0 : 1,
                              borderBottomColor: theme.colors.border,
                              minHeight: 56,
                              paddingVertical: theme.spacing.s8,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <View style={styles.left}>
                            <Text
                              style={[
                                textStyles.body,
                                {
                                  color: theme.colors.textPrimary,
                                  fontWeight: "600",
                                  marginBottom: theme.spacing.s4,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {locationLabel}
                            </Text>
                            <Text
                              style={[
                                textStyles.caption,
                                {
                                  color: theme.colors.textSecondary,
                                },
                              ]}
                            >
                              {dateTimeLabel}
                            </Text>
                          </View>
                          <View style={styles.right}>
                            <Text
                              style={[
                                textStyles.body,
                                {
                                  color: isZeroDuration ? theme.colors.textSecondary : theme.colors.textPrimary,
                                  fontWeight: "600",
                                  marginRight: theme.spacing.s8,
                                },
                              ]}
                            >
                              {duration}
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={theme.colors.textTertiary}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </View>
      </Screen>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  left: {
    flex: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
});

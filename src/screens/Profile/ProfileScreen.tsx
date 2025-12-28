import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Linking, Alert, Platform, ActivityIndicator, Modal } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../ui/components/Screen";
import { AppHeader } from "../../ui/components/AppHeader";
import { Card } from "../../ui/components/Card";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t, getLocale } from "../../localization";
import { useAuthStore } from "../../state/authStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { apiGet } from "../../services/api";
import { formatDuration } from "../../utils/date";

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

interface SavedSession {
  session: ParkSession;
  savedAmount: number;
  currency: string;
  actualCost: number;
  wouldHaveCost: number;
}

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const currency = useSettingsStore((state) => state.currency);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: "0h 0m",
    saved: "$0",
  });
  const [recentActivity, setRecentActivity] = useState<Array<{
    icon: string;
    title: string;
    subtitle: string;
    color: string;
  }>>([]);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const lastFetchTimeRef = useRef<number | null>(null);
  const cachedStatsRef = useRef<{
    totalSessions: number;
    totalTime: string;
    saved: string;
  } | null>(null);
  const cachedRecentActivityRef = useRef<Array<{
    icon: string;
    title: string;
    subtitle: string;
    color: string;
  }>>([]);
  const cachedSessionsRef = useRef<ParkSession[]>([]);

  const handleSettingsPress = () => {
    const nav = navigation as any;
    nav.navigate("Profile", { screen: "SettingsMain" });
  };

  const fetchProfileData = async (forceRefresh = false) => {

    // Cache duration: 5 minutes (300000 ms)
    const CACHE_DURATION = 5 * 60 * 1000;
    const now = Date.now();

    // If we have cached data and it's still fresh, use it
    if (
      !forceRefresh &&
      cachedStatsRef.current &&
      lastFetchTimeRef.current &&
      now - lastFetchTimeRef.current < CACHE_DURATION
    ) {
      setStats(cachedStatsRef.current);
      setRecentActivity(cachedRecentActivityRef.current);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

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
      const totalSessions = endedSessions.length;

      // Calculate total time
      let totalMinutes = 0;
      endedSessions.forEach((session) => {
        const startTime = session.adjusted_started_at
          ? new Date(session.adjusted_started_at).getTime()
          : new Date(session.started_at).getTime();
        const endTime = new Date(session.ended_at!).getTime();
        const diff = Math.floor((endTime - startTime) / (1000 * 60));
        totalMinutes += diff;
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      const totalTime = totalHours > 0
        ? `${totalHours}${t("common.hourShort")} ${remainingMinutes}${t("common.minuteShort")}`
        : `${remainingMinutes}${t("common.minuteShort")}`;

      // Get recent activity (last 3 sessions, or as many as available)
      const recentSessions = endedSessions.slice(0, Math.min(3, endedSessions.length)).map((session) => {
        const endDate = new Date(session.ended_at!);
        const now = new Date();
        const diffMs = now.getTime() - endDate.getTime();

        // Handle negative time differences (shouldn't happen, but just in case)
        if (diffMs < 0) {
          return {
            icon: "car" as const,
            title: session.location_name || t("profile.parkingSession"),
            subtitle: t("profile.justNow"),
            color: theme.colors.accent,
          };
        }

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let subtitle = "";
        if (diffMinutes < 1) {
          subtitle = t("profile.justNow");
        } else if (diffMinutes < 60) {
          const key = diffMinutes === 1 ? "profile.minutesAgo" : "profile.minutesAgo_plural";
          subtitle = t(key).replace("{{count}}", diffMinutes.toString());
        } else if (diffHours < 24) {
          const key = diffHours === 1 ? "profile.hoursAgo" : "profile.hoursAgo_plural";
          subtitle = t(key).replace("{{count}}", diffHours.toString());
        } else if (diffDays === 1) {
          subtitle = t("profile.yesterday");
        } else if (diffDays < 7) {
          const key = diffDays === 1 ? "profile.daysAgo" : "profile.daysAgo_plural";
          subtitle = t(key).replace("{{count}}", diffDays.toString());
        } else {
          // For older sessions, show the date
          const locale = getLocale() === "tr" ? "tr-TR" : "en-US";
          subtitle = new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
          }).format(endDate);
        }

        return {
          icon: "car" as const,
          title: session.location_name || t("profile.parkingSession"),
          subtitle,
          color: theme.colors.accent,
        };
      });

      // Calculate saved amount
      let totalSaved = 0;
      const savedSessionsList: SavedSession[] = [];

      for (const session of endedSessions) {
        try {
          // Get price info for this location
          const prices = await apiGet<VerifiedPrice[]>(
            `/api/verified-prices?lat=${session.latitude}&lng=${session.longitude}&radius=100`
          );

          if (prices && prices.length > 0) {
            const priceInfo = prices[0];
            const startTime = session.adjusted_started_at
              ? new Date(session.adjusted_started_at).getTime()
              : new Date(session.started_at).getTime();
            const endTime = new Date(session.ended_at!).getTime();
            const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));

            // Calculate actual cost
            const actualCost = calculateParkingCost(priceInfo.price_json, durationMinutes);

            // Calculate cost if 15 minutes more (would have cost)
            const wouldHaveDurationMinutes = durationMinutes + 15;
            const wouldHaveCost = calculateParkingCost(priceInfo.price_json, wouldHaveDurationMinutes);

            const savedAmount = wouldHaveCost - actualCost;

            if (savedAmount > 0) {
              totalSaved += savedAmount;
              savedSessionsList.push({
                session,
                savedAmount,
                currency: priceInfo.currency,
                actualCost,
                wouldHaveCost,
              });
            }
          }
        } catch (error) {
          // Skip sessions without price data
          console.error(`Failed to fetch price for session ${session.id}`, error);
        }
      }

      // Store sessions for potential reuse
      cachedSessionsRef.current = endedSessions;

      const newStats = {
        totalSessions,
        totalTime,
        saved: `${getCurrencySymbol(currency)}${totalSaved.toFixed(2)}`,
      };

      setStats(newStats);
      cachedStatsRef.current = newStats;
      setSavedSessions(savedSessionsList);
      setRecentActivity(recentSessions);
      cachedRecentActivityRef.current = recentSessions;
      lastFetchTimeRef.current = now;
    } catch (error) {
      // Only log non-user-related errors to avoid spam
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("User not found") && !errorMessage.includes("user not found")) {
        console.error("Failed to fetch profile data", error);
      }
      // If we have cached data, use it even on error
      if (cachedStatsRef.current) {
        setStats(cachedStatsRef.current);
        setRecentActivity(cachedRecentActivityRef.current);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData(false);
    }, [])
  );

  // Refresh saved amount when currency changes (reuse cached sessions)
  useEffect(() => {
    if (cachedSessionsRef.current.length > 0 && cachedStatsRef.current) {
      // Recalculate saved amount with new currency, but reuse cached sessions
      const recalculateSaved = async () => {
        try {
          setLoading(true);
          let totalSaved = 0;
          const savedSessionsList: SavedSession[] = [];

          for (const session of cachedSessionsRef.current) {
            try {
              const prices = await apiGet<VerifiedPrice[]>(
                `/api/verified-prices?lat=${session.latitude}&lng=${session.longitude}&radius=100`
              );

              if (prices && prices.length > 0) {
                const priceInfo = prices[0];
                const startTime = session.adjusted_started_at
                  ? new Date(session.adjusted_started_at).getTime()
                  : new Date(session.started_at).getTime();
                const endTime = new Date(session.ended_at!).getTime();
                const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));

                const actualCost = calculateParkingCost(priceInfo.price_json, durationMinutes);
                const wouldHaveDurationMinutes = durationMinutes + 15;
                const wouldHaveCost = calculateParkingCost(priceInfo.price_json, wouldHaveDurationMinutes);
                const savedAmount = wouldHaveCost - actualCost;

                if (savedAmount > 0) {
                  totalSaved += savedAmount;
                  savedSessionsList.push({
                    session,
                    savedAmount,
                    currency: priceInfo.currency,
                    actualCost,
                    wouldHaveCost,
                  });
                }
              }
            } catch (error) {
              console.error(`Failed to fetch price for session ${session.id}`, error);
            }
          }

          const newStats = {
            ...cachedStatsRef.current,
            saved: `${getCurrencySymbol(currency)}${totalSaved.toFixed(2)}`,
          };

          setStats(newStats);
          cachedStatsRef.current = newStats;
          setSavedSessions(savedSessionsList);
        } catch (error) {
          console.error("Failed to recalculate saved amount", error);
        } finally {
          setLoading(false);
        }
      };

      recalculateSaved();
    }
  }, [currency]);

  const handleRateApp = async () => {
    const appStoreUrl = Platform.OS === "ios"
      ? "https://apps.apple.com/app/id123456789" // Replace with actual App Store ID
      : "https://play.google.com/store/apps/details?id=com.parkiq.app"; // Replace with actual package name

    try {
      const canOpen = await Linking.canOpenURL(appStoreUrl);
      if (canOpen) {
        await Linking.openURL(appStoreUrl);
      } else {
        Alert.alert("Error", "Unable to open app store");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open app store");
    }
  };

  const handleHelpSupport = () => {
    const email = "support@parkiq.com";
    const subject = "Help & Support";
    const body = "";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert("Error", "Unable to open email client");
    });
  };

  const handleShareApp = async () => {
    try {
      const result = await Share.share({
        message: "Check out ParkIQ - Smart parking management app!",
        url: Platform.OS === "ios"
          ? "https://apps.apple.com/app/id123456789"
          : "https://play.google.com/store/apps/details?id=com.parkiq.app",
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share app");
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    return t("profile.user");
  };

  // Get currency symbol from currency code
  const getCurrencySymbol = (currencyCode: string): string => {
    const currencySymbols: Record<string, string> = {
      TRY: "₺",
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CNY: "¥",
      INR: "₹",
      KRW: "₩",
      BRL: "R$",
      CAD: "C$",
      AUD: "A$",
      CHF: "CHF",
      SEK: "kr",
      NOK: "kr",
      DKK: "kr",
      PLN: "zł",
      RUB: "₽",
      MXN: "$",
      ZAR: "R",
    };
    return currencySymbols[currencyCode] || currencyCode;
  };

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

  return (
    <>
      <AppHeader
        title={t("profile.title")}
        variant="root"
        rightComponent={
          <TouchableOpacity
            onPress={handleSettingsPress}
            style={styles.settingsButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        }
      />
      <Screen variant="default" withTabBarInset scroll>
        <View style={styles.content}>
          {/* Profile Header Card */}
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <View style={styles.profileHeader}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: theme.colors.accent,
                    },
                  ]}
                >
                  <Ionicons name="person" size={40} color={theme.colors.surface} />
                </View>
                <View style={styles.profileInfo}>
                  <Text
                    style={[
                      textStyles.title,
                      {
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {getUserDisplayName()}
                  </Text>
                  <Text
                    style={[
                      textStyles.sub,
                      {
                        color: theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t("profile.user")}
                  </Text>
                </View>
              </View>
            )}
          </Card>

          {/* Stats Card */}
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s16,
                },
              ]}
            >
              {t("profile.statistics")}
            </Text>
            {loading ? (
              <View style={{ padding: theme.spacing.s16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              </View>
            ) : (
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statItem,
                    {
                      borderRightWidth: 1,
                      borderRightColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      textStyles.title,
                      {
                        color: theme.colors.accent,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {stats.totalSessions}
                  </Text>
                  <Text
                    style={[
                      textStyles.sub,
                      {
                        color: theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t("profile.totalSessions")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statItem,
                    {
                      borderRightWidth: 1,
                      borderRightColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      textStyles.title,
                      {
                        color: theme.colors.accent,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {stats.totalTime}
                  </Text>
                  <Text
                    style={[
                      textStyles.sub,
                      {
                        color: theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t("profile.totalTime")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => setSavedModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      textStyles.title,
                      {
                        color: theme.colors.accent,
                        marginBottom: theme.spacing.s4,
                      },
                    ]}
                  >
                    {stats.saved}
                  </Text>
                  <Text
                    style={[
                      textStyles.sub,
                      {
                        color: theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t("profile.saved")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Recent Activity Card */}
          <Card style={{ marginBottom: theme.spacing.s16 }}>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s16,
                },
              ]}
            >
              {t("profile.recentActivity")}
            </Text>
            {loading ? (
              <View style={{ padding: theme.spacing.s16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              </View>
            ) : recentActivity.length === 0 ? (
              <View style={{ padding: theme.spacing.s16, alignItems: "center" }}>
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {t("profile.noRecentActivity")}
                </Text>
              </View>
            ) : (
              recentActivity.map((activity, index) => (
                <View
                  key={index}
                  style={[
                    styles.activityRow,
                    {
                      borderBottomWidth: index < recentActivity.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                      paddingBottom: index < recentActivity.length - 1 ? theme.spacing.s16 : 0,
                      marginBottom: index < recentActivity.length - 1 ? theme.spacing.s16 : 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor: theme.colors.surface2,
                      },
                    ]}
                  >
                    <Ionicons
                      name={activity.icon as any}
                      size={20}
                      color={activity.color}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text
                      style={[
                        textStyles.body,
                        {
                          color: theme.colors.textPrimary,
                          fontWeight: "600",
                          marginBottom: theme.spacing.s4,
                        },
                      ]}
                    >
                      {activity.title}
                    </Text>
                    <Text
                      style={[
                        textStyles.sub,
                        {
                          color: theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {activity.subtitle}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <Text
              style={[
                textStyles.section,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.s16,
                },
              ]}
            >
              {t("profile.quickActions")}
            </Text>
            <TouchableOpacity
              style={[
                styles.actionRow,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  paddingBottom: theme.spacing.s16,
                  marginBottom: theme.spacing.s16,
                },
              ]}
              onPress={handleRateApp}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name="star-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("profile.rateApp")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionRow,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  paddingBottom: theme.spacing.s16,
                  marginBottom: theme.spacing.s16,
                },
              ]}
              onPress={handleHelpSupport}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("profile.helpSupport")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleShareApp}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    textStyles.body,
                    {
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.s12,
                    },
                  ]}
                >
                  {t("profile.shareApp")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </Card>
        </View>
      </Screen>

      {/* Saved Details Modal */}
      <Modal
        visible={savedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSavedModalVisible(false)}
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
                {t("profile.moneySaved")}
              </Text>
              <TouchableOpacity
                onPress={() => setSavedModalVisible(false)}
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
              {savedSessions.length === 0 ? (
                <View style={{ padding: theme.spacing.s20, alignItems: "center" }}>
                  <Text
                    style={[
                      textStyles.body,
                      {
                        color: theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t("profile.noSavings")}
                  </Text>
                  <Text
                    style={[
                      textStyles.caption,
                      {
                        color: theme.colors.textTertiary,
                        marginTop: theme.spacing.s8,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {t("profile.savingsDescription")}
                  </Text>
                </View>
              ) : (
                savedSessions.map((savedSession, index) => {
                  const session = savedSession.session;
                  const endDate = new Date(session.ended_at!);
                  const locale = getLocale() === "tr" ? "tr-TR" : "en-US";
                  const dateStr = new Intl.DateTimeFormat(locale, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(endDate);

                  return (
                    <View
                      key={session.id}
                      style={[
                        styles.savedItem,
                        {
                          borderBottomWidth: index < savedSessions.length - 1 ? 1 : 0,
                          borderBottomColor: theme.colors.border,
                          paddingBottom: index < savedSessions.length - 1 ? theme.spacing.s16 : 0,
                          marginBottom: index < savedSessions.length - 1 ? theme.spacing.s16 : 0,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            textStyles.body,
                            {
                              color: theme.colors.textPrimary,
                              fontWeight: "600",
                              marginBottom: theme.spacing.s4,
                            },
                          ]}
                        >
                          {session.location_name || `${session.latitude.toFixed(4)}, ${session.longitude.toFixed(4)}`}
                        </Text>
                        <Text
                          style={[
                            textStyles.caption,
                            {
                              color: theme.colors.textSecondary,
                              marginBottom: theme.spacing.s8,
                            },
                          ]}
                        >
                          {dateStr}
                        </Text>
                        <View style={styles.savedDetails}>
                          <Text
                            style={[
                              textStyles.caption,
                              {
                                color: theme.colors.textTertiary,
                              },
                            ]}
                          >
                            {t("profile.actual")}: {getCurrencySymbol(savedSession.currency)}{savedSession.actualCost.toFixed(2)}
                          </Text>
                          <Text
                            style={[
                              textStyles.caption,
                              {
                                color: theme.colors.textTertiary,
                                marginLeft: theme.spacing.s12,
                              },
                            ]}
                          >
                            {t("profile.wouldBe")}: {getCurrencySymbol(savedSession.currency)}{savedSession.wouldHaveCost.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          textStyles.title,
                          {
                            color: theme.colors.accent,
                            marginLeft: theme.spacing.s12,
                          },
                        ]}
                      >
                        -{getCurrencySymbol(savedSession.currency)}{savedSession.savedAmount.toFixed(2)}
                      </Text>
                    </View>
                  );
                })
              )}
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
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  anonymousProfile: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  anonymousAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
  },
  loginButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    minWidth: 200,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    maxHeight: 500,
  },
  savedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  savedDetails: {
    flexDirection: "row",
  },
  profileDetails: {
    gap: 16,
  },
  profileDetailRow: {
    marginBottom: 12,
  },
});


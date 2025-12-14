import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTheme } from "@/theme";
import { parkingService } from "@/services/parkingService";
import { formatDate, formatTime, formatDuration } from "@/utils/date";

interface HistoryItem {
  id: string;
  created_at: string;
  ended_at: string | null;
  latitude: number;
  longitude: number;
  note: string | null;
}

export const HistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await parkingService.fetchHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoading(false);
    }
  };

  const getDuration = (item: HistoryItem): number => {
    if (!item.ended_at) return 0;
    const start = new Date(item.created_at).getTime();
    const end = new Date(item.ended_at).getTime();
    return Math.floor((end - start) / 1000);
  };

  return (
    <ScreenContainer>
      <SectionHeader title={t("history.title")} />
      {loading ? (
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const duration = getDuration(item);
            return (
              <View
                style={[
                  styles.item,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.date, { color: theme.colors.text }]}>
                  {formatDate(item.created_at)} {formatTime(item.created_at)}
                </Text>
                {duration > 0 && (
                  <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>
                    {t("history.duration")}: {formatDuration(duration)}
                  </Text>
                )}
                <Text style={[styles.location, { color: theme.colors.textSecondary }]}>
                  {t("history.location")}: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
                {item.note && (
                  <Text style={[styles.note, { color: theme.colors.text }]}>
                    {item.note}
                  </Text>
                )}
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  date: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    marginBottom: 4,
  },
  note: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: "italic",
  },
});


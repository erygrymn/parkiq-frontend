import { create } from "zustand";
import * as Notifications from "expo-notifications";
import { apiGet, apiPost, apiPatch } from "../services/api";

interface ActiveSession {
  id: string;
  startedAt: string;
  latitude: number;
  longitude: number;
  note?: string | null;
  adjustedStartedAt?: string | null;
  locationName?: string | null;
  hasPhoto?: boolean;
}

interface ParkingState {
  activeSession: ActiveSession | null;
  loading: boolean;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number;
  scheduledNotificationId: string | null;
  loadActiveSessionFromBackend: () => Promise<void>;
  startParking: (input: {
    latitude: number;
    longitude: number;
    locationName?: string | null;
    note?: string | null;
    adjustedStartedAt?: string | null;
    premiumTimer?: boolean;
    hasPhoto?: boolean;
  }) => Promise<{
    id: string;
    started_at: string;
    latitude: number;
    longitude: number;
    note?: string | null;
    adjusted_started_at?: string | null;
    location_name?: string | null;
  }>;
  endParking: () => Promise<{
    id: string;
    started_at: string;
    ended_at: string;
    latitude: number;
    longitude: number;
    note?: string | null;
    adjusted_started_at?: string | null;
    location_name?: string | null;
  }>;
  clearActiveSession: () => void;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  activeSession: null,
  loading: false,
  reminderEnabled: false,
  reminderOffsetMinutes: 10,
  scheduledNotificationId: null,

  loadActiveSessionFromBackend: async () => {
    try {
      set({ loading: true });
      const history = await apiGet<Array<{
        id: string;
        started_at: string;
        ended_at: string | null;
        latitude: number;
        longitude: number;
        note?: string | null;
        adjusted_started_at?: string | null;
        location_name?: string | null;
        has_photo?: boolean;
      }>>("/api/park-sessions/history?limit=1&offset=0");

      const active = history?.find((s) => !s.ended_at) || null;

      if (active) {
        set({
          activeSession: {
            id: active.id,
            startedAt: active.started_at,
            latitude: active.latitude,
            longitude: active.longitude,
            note: active.note,
            adjustedStartedAt: active.adjusted_started_at || undefined,
            locationName: active.location_name || undefined,
            hasPhoto: active.has_photo || false,
          },
        });
      } else {
        set({ activeSession: null });
      }
    } catch (error) {
      // Only log non-user-related errors to avoid spam
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("User not found") && !errorMessage.includes("user not found")) {
        console.error("Failed to load active session", error);
      }
      set({ activeSession: null });
    } finally {
      set({ loading: false });
    }
  },

  startParking: async (input) => {
    try {
      set({ loading: true });
      const response = await apiPost<{
        id: string;
        started_at: string;
        latitude: number;
        longitude: number;
        note?: string | null;
        adjusted_started_at?: string | null;
        location_name?: string | null;
        has_photo?: boolean;
      }>("/api/park-sessions", {
        latitude: input.latitude,
        longitude: input.longitude,
        locationName: input.locationName,
        note: input.note,
        adjustedStartedAt: input.adjustedStartedAt,
        premiumTimer: input.premiumTimer ?? false,
        hasPhoto: input.hasPhoto ?? false,
      });

      set({
        activeSession: {
          id: response.id,
          startedAt: response.started_at,
          latitude: response.latitude,
          longitude: response.longitude,
          note: response.note || undefined,
          adjustedStartedAt: response.adjusted_started_at || undefined,
          locationName: response.location_name || undefined,
          hasPhoto: response.has_photo || false,
        },
      });
      return response;
    } catch (error) {
      set({ activeSession: null });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  endParking: async () => {
    const { activeSession, scheduledNotificationId } = get();
    if (!activeSession) {
      throw new Error("No active session");
    }

    try {
      set({ loading: true });
      const response = await apiPatch<{
        id: string;
        started_at: string;
        ended_at: string;
        latitude: number;
        longitude: number;
        note?: string | null;
        adjusted_started_at?: string | null;
        location_name?: string | null;
      }>(`/api/park-sessions/end/${activeSession.id}`, {
        endedAt: new Date().toISOString(),
      });

      if (scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
      }

      set({
        activeSession: null,
        reminderEnabled: false,
        reminderOffsetMinutes: 10,
        scheduledNotificationId: null,
      });

      return response;
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearActiveSession: () => {
    const { scheduledNotificationId } = get();
    if (scheduledNotificationId) {
      Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => {});
    }
    set({
      activeSession: null,
      reminderEnabled: false,
      reminderOffsetMinutes: 10,
      scheduledNotificationId: null,
    });
  },
}));


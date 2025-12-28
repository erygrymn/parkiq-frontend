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
        lat: number;
        lng: number;
        note?: string | null;
        duration_seconds?: number | null;
      }>>("/api/parking/history");

      const active = history?.find((s) => !s.ended_at) || null;

      if (active) {
        set({
          activeSession: {
            id: active.id,
            startedAt: active.started_at,
            latitude: active.lat,
            longitude: active.lng,
            note: active.note,
            adjustedStartedAt: undefined,
            locationName: undefined,
            hasPhoto: false,
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
        lat: number;
        lng: number;
        note?: string | null;
      }>("/api/parking/start", {
        startedAt: new Date().toISOString(),
        lat: input.latitude,
        lng: input.longitude,
        note: input.note || null,
      });

      set({
        activeSession: {
          id: response.id,
          startedAt: response.started_at,
          latitude: response.lat,
          longitude: response.lng,
          note: response.note || undefined,
          adjustedStartedAt: undefined,
          locationName: undefined,
          hasPhoto: false,
        },
      });
      return {
        id: response.id,
        started_at: response.started_at,
        latitude: response.lat,
        longitude: response.lng,
        note: response.note,
        adjusted_started_at: null,
        location_name: null,
      };
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
      const response = await apiPost<{
        id: string;
        started_at: string;
        ended_at: string;
        lat: number;
        lng: number;
        note?: string | null;
        duration_seconds?: number | null;
      }>("/api/parking/end", {
        sessionId: activeSession.id,
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

      return {
        id: response.id,
        started_at: response.started_at,
        ended_at: response.ended_at,
        latitude: response.lat,
        longitude: response.lng,
        note: response.note,
        adjusted_started_at: null,
        location_name: null,
      };
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


import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ParkSession {
  id: string;
  startedAt: string;
  latitude: number;
  longitude: number;
  locationName?: string | null;
}

interface AppState {
  activeParkingSessionId: string | null;
  activeParkingStartTime: string | null;
  activeSession: ParkSession | null;
  startSession: (session: ParkSession) => Promise<void>;
  endSession: () => Promise<void>;
}

const SESSION_KEY = "parkiq_active_session";

export const useAppStore = create<AppState>((set) => ({
  activeParkingSessionId: null,
  activeParkingStartTime: null,
  activeSession: null,
  startSession: async (session: ParkSession) => {
    const data = {
      id: session.id,
      startedAt: session.startedAt,
      latitude: session.latitude,
      longitude: session.longitude,
      locationName: session.locationName,
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
    set({
      activeParkingSessionId: session.id,
      activeParkingStartTime: session.startedAt,
      activeSession: session,
    });
  },
  endSession: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    set({
      activeParkingSessionId: null,
      activeParkingStartTime: null,
      activeSession: null,
    });
  },
}));

(async () => {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      useAppStore.setState({
        activeParkingSessionId: session.id,
        activeParkingStartTime: session.startedAt,
        activeSession: session,
      });
    }
  } catch {
  }
})();


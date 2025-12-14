import { apiGet, apiPost, apiPatch } from "./api";
import { useParkingStore } from "@/store/useParkingStore";
import { getCurrentPosition } from "./locationService";

export const parkingService = {
  async startParking(note?: string): Promise<void> {
    const position = await getCurrentPosition();
    const data = await apiPost<{ id: string; created_at: string }>(
      "/api/park-sessions",
      {
        latitude: position.latitude,
        longitude: position.longitude,
        note,
      }
    );
    useParkingStore.getState().startSession(
      data.id,
      data.created_at,
      data.created_at
    );
  },

  async endParking(): Promise<void> {
    const sessionId = useParkingStore.getState().activeSessionId;
    if (!sessionId) {
      throw new Error("No active session");
    }
    await apiPatch(`/api/park-sessions/end/${sessionId}`, {});
    useParkingStore.getState().endSession();
  },

  async fetchHistory(): Promise<
    Array<{
      id: string;
      created_at: string;
      ended_at: string | null;
      latitude: number;
      longitude: number;
      note: string | null;
    }>
  > {
    return apiGet("/api/park-sessions/history?limit=50&offset=0");
  },
};


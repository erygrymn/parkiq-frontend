import { apiGet, apiPost } from "./api";
import { useParkingStore } from "@/store/useParkingStore";
import { getCurrentPosition } from "./locationService";

export const parkingService = {
  async startParking(note?: string): Promise<void> {
    const position = await getCurrentPosition();
    const data = await apiPost<{ id: string; started_at: string }>(
      "/api/parking/start",
      {
        startedAt: new Date().toISOString(),
        lat: position.latitude,
        lng: position.longitude,
        note: note || null,
      }
    );
    useParkingStore.getState().startSession(
      data.id,
      data.started_at,
      data.started_at
    );
  },

  async endParking(): Promise<void> {
    const sessionId = useParkingStore.getState().activeSessionId;
    if (!sessionId) {
      throw new Error("No active session");
    }
    await apiPost("/api/parking/end", {
      sessionId,
      endedAt: new Date().toISOString(),
    });
    useParkingStore.getState().endSession();
  },

  async fetchHistory(): Promise<
    Array<{
      id: string;
      started_at: string;
      ended_at: string | null;
      lat: number;
      lng: number;
      note: string | null;
    }>
  > {
    return apiGet("/api/parking/history");
  },
};


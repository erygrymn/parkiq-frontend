import { create } from "zustand";

interface ParkingState {
  activeSessionId: string | null;
  startedAt: string | null;
  adjustedStartedAt: string | null;
  nextTariffChangeAt: string | null;
  remainingSeconds: number | null;
  startSession: (
    sessionId: string,
    startedAt: string,
    adjustedStartedAt?: string,
    nextTariffChangeAt?: string
  ) => void;
  endSession: () => void;
  tick: () => void;
}

export const useParkingStore = create<ParkingState>((set) => ({
  activeSessionId: null,
  startedAt: null,
  adjustedStartedAt: null,
  nextTariffChangeAt: null,
  remainingSeconds: null,
  startSession: (sessionId, startedAt, adjustedStartedAt, nextTariffChangeAt) =>
    set({
      activeSessionId: sessionId,
      startedAt,
      adjustedStartedAt: adjustedStartedAt || startedAt,
      nextTariffChangeAt: nextTariffChangeAt || null,
      remainingSeconds: null,
    }),
  endSession: () =>
    set({
      activeSessionId: null,
      startedAt: null,
      adjustedStartedAt: null,
      nextTariffChangeAt: null,
      remainingSeconds: null,
    }),
  tick: () =>
    set((state) => {
      if (!state.nextTariffChangeAt) {
        return state;
      }
      const now = new Date().getTime();
      const target = new Date(state.nextTariffChangeAt).getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      return { remainingSeconds: diff };
    }),
}));


import { create } from "zustand";
import { useConfigStore } from "./configStore";
import { getDeviceId } from "../utils/deviceId";

interface AuthState {
  deviceId: string | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  deviceId: null,
  isHydrating: true,

  hydrate: async () => {
    try {
      await useConfigStore.getState().loadConfig();
      const deviceId = await getDeviceId();
      set({
        deviceId,
        isHydrating: false,
      });
    } catch (error) {
      console.error("Error hydrating auth:", error);
      set({
        deviceId: null,
        isHydrating: false,
      });
    }
  },
}));


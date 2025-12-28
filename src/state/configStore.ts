import { create } from "zustand";
import Constants from "expo-constants";

interface ConfigState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  isLoaded: boolean;
  loadConfig: () => Promise<void>;
}

// Get backend URL from app config (set via EXPO_PUBLIC_BACKEND_URL or app.config.ts)
const BACKEND_BASE_URL = Constants.expoConfig?.extra?.backendUrl || "https://parkiq-backend.vercel.app";

export const useConfigStore = create<ConfigState>((set, get) => ({
  supabaseUrl: "",
  supabaseAnonKey: "",
  apiBaseUrl: BACKEND_BASE_URL,
  isLoaded: false,

  loadConfig: async () => {
    if (get().isLoaded) {
      return;
    }

    try {
      console.log(`[Config] Loading config from: ${BACKEND_BASE_URL}/api/config`);
      const response = await fetch(`${BACKEND_BASE_URL}/api/config`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Config] Config response:`, data);

      if (!data.success || !data.data) {
        throw new Error("Invalid config response");
      }

      const apiBaseUrl = data.data.apiBaseUrl || BACKEND_BASE_URL;
      console.log(`[Config] Using API Base URL: ${apiBaseUrl}`);

      set({
        supabaseUrl: data.data.supabaseUrl || "",
        supabaseAnonKey: data.data.supabaseAnonKey || "",
        apiBaseUrl,
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  },
}));


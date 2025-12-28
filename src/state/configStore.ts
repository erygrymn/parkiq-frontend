import { create } from "zustand";

interface ConfigState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  isLoaded: boolean;
  loadConfig: () => Promise<void>;
}

const BACKEND_BASE_URL = "https://parkiq-backend.vercel.app";

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

      if (!data.success || !data.data) {
        throw new Error("Invalid config response");
      }

      set({
        supabaseUrl: data.data.supabaseUrl || "",
        supabaseAnonKey: data.data.supabaseAnonKey || "",
        apiBaseUrl: data.data.apiBaseUrl || BACKEND_BASE_URL,
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  },
}));


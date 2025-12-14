import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "system" | "light" | "dark";
type Language = "en" | "tr";

interface SettingsState {
  themeMode: ThemeMode;
  reminderOffsetMinutes: number;
  currency: string;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  setReminderOffsetMinutes: (minutes: number) => void;
  setCurrency: (currency: string) => void;
  setLanguage: (language: Language) => void;
  loadSettings: () => Promise<void>;
}

const STORAGE_KEYS = {
  themeMode: "parkiq_theme_mode",
  reminderOffsetMinutes: "parkiq_reminder_offset_minutes",
  currency: "parkiq_currency",
  language: "parkiq_language",
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeMode: "system",
  reminderOffsetMinutes: 10,
  currency: "TRY",
  language: "en",
  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, mode);
  },
  setReminderOffsetMinutes: async (minutes) => {
    set({ reminderOffsetMinutes: minutes });
    await AsyncStorage.setItem(STORAGE_KEYS.reminderOffsetMinutes, minutes.toString());
  },
  setCurrency: async (currency) => {
    set({ currency });
    await AsyncStorage.setItem(STORAGE_KEYS.currency, currency);
  },
  setLanguage: async (language) => {
    set({ language });
    await AsyncStorage.setItem(STORAGE_KEYS.language, language);
  },
  loadSettings: async () => {
    try {
      const [themeMode, reminderOffsetMinutes, currency, language] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.themeMode),
        AsyncStorage.getItem(STORAGE_KEYS.reminderOffsetMinutes),
        AsyncStorage.getItem(STORAGE_KEYS.currency),
        AsyncStorage.getItem(STORAGE_KEYS.language),
      ]);

      set({
        themeMode: (themeMode as ThemeMode) || "system",
        reminderOffsetMinutes: reminderOffsetMinutes ? parseInt(reminderOffsetMinutes, 10) : 10,
        currency: currency || "TRY",
        language: (language as Language) || "en",
      });
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  },
}));


import Constants from "expo-constants";

interface AppEnv {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsKey: string;
  appEnv: string;
  adminEmail?: string;
}

function getEnv(key: string, defaultValue?: string, fallbackKey?: string): string {
  const extra = Constants.expoConfig?.extra || {};
  const value = process.env[key] || extra[key] || (fallbackKey ? (process.env[fallbackKey] || extra[fallbackKey]) : undefined) || defaultValue;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `For local development, set this in your shell or create a .env.local file. ` +
        `See PARKIQ_ENV.md for details.`
    );
  }
  return value;
}

const isDevelopment = process.env.EXPO_PUBLIC_APP_ENV === "development" || !process.env.EXPO_PUBLIC_APP_ENV;

export const env: AppEnv = {
  apiBaseUrl: getEnv("EXPO_PUBLIC_API_BASE_URL"),
  supabaseUrl: getEnv("EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  googleMapsKey: getEnv("EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY", isDevelopment ? "dummy-key-for-dev" : undefined, "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
  appEnv: getEnv("EXPO_PUBLIC_APP_ENV", "development"),
  adminEmail: process.env.EXPO_PUBLIC_ADMIN_EMAIL || Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMIN_EMAIL,
};


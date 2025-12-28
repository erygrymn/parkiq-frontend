import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

interface AppEnv {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appEnv: string;
  adminEmail?: string;
  revenueCatApiKey?: string;
}

import Constants from "expo-constants";

// Get backend URL from app config (set via EXPO_PUBLIC_BACKEND_URL or app.config.ts)
// For local development: EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
const BACKEND_BASE_URL = Constants.expoConfig?.extra?.backendUrl || "https://parkiq-backend.vercel.app";

const CONFIG_CACHE_KEY = "parkiq_app_config";
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (reduced for easier debugging)

interface CachedConfig {
  config: AppEnv;
  timestamp: number;
}

// Fetch config from backend
async function fetchConfigFromBackend(): Promise<AppEnv> {
  try {
    console.log(`Fetching config from: ${BACKEND_BASE_URL}/api/config`);
    const response = await fetch(`${BACKEND_BASE_URL}/api/config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`Config fetch failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Config response:", data);
    
    if (!data.success || !data.data) {
      throw new Error("Invalid config response");
    }
    
    const config = {
      apiBaseUrl: data.data.apiBaseUrl || BACKEND_BASE_URL,
      supabaseUrl: data.data.supabaseUrl || "",
      supabaseAnonKey: data.data.supabaseAnonKey || "",
      appEnv: data.data.appEnv || "production",
      adminEmail: undefined,
      revenueCatApiKey: data.data.revenueCatApiKey || "",
    };
    
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("Supabase configuration missing from backend response");
    }
    
    console.log("Config loaded successfully");
    return config;
  } catch (error) {
    console.error("Failed to fetch config from backend:", error);
    throw error;
  }
}

// Get config with caching
async function getConfig(): Promise<AppEnv> {
  try {
    // Try to get cached config
    const cachedStr = await SecureStore.getItemAsync(CONFIG_CACHE_KEY);
    if (cachedStr) {
      const cached: CachedConfig = JSON.parse(cachedStr);
      const now = Date.now();
      if (now - cached.timestamp < CONFIG_CACHE_DURATION) {
        return cached.config;
      }
    }

    // Fetch fresh config
    const config = await fetchConfigFromBackend();
    
    // Cache it
    const cache: CachedConfig = {
      config,
      timestamp: Date.now(),
    };
    await SecureStore.setItemAsync(CONFIG_CACHE_KEY, JSON.stringify(cache));
    
    return config;
  } catch (error) {
    // Fallback to cached config even if expired
    const cachedStr = await SecureStore.getItemAsync(CONFIG_CACHE_KEY);
    if (cachedStr) {
      const cached: CachedConfig = JSON.parse(cachedStr);
      return cached.config;
    }
    
    // Last resort: throw error
    throw new Error("Failed to load app configuration");
  }
}

// Synchronous fallback for immediate access (uses cache or empty values)
// All values will be loaded from backend on app startup
function getEnvSync(): AppEnv {
  // Try to get from cache first
  try {
    // This is a synchronous check, but SecureStore is async
    // So we'll just return empty values and let loadConfigFromBackend fill them
    return {
      apiBaseUrl: BACKEND_BASE_URL, // Only backend URL is known upfront
      supabaseUrl: "",
      supabaseAnonKey: "",
      appEnv: "production",
      adminEmail: undefined,
      revenueCatApiKey: "",
    };
  } catch {
    return {
      apiBaseUrl: BACKEND_BASE_URL,
      supabaseUrl: "",
      supabaseAnonKey: "",
      appEnv: "production",
      adminEmail: undefined,
      revenueCatApiKey: "",
    };
  }
}

// Export sync version for immediate use
export const env: AppEnv = getEnvSync();

// Clear config cache (useful for debugging or after backend updates)
export async function clearConfigCache(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CONFIG_CACHE_KEY);
    console.log("Config cache cleared");
  } catch (error) {
    console.error("Failed to clear config cache:", error);
  }
}

// Export async function to refresh config
export async function loadConfigFromBackend(forceRefresh = false): Promise<AppEnv> {
  if (forceRefresh) {
    await clearConfigCache();
  }
  
  const config = await getConfig();
  // Update the exported env object
  Object.assign(env, config);
  
  // Note: Supabase client will automatically use new env values on next access
  // because it checks env values each time getSupabaseClient() is called
  
  return config;
}


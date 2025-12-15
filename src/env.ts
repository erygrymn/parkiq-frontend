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

// Hardcoded backend URL - only this needs to be known upfront
const BACKEND_BASE_URL = "https://parkiq-backend-msjw9o619-erayguraymans-projects.vercel.app";

const CONFIG_CACHE_KEY = "parkiq_app_config";
const CONFIG_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedConfig {
  config: AppEnv;
  timestamp: number;
}

// Fetch config from backend
async function fetchConfigFromBackend(): Promise<AppEnv> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`Config fetch failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch config: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.data) {
      throw new Error("Invalid config response");
    }
    return {
      apiBaseUrl: data.data.apiBaseUrl || BACKEND_BASE_URL,
      supabaseUrl: data.data.supabaseUrl || "",
      supabaseAnonKey: data.data.supabaseAnonKey || "",
      appEnv: data.data.appEnv || "production",
      adminEmail: undefined,
      revenueCatApiKey: data.data.revenueCatApiKey || "",
    };
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

// Export async function to refresh config
export async function loadConfigFromBackend(): Promise<AppEnv> {
  const config = await getConfig();
  // Update the exported env object
  Object.assign(env, config);
  
  // Note: Supabase client will automatically use new env values on next access
  // because it checks env values each time getSupabaseClient() is called
  
  return config;
}


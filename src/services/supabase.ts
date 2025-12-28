import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useConfigStore } from "../state/configStore";

let supabaseClient: SupabaseClient | null = null;
let lastSupabaseUrl: string | null = null;
let lastSupabaseKey: string | null = null;

function getSupabaseClient(): SupabaseClient {
  const config = useConfigStore.getState();

  if (!config.isLoaded || !config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Supabase configuration not loaded. Please wait for backend config to load.");
  }

  if (
    !supabaseClient ||
    lastSupabaseUrl !== config.supabaseUrl ||
    lastSupabaseKey !== config.supabaseAnonKey
  ) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    lastSupabaseUrl = config.supabaseUrl;
    lastSupabaseKey = config.supabaseAnonKey;
  }

  return supabaseClient;
}

export function getSupabase(): SupabaseClient {
  return getSupabaseClient();
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

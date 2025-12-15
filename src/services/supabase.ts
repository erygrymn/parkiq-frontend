import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let supabaseClient: SupabaseClient | null = null;
let lastSupabaseUrl: string | null = null;
let lastSupabaseKey: string | null = null;

function getSupabaseClient(): SupabaseClient {
  // Check if we have valid config
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase configuration not loaded. Please wait for backend config to load.");
  }

  // Recreate if env values changed
  if (!supabaseClient || 
      lastSupabaseUrl !== env.supabaseUrl || 
      lastSupabaseKey !== env.supabaseAnonKey) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
    lastSupabaseUrl = env.supabaseUrl;
    lastSupabaseKey = env.supabaseAnonKey;
  }
  return supabaseClient;
}

// Export as getter function to always use latest env
export function getSupabase(): SupabaseClient {
  return getSupabaseClient();
}

// Lazy initialization - create client only when accessed
// This prevents errors during module load when config isn't ready yet
function createSupabaseClient(): SupabaseClient {
  return getSupabaseClient();
}

// Export as getter that creates client on first access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = createSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});


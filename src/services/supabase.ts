import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let supabaseClient: SupabaseClient | null = null;
let lastSupabaseUrl: string | null = null;
let lastSupabaseKey: string | null = null;

function getSupabaseClient(): SupabaseClient {
  // Recreate if env values changed
  if (!supabaseClient || 
      lastSupabaseUrl !== env.supabaseUrl || 
      lastSupabaseKey !== env.supabaseAnonKey) {
    supabaseClient = createClient(env.supabaseUrl || "", env.supabaseAnonKey || "");
    lastSupabaseUrl = env.supabaseUrl;
    lastSupabaseKey = env.supabaseAnonKey;
  }
  return supabaseClient;
}

// Initialize with current env (may be empty initially, will be updated when config loads)
getSupabaseClient();

// Export as getter function to always use latest env
export function getSupabase(): SupabaseClient {
  return getSupabaseClient();
}

// Export as const for backward compatibility (will be updated when config loads)
export const supabase = getSupabaseClient();


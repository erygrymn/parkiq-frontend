import { useConfigStore } from "../state/configStore";
import { useAuthStore } from "../state/authStore";
import { getSupabase } from "../services/supabase";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function getAuthToken(): Promise<string | null> {
  const session = useAuthStore.getState().session;
  return session?.access_token ?? null;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = useConfigStore.getState();
  const url = endpoint.startsWith("http") ? endpoint : `${config.apiBaseUrl}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal, // Support AbortSignal
    });
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("Network request failed"))) {
      throw new Error("Network request failed");
    }
    throw error;
  }

  // Log 404 errors for debugging
  if (response.status === 404) {
    console.warn(`[API] 404 Error for ${url}`);
    console.warn(`[API] Request method: ${options.method || "GET"}`);
    const config = useConfigStore.getState();
    console.warn(`[API] Backend URL: ${config.apiBaseUrl}`);
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!isJson) {
    const text = await response.text();
    if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
      // Log more details for 404 errors
      if (response.status === 404) {
        console.error(`[API] 404 Error Details:`);
        console.error(`[API] URL: ${url}`);
        console.error(`[API] Response preview: ${text.substring(0, 200)}`);
      }
      throw new Error(
        `Server configuration error: ${response.status}. Check backend logs. URL: ${url}`
      );
    }
    throw new Error(
      text || `Server error: ${response.status} ${response.statusText}`
    );
  }

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      `Server error: ${response.status} ${response.statusText}`
    );
  }

  if (!response.ok || !data.success) {
    const error = data.error || {
      code: "HTTP_ERROR",
      message: response.status === 500 
        ? "Server error. Please try again later."
        : `HTTP ${response.status}`,
    };
    
    // Handle "User not found" or authentication errors
    const isUserNotFoundError = error.message?.toLowerCase().includes("user not found");
    const isAuthError = response.status === 401 || isUserNotFoundError;
    
    // Handle "User not found" errors silently for certain read endpoints
    const isReadEndpoint = endpoint.includes("/parking/history");
    
    if (isUserNotFoundError && isReadEndpoint) {
      // Return empty array for read endpoints when user not found
      // This prevents error spam when user profile doesn't exist yet
      return [] as T;
    }
    
    throw new Error(error.message);
  }

  return data.data as T;
}

export async function apiGet<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET", signal });
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" });
}


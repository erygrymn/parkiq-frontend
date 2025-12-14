import { env } from "../env";
import { useAuthStore } from "../state/authStore";
import { supabase } from "../services/supabase";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function getAuthToken(): Promise<string | null> {
  return useAuthStore.getState().sessionToken;
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

  const url = endpoint.startsWith("http") ? endpoint : `${env.apiBaseUrl}${endpoint}`;
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

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!isJson) {
    const text = await response.text();
    if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
      throw new Error(
        `Server configuration error: ${response.status}. Check backend logs.`
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
    
    // Handle "User not found" or authentication errors by refreshing session
    const isUserNotFoundError = error.message?.toLowerCase().includes("user not found");
    const isAuthError = response.status === 401 || isUserNotFoundError;
    
    if (isAuthError && token) {
      // Try to refresh the session and retry the request once
      try {
        const refreshResult = await supabase.auth.refreshSession();
        if (refreshResult.data.session) {
          const newToken = refreshResult.data.session.access_token;
          // Update stored token
          await useAuthStore.getState().refreshSession();
          
          // Retry the request with new token
          const retryHeaders: HeadersInit = {
            "Content-Type": "application/json",
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          };
          
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            signal: options.signal,
          });
          
          const retryContentType = retryResponse.headers.get("content-type");
          const retryIsJson = retryContentType?.includes("application/json");
          
          if (retryIsJson) {
            const retryData: ApiResponse<T> = await retryResponse.json();
            if (retryResponse.ok && retryData.success) {
              return retryData.data as T;
            }
          }
        }
      } catch (refreshError) {
        // Refresh failed, continue with original error handling
        console.error("Session refresh failed:", refreshError);
      }
    }
    
    // Handle "User not found" errors silently for certain read endpoints
    const isReadEndpoint = endpoint.includes("/park-sessions/history") || endpoint.includes("/park-sessions?");
    
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


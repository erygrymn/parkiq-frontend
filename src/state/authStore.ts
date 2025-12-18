import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../services/supabase";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { apiGet, apiPatch } from "../services/api";

interface User {
  id: string;
  email: string | null;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  loadSessionFromSecureStore: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const TOKEN_KEY = "parkiq_session_token";
const USER_ID_KEY = "parkiq_user_id";
const USER_EMAIL_KEY = "parkiq_user_email";

// Get email redirect URL - works in both Expo Go (exp://) and dev/prod builds (parkiq://)
function getEmailRedirectUrl(): string {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  if (env === "development" || env === "local") {
    return Linking.createURL("auth/callback");
  }
  return "parkiq://auth/callback";
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sessionToken: null,
  loading: true,
  signInWithEmail: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle Supabase errors first
      if (error) {
        // Check if error is related to email confirmation
        if (error.message?.toLowerCase().includes("email not confirmed") || 
            error.message?.toLowerCase().includes("email_not_confirmed")) {
          throw new Error("EMAIL_NOT_CONFIRMED");
        }
        // Check if error is invalid credentials
        if (error.message?.toLowerCase().includes("invalid login") || 
            error.message?.toLowerCase().includes("invalid credentials") ||
            error.message?.toLowerCase().includes("invalid password") ||
            error.status === 400) {
          throw new Error("INVALID_CREDENTIALS");
        }
        // For other errors, throw the original error
        throw error;
      }
      
      if (!data.session) {
        // If no session but user exists, check if email is not confirmed
        if (data.user && !data.user.email_confirmed_at) {
          throw new Error("EMAIL_NOT_CONFIRMED");
        }
        throw new Error("No session returned");
      }
      
      // Check if email is confirmed
      if (!data.user.email_confirmed_at) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        throw new Error("EMAIL_NOT_CONFIRMED");
      }

      const token = data.session.access_token;
      const userId = data.user?.id;
      const userEmail = data.user?.email || null;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Verify that profile exists in database before allowing login
      // This is a security check - users without profiles should not be able to login
      // We temporarily set the token to check profile, then restore it
      const previousToken = useAuthStore.getState().sessionToken;
      try {
        // Temporarily set token for API call
        set({ sessionToken: token });
        
        // Check if profile exists
        try {
          await apiGet("/api/user/profile");
        } catch (profileError) {
          // Profile doesn't exist - check if there's pending profile data
          // This can happen if user registered but email confirmation was required
          const pendingProfileStr = await SecureStore.getItemAsync("parkiq_pending_profile");
          if (pendingProfileStr) {
            // Try to create profile with pending data
            try {
              const pendingProfile = JSON.parse(pendingProfileStr);
              await apiPatch("/api/user/profile", {
                firstName: pendingProfile.firstName || null,
                lastName: pendingProfile.lastName || null,
                phone: pendingProfile.phone || null,
                bloodType: pendingProfile.bloodType || null,
                licensePlate: pendingProfile.licensePlate || null,
              });
              // Remove pending profile data after successful creation
              await SecureStore.deleteItemAsync("parkiq_pending_profile");
            } catch (createError) {
              // Failed to create profile - reject login
              await supabase.auth.signOut();
              set({ sessionToken: previousToken });
              throw new Error("PROFILE_NOT_FOUND");
            }
          } else {
            // No pending profile data - reject login
            await supabase.auth.signOut();
            set({ sessionToken: previousToken });
            throw new Error("PROFILE_NOT_FOUND");
          }
        }
      } catch (profileError) {
        // If error is already PROFILE_NOT_FOUND, re-throw it
        if (profileError instanceof Error && profileError.message === "PROFILE_NOT_FOUND") {
          throw profileError;
        }
        // Other errors - reject login
        await supabase.auth.signOut();
        set({ sessionToken: previousToken });
        throw new Error("PROFILE_NOT_FOUND");
      }

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
      if (userEmail) {
        await SecureStore.setItemAsync(USER_EMAIL_KEY, userEmail);
      }

      set({
        user: { id: userId, email: userEmail },
        sessionToken: token,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  signUpWithEmail: async (email: string, password: string) => {
    set({ loading: true });
    try {
      // Set redirect URL for email confirmation - works in both Expo Go and production
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectUrl(),
        },
      });

      if (error) throw error;
      
      // If email confirmation is required, session might be null
      // In that case, we still save the user ID but don't set session
      if (data.session) {
      const token = data.session.access_token;
      const userId = data.user?.id;
      const userEmail = data.user?.email || null;

      if (!userId) {
        throw new Error("User ID not found");
      }

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
      if (userEmail) {
        await SecureStore.setItemAsync(USER_EMAIL_KEY, userEmail);
      }

      set({
        user: { id: userId, email: userEmail },
        sessionToken: token,
        loading: false,
      });
      } else {
        // Email confirmation required - don't set user state, just save email for reference
        const userEmail = data.user?.email || null;
        
        if (userEmail) {
          await SecureStore.setItemAsync(USER_EMAIL_KEY, userEmail);
        }

        // Don't set user state - user should stay on login screen
        set({
          user: null,
          sessionToken: null,
          loading: false,
        });
        
        // Return a special indicator that email confirmation is needed
        throw new Error("EMAIL_CONFIRMATION_REQUIRED");
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  signInWithApple: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: getEmailRedirectUrl(),
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      
      // OAuth URL will open in browser, deep link will handle callback
      // We'll listen for the deep link in RootNavigator
      if (data.url) {
        await Linking.openURL(data.url);
      }
      
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getEmailRedirectUrl(),
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      
      // OAuth URL will open in browser, deep link will handle callback
      if (data.url) {
        await Linking.openURL(data.url);
      }
      
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  signInWithFacebook: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: getEmailRedirectUrl(),
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      
      // OAuth URL will open in browser, deep link will handle callback
      if (data.url) {
        await Linking.openURL(data.url);
      }
      
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
    set({ user: null, sessionToken: null, loading: false });
  },
  loadSessionFromSecureStore: async () => {
    set({ loading: true });
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      const userEmail = await SecureStore.getItemAsync(USER_EMAIL_KEY);

      if (token && userId) {
        // Try to refresh the session first
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            // Session refreshed successfully
            const newToken = refreshData.session.access_token;
            await SecureStore.setItemAsync(TOKEN_KEY, newToken);
            set({
              user: { id: userId, email: userEmail },
              sessionToken: newToken,
              loading: false,
            });
            return;
          }
        } catch (refreshError) {
          // Refresh failed, try to get existing session
        }

        // If refresh failed, try to get existing session
        const { data, error } = await supabase.auth.getSession();
        if (!error && data.session) {
          set({
            user: { id: userId, email: userEmail },
            sessionToken: token,
            loading: false,
          });
        } else {
          // Session invalid, but keep user logged in with stored token
          // Only clear if token is completely invalid
          set({
            user: { id: userId, email: userEmail },
            sessionToken: token,
            loading: false,
          });
        }
      } else {
        set({ loading: false });
      }
    } catch (error) {
      // On error, try to restore from stored values
      try {
        const userId = await SecureStore.getItemAsync(USER_ID_KEY);
        const userEmail = await SecureStore.getItemAsync(USER_EMAIL_KEY);
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        
        if (userId && token) {
          set({
            user: { id: userId, email: userEmail },
            sessionToken: token,
            loading: false,
          });
        } else {
          set({ loading: false });
        }
      } catch {
        set({ loading: false });
      }
    }
  },
  refreshSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      const userEmail = await SecureStore.getItemAsync(USER_EMAIL_KEY);

      if (!token || !userId) {
        return false;
      }

      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshData.session) {
        // Session refreshed successfully
        const newToken = refreshData.session.access_token;
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        set({
          user: { id: userId, email: userEmail },
          sessionToken: newToken,
        });
        return true;
      }

      // If refresh failed, try to get existing session
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        const newToken = data.session.access_token;
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        set({
          user: { id: userId, email: userEmail },
          sessionToken: newToken,
        });
        return true;
      }

      // If both fail, but we have a stored token, keep using it
      // Don't logout the user - let them continue with the stored token
      return true;
    } catch (error) {
      console.error("Error refreshing session:", error);
      // On error, don't logout - keep using stored token
      return true;
    }
  },
}));


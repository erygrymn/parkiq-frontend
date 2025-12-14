import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../services/supabase";

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
  signOut: () => Promise<void>;
  loadSessionFromSecureStore: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const TOKEN_KEY = "parkiq_session_token";
const USER_ID_KEY = "parkiq_user_id";
const USER_EMAIL_KEY = "parkiq_user_email";

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

      if (error) throw error;
      if (!data.session) throw new Error("No session returned");

      const token = data.session.access_token;
      const userId = data.user.id;
      const userEmail = data.user.email;

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error("No session returned");

      const token = data.session.access_token;
      const userId = data.user.id;
      const userEmail = data.user.email;

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
  signInWithApple: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
      });

      if (error) throw error;
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


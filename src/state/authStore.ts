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
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session && data.session.user) {
        const token = data.session.access_token;
        const userId = data.session.user.id;
        const userEmail = data.session.user.email || null;

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
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_ID_KEY);
        await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
        set({ user: null, sessionToken: null, loading: false });
      }
    } catch (error) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
      set({ user: null, sessionToken: null, loading: false });
    }
  },
  refreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session && data.session.user) {
        const token = data.session.access_token;
        const userId = data.session.user.id;
        const userEmail = data.session.user.email || null;

        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_ID_KEY, userId);
        if (userEmail) {
          await SecureStore.setItemAsync(USER_EMAIL_KEY, userEmail);
        }

        set({
          user: { id: userId, email: userEmail },
          sessionToken: token,
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },
}));

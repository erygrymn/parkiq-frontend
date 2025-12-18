import { create } from "zustand";
import { supabase } from "../services/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  shouldShowResetPassword: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  setShouldShowResetPassword: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isHydrating: true,
  shouldShowResetPassword: false,

  hydrate: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      const user = session?.user ?? null;

      set({
        user,
        session,
        isAuthenticated: !!session,
        isHydrating: false,
      });
    } catch (error) {
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isHydrating: false,
      });
    }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    set({
      user: data.user,
      session: data.session,
      isAuthenticated: !!data.session,
    });
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "parkiq://auth/callback",
      },
    });

    if (error) throw error;

    if (data.session) {
      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
      });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  },

  sendPasswordReset: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "parkiq://auth/callback",
    });

    if (error) throw error;
  },

  setShouldShowResetPassword: (value: boolean) => {
    set({ shouldShowResetPassword: value });
  },
}));

supabase.auth.onAuthStateChange((event, session) => {
  const state = useAuthStore.getState();
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    state.hydrate();
  } else if (event === "SIGNED_OUT") {
    state.signOut();
  }
});

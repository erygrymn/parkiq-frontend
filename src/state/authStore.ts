import { create } from "zustand";
import { getSupabase } from "../services/supabase";
import { useConfigStore } from "./configStore";
import type { User, Session } from "@supabase/supabase-js";

type AuthMode = "anonymous" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  session: Session | null;
  authMode: AuthMode;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isHydrating: boolean;
  isEmailConfirmed: boolean;
  shouldShowResetPassword: boolean;
  shouldShowRegister: boolean;
  mustUpgradeAccount: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string, captchaToken?: string) => Promise<void>;
  setShouldShowResetPassword: (value: boolean) => void;
  setShouldShowRegister: (value: boolean) => void;
}

const determineAuthMode = (user: User | null, session: Session | null): AuthMode => {
  if (!session || !user) return "unauthenticated";
  if (user.email) return "authenticated";
  return "anonymous";
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  authMode: "unauthenticated",
  isAuthenticated: false,
  isAnonymous: false,
  isHydrating: true,
  isEmailConfirmed: false,
  shouldShowResetPassword: false,
  shouldShowRegister: false,
  mustUpgradeAccount: false,

  hydrate: async () => {
    try {
      await useConfigStore.getState().loadConfig();
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      const user = session?.user ?? null;
      const authMode = determineAuthMode(user, session);
      const isAuthenticated = authMode === "authenticated";
      const isAnonymous = authMode === "anonymous";
      const isEmailConfirmed = !!user?.email_confirmed_at;
      const mustUpgradeAccount = isAnonymous;

      set({
        user,
        session,
        authMode,
        isAuthenticated,
        isAnonymous,
        isEmailConfirmed,
        mustUpgradeAccount,
        isHydrating: false,
      });
    } catch (error) {
      set({
        user: null,
        session: null,
        authMode: "unauthenticated",
        isAuthenticated: false,
        isAnonymous: false,
        isEmailConfirmed: false,
        mustUpgradeAccount: false,
        isHydrating: false,
      });
    }
  },

  signIn: async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      const unconfirmedError = new Error("Please confirm your email before logging in.");
      (unconfirmedError as any).code = "EMAIL_NOT_CONFIRMED";
      throw unconfirmedError;
    }

    const authMode = determineAuthMode(data.user, data.session);
    const isAuthenticated = authMode === "authenticated";
    const isAnonymous = authMode === "anonymous";
    const isEmailConfirmed = !!data.user?.email_confirmed_at;
    const mustUpgradeAccount = isAnonymous;

    set({
      user: data.user,
      session: data.session,
      authMode,
      isAuthenticated,
      isAnonymous,
      isEmailConfirmed,
      mustUpgradeAccount,
    });
  },

  signUp: async (email: string, password: string, captchaToken?: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "parkiq://auth/callback",
        captchaToken,
      },
    });

    if (error) throw error;

    if (data.session) {
      const authMode = determineAuthMode(data.user, data.session);
      const isAuthenticated = authMode === "authenticated";
      const isAnonymous = authMode === "anonymous";
      const isEmailConfirmed = !!data.user?.email_confirmed_at;
      const mustUpgradeAccount = isAnonymous;

      set({
        user: data.user,
        session: data.session,
        authMode,
        isAuthenticated,
        isAnonymous,
        isEmailConfirmed,
        mustUpgradeAccount,
      });
    }
  },

  signInAnonymously: async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("Supabase anonymous sign-in error:", error);
      throw error;
    }

    if (!data.user || !data.session) {
      const missingDataError = new Error("Failed to create anonymous session");
      console.error("Anonymous sign-in missing data:", { user: data.user, session: data.session });
      throw missingDataError;
    }

    const authMode = determineAuthMode(data.user, data.session);
    const isAuthenticated = authMode === "authenticated";
    const isAnonymous = authMode === "anonymous";
    const isEmailConfirmed = false;
    const mustUpgradeAccount = isAnonymous;

    set({
      user: data.user,
      session: data.session,
      authMode,
      isAuthenticated,
      isAnonymous,
      isEmailConfirmed,
      mustUpgradeAccount,
    });
  },

  signOut: async () => {
    const supabase = getSupabase();
    const currentShouldShowRegister = get().shouldShowRegister;
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    }
    
    set({
      user: null,
      session: null,
      authMode: "unauthenticated",
      isAuthenticated: false,
      isAnonymous: false,
      isEmailConfirmed: false,
      mustUpgradeAccount: false,
      shouldShowResetPassword: false,
      shouldShowRegister: currentShouldShowRegister,
    });
  },

  sendPasswordReset: async (email: string, captchaToken?: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "parkiq://auth/callback",
      captchaToken,
    });

    if (error) throw error;
  },

  setShouldShowResetPassword: (value: boolean) => {
    set({ shouldShowResetPassword: value });
  },
  setShouldShowRegister: (value: boolean) => {
    set({ shouldShowRegister: value });
  },
}));

let authStateChangeListener: { data: { subscription: any } } | null = null;

useConfigStore.subscribe((state) => {
  if (state.isLoaded && !authStateChangeListener) {
    try {
      const supabase = getSupabase();
      authStateChangeListener = supabase.auth.onAuthStateChange((event, session) => {
        const authState = useAuthStore.getState();
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          authState.hydrate();
        } else if (event === "SIGNED_OUT") {
          authState.signOut();
        }
      });
    } catch (error) {
      console.error("Failed to set up auth state change listener:", error);
    }
  }
});

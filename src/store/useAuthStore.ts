import { create } from "zustand";

interface AuthState {
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string, email: string | null, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (userId, email, accessToken) =>
    set({
      userId,
      email,
      accessToken,
      isAuthenticated: true,
    }),
  clearAuth: () =>
    set({
      userId: null,
      email: null,
      accessToken: null,
      isAuthenticated: false,
    }),
}));


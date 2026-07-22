import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../state/settingsStore';
import { darkColors, lightColors, type ColorTokens } from './tokens';

// Tema tercihi tek kaynaktan gelir: settingsStore (cihazda kalıcı).
// Burada yalnız "tercih + sistem şeması → aktif palet" çözümü yapılır.

interface ThemeContextValue {
  colors: ColorTokens;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
    return { colors: scheme === 'dark' ? darkColors : lightColors, scheme };
  }, [themeMode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export { lightColors, darkColors, typeScale, spacing, radius, shadow, glass } from './tokens';
export type { ColorTokens, TypeToken, ShadowPair } from './tokens';

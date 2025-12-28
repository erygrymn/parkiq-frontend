/**
 * ParkIQ Tema Sistemi
 * Tek bir tema sistemi - tüm uygulama buradan tema alır
 */

import { useColorScheme } from "react-native";
import { designTokens } from "./tokens";
import { useSettingsStore } from "../store/useSettingsStore";

export type ThemeMode = "light" | "dark" | "system";

export interface Theme {
  colors: {
    bg: string;
    surface: string;
    surface2: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderStrong: string;
    accent: string;
    danger: string;
    // Glass morphism
    glassContainer: string;
    glassHighlight: string;
    glassShadow: string;
  };
  spacing: typeof designTokens.spacing;
  radii: typeof designTokens.radii;
  typography: typeof designTokens.typography;
  blur: typeof designTokens.blur;
  shadows: typeof designTokens.shadows;
  layout: typeof designTokens.layout;
  isDark: boolean;
}

function getResolvedTheme(
  mode: ThemeMode,
  systemColorScheme: string | null | undefined
): "light" | "dark" {
  if (mode === "system") {
    return systemColorScheme === "dark" ? "dark" : "light";
  }
  return mode;
}

export function useTheme(): Theme {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const resolved = getResolvedTheme(themeMode, systemColorScheme);
  const isDark = resolved === "dark";

  return {
    colors: designTokens.colors[resolved],
    spacing: designTokens.spacing,
    radii: designTokens.radii,
    typography: designTokens.typography,
    blur: designTokens.blur,
    shadows: designTokens.shadows,
    layout: designTokens.layout,
    isDark,
  };
}


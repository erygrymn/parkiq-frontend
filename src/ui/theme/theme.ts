import { useColorScheme } from "react-native";
import { tokens } from "./tokens";
import { useSettingsStore } from "../../store/useSettingsStore";

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
  };
  spacing: typeof tokens.spacing;
  radii: typeof tokens.radii;
  typography: typeof tokens.typography;
  isDark: boolean;
}

function getResolvedTheme(mode: ThemeMode, systemColorScheme: string | null | undefined): "light" | "dark" {
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
    colors: tokens.colors[resolved],
    spacing: tokens.spacing,
    radii: tokens.radii,
    typography: tokens.typography,
    isDark,
  };
}

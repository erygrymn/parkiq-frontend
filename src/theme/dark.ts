import type { Theme } from "./types";
import { designTokens } from "./tokens";

export const darkTheme: Theme = {
  colors: {
    primary: designTokens.colors.accentGreen,
    secondary: "#5E5CE6",
    background: designTokens.colors.backgroundDark,
    backgroundDark: designTokens.colors.backgroundDark,
    surface: designTokens.colors.surfaceDark,
    surfaceGlass: designTokens.colors.surfaceDark,
    surfaceGlassStrong: "rgba(28, 28, 30, 0.85)",
    text: designTokens.colors.textPrimaryDark,
    textPrimary: designTokens.colors.textPrimaryDark,
    textSecondary: designTokens.colors.textSecondaryDark,
    border: designTokens.colors.borderDark,
    separator: designTokens.colors.borderDark,
    error: designTokens.colors.danger,
    success: designTokens.colors.accentGreen,
    accentGreen: designTokens.colors.accentGreen,
  },
  spacing: designTokens.spacing,
  radii: {
    sm: designTokens.radii.card,
    md: designTokens.radii.card,
    lg: designTokens.radii.sheet,
  },
  blur: {
    soft: 20,
  },
  typography: {
    title: {
      fontSize: designTokens.typography.title,
      fontWeight: "700",
    },
    headline: {
      fontSize: designTokens.typography.headline,
      fontWeight: "600",
    },
    body: {
      fontSize: designTokens.typography.body,
      fontWeight: "400",
    },
    caption: {
      fontSize: designTokens.typography.caption,
      fontWeight: "400",
    },
  },
};


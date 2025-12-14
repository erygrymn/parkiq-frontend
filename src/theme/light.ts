import type { Theme } from "./types";
import { designTokens } from "./tokens";

export const lightTheme: Theme = {
  colors: {
    primary: designTokens.colors.accentGreen,
    secondary: "#5856D6",
    background: designTokens.colors.backgroundLight,
    backgroundDark: designTokens.colors.backgroundDark,
    surface: designTokens.colors.surfaceLight,
    surfaceGlass: designTokens.colors.surfaceLight,
    surfaceGlassStrong: "rgba(255, 255, 255, 0.90)",
    text: designTokens.colors.textPrimaryLight,
    textPrimary: designTokens.colors.textPrimaryLight,
    textSecondary: designTokens.colors.textSecondaryLight,
    border: designTokens.colors.borderLight,
    separator: designTokens.colors.borderLight,
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


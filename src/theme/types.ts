import { designTokens } from "./tokens";

export type Theme = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    backgroundDark: string;
    surface: string;
    surfaceGlass: string;
    surfaceGlassStrong: string;
    text: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    separator: string;
    error: string;
    success: string;
    accentGreen: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
  };
  blur: {
    soft: number;
  };
  typography: {
    title: {
      fontSize: number;
      fontWeight: string;
    };
    headline: {
      fontSize: number;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
    };
  };
};


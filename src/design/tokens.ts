/**
 * ParkIQ Tasarım Token'ları
 * Tüm tasarım değerleri burada tanımlanır
 */

export const designTokens = {
  colors: {
    light: {
      bg: "#F5F6FA",
      surface: "#FFFFFF",
      surface2: "#F0F2F7",
      textPrimary: "#0B0C10",
      textSecondary: "rgba(11,12,16,0.62)",
      textTertiary: "rgba(11,12,16,0.42)",
      border: "rgba(11,12,16,0.10)",
      borderStrong: "rgba(11,12,16,0.18)",
      accent: "#34C759",
      danger: "#FF3B30",
      // Glass morphism için özel renkler
      glassContainer: "rgba(255,255,255,0.78)",
      glassHighlight: "rgba(255,255,255,0.55)",
      glassShadow: "rgba(0,0,0,0.18)",
    },
    dark: {
      bg: "#0B0C10",
      surface: "#14151A",
      surface2: "#1B1D24",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(255,255,255,0.70)",
      textTertiary: "rgba(255,255,255,0.48)",
      border: "rgba(255,255,255,0.10)",
      borderStrong: "rgba(255,255,255,0.16)",
      accent: "#30D158",
      danger: "#FF453A",
      // Glass morphism için özel renkler
      glassContainer: "rgba(20,21,26,0.78)",
      glassHighlight: "rgba(255,255,255,0.10)",
      glassShadow: "rgba(0,0,0,0.45)",
    },
  },
  spacing: {
    s4: 4,
    s8: 8,
    s12: 12,
    s16: 16,
    s20: 20,
    s24: 24,
    s32: 32,
  },
  radii: {
    r12: 12,
    r16: 16,
    r20: 20,
    r26: 26,
  },
  typography: {
    navTitle: {
      fontSize: 17,
      fontWeight: "600" as const,
      letterSpacing: 0,
      lineHeight: 22,
    },
    title: {
      fontSize: 24,
      fontWeight: "700" as const,
      letterSpacing: -0.2,
      lineHeight: 30,
    },
    section: {
      fontSize: 13,
      fontWeight: "600" as const,
      letterSpacing: 0.2,
      lineHeight: 18,
    },
    body: {
      fontSize: 16,
      fontWeight: "400" as const,
      lineHeight: 22,
    },
    sub: {
      fontSize: 14,
      fontWeight: "400" as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: "500" as const,
      lineHeight: 16,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      lineHeight: 14,
    },
    timer: {
      fontSize: 52,
      fontWeight: "700" as const,
      letterSpacing: -0.5,
      lineHeight: 56,
    },
  },
  blur: {
    intensity: {
      soft: 20,
      medium: 45,
      strong: 80,
    },
  },
  shadows: {
    ios: {
      light: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
      },
      dark: {
        shadowColor: "#000",
        shadowOpacity: 0.40,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 16 },
      },
    },
    android: {
      light: {
        elevation: 6,
      },
      dark: {
        elevation: 8,
      },
    },
  },
  layout: {
    tabBarHeight: 74,
    headerBarHeight: 56,
  },
} as const;


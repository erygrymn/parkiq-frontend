import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { lightTheme } from "./light";
import { darkTheme } from "./dark";
import type { Theme } from "./types";
import { useSettingsStore } from "../store/useSettingsStore";

const ThemeContext = createContext<Theme>(lightTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((state) => state.themeMode);

  const theme = useMemo(() => {
    if (themeMode === "system") {
      return systemColorScheme === "dark" ? darkTheme : lightTheme;
    }
    return themeMode === "dark" ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);
  if (!context) {
    return lightTheme;
  }
  return context;
};


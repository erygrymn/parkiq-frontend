import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "../../state/authStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useTheme } from "../../ui/theme/theme";
import { setLocale } from "../../localization";
import { AuthPlaceholderScreen } from "../../screens/Auth/AuthPlaceholderScreen";
import { MainNavigator } from "./MainNavigator";
import { SplashScreen } from "../../ui/components/SplashScreen";
import { OnboardingScreen, hasSeenOnboarding } from "../../screens/Onboarding/OnboardingScreen";
import { loadConfigFromBackend } from "../../env";

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const loadSessionFromSecureStore = useAuthStore(
    (state) => state.loadSessionFromSecureStore
  );
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadConfigFromBackend();
        setConfigLoaded(true);
      } catch (error) {
        console.error("Failed to load config from backend, using defaults:", error);
        setConfigLoaded(true);
      }
      
      await loadSessionFromSecureStore();
      await loadSettings();
      
      const hasSeen = await hasSeenOnboarding();
      setShowOnboarding(!hasSeen);
    };
    initialize();
  }, [loadSessionFromSecureStore, loadSettings]);

  useEffect(() => {
    setLocale(language);
  }, [language]);

  if (loading || showOnboarding === null || !configLoaded) {
    return (
      <>
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <SplashScreen />
      </>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <NavigationContainer>
        {user ? <MainNavigator /> : <AuthPlaceholderScreen />}
      </NavigationContainer>
    </>
  );
};

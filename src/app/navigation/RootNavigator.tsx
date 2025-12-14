import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "../../state/authStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useTheme } from "../../ui/theme/theme";
import { setLocale } from "../../localization";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { SplashScreen } from "../../ui/components/SplashScreen";
import { OnboardingScreen, hasSeenOnboarding } from "../../screens/Onboarding/OnboardingScreen";

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const loadSessionFromSecureStore = useAuthStore(
    (state) => state.loadSessionFromSecureStore
  );
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    const initialize = async () => {
      await loadSessionFromSecureStore();
      await loadSettings();
      
      // Check onboarding status
      const hasSeen = await hasSeenOnboarding();
      setShowOnboarding(!hasSeen);
    };
    initialize();
  }, [loadSessionFromSecureStore, loadSettings]);

  useEffect(() => {
    setLocale(language);
  }, [language]);

  // Periodically refresh session to prevent timeout (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error("Failed to refresh session:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also refresh immediately when user logs in
    refreshSession();

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, refreshSession]);

  if (loading || showOnboarding === null) {
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
        {user ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </>
  );
};

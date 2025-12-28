import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "../../state/authStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useTheme } from "../../ui/theme/theme";
import { setLocale } from "../../localization";
import { MainNavigator } from "./MainNavigator";
import { SplashScreen } from "../../ui/components/SplashScreen";
import { OnboardingScreen, hasSeenOnboarding } from "../../screens/Onboarding/OnboardingScreen";
import { useConfigStore } from "../../state/configStore";

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    const initialize = async () => {
      try {
        await useConfigStore.getState().loadConfig();
        setConfigLoaded(true);
      } catch (error) {
        console.error("Failed to load config from backend:", error);
        setConfigLoaded(true);
      }
      
      await hydrate();
      await loadSettings();
      
      const hasSeen = await hasSeenOnboarding();
      setShowOnboarding(!hasSeen);
    };
    initialize();
  }, [hydrate, loadSettings]);

  useEffect(() => {
    setLocale(language);
  }, [language]);

  if (isHydrating || showOnboarding === null || !configLoaded) {
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
          <MainNavigator />
      </NavigationContainer>
    </>
  );
};

import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { useAuthStore } from "../../state/authStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useTheme } from "../../ui/theme/theme";
import { setLocale } from "../../localization";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { SplashScreen } from "../../ui/components/SplashScreen";
import { OnboardingScreen, hasSeenOnboarding } from "../../screens/Onboarding/OnboardingScreen";
import { loadConfigFromBackend } from "../../env";
import { supabase } from "../../services/supabase";

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
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

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const parsedUrl = Linking.parse(url);
        let path = parsedUrl.path || "";

        if (path.startsWith("/--/")) {
          path = path.substring(3);
        }

        if (!path.includes("auth/callback")) {
          return;
        }

        const queryParams = parsedUrl.queryParams as any || {};
        
        let hashParams: any = {};
        if (url.includes("#")) {
          const hashPart = url.split("#")[1];
          const hashPairs = hashPart.split("&");
          hashPairs.forEach((pair) => {
            const [key, value] = pair.split("=");
            if (key && value) {
              hashParams[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
        }

        const params = { ...queryParams, ...hashParams };

        if (params.error || params.error_description) {
          const errorMsg = params.error_description || params.error || "Authentication failed";
          Alert.alert("Authentication Error", errorMsg);
          return;
        }

        const isPasswordReset = params.type === "recovery" || url.includes("type=recovery");

        if (params.code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          
          if (error) {
            Alert.alert("Error", "Link expired or invalid. Please try again.");
            return;
          }

          if (data.session) {
            if (isPasswordReset) {
              useAuthStore.getState().setShouldShowResetPassword(true);
            }
            await hydrate();
          }
        } else if (params.access_token && params.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (error) {
            Alert.alert("Error", "Link expired or invalid. Please try again.");
            return;
          }

          if (data.session) {
            if (isPasswordReset) {
              useAuthStore.getState().setShouldShowResetPassword(true);
            }
            await hydrate();
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (isPasswordReset) {
              useAuthStore.getState().setShouldShowResetPassword(true);
            }
            await hydrate();
          }
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
        Alert.alert("Error", "Link expired or invalid. Please try again.");
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [hydrate]);

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
        {isAuthenticated && !useAuthStore.getState().shouldShowResetPassword ? (
          <MainNavigator />
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
    </>
  );
};

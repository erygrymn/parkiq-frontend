import React, { useEffect, useState, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
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
import { apiGet } from "../../services/api";
import * as SecureStore from "expo-secure-store";

interface UserProfile {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bloodType?: string | null;
  licensePlate?: string | null;
}

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const navigationRef = useRef<any>(null);
  const profileCheckedRef = useRef<string | null>(null);
  const loadSessionFromSecureStore = useAuthStore(
    (state) => state.loadSessionFromSecureStore
  );
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Load config from backend first
        await loadConfigFromBackend();
        setConfigLoaded(true);
      } catch (error) {
        console.error("Failed to load config from backend, using defaults:", error);
        // Continue with defaults if config load fails
        setConfigLoaded(true);
      }
      
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

  // Handle OAuth deep linking
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const parsedUrl = Linking.parse(url);
        if (parsedUrl.path === "/auth/callback") {
          // Extract tokens from URL hash
          const hashParams = parsedUrl.queryParams as any;
          if (hashParams?.access_token && hashParams?.refresh_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: hashParams.access_token,
              refresh_token: hashParams.refresh_token,
            });
            
            if (!sessionError && sessionData.session) {
              const token = sessionData.session.access_token;
              const userId = sessionData.user.id;
              const userEmail = sessionData.user.email;
              
              await SecureStore.setItemAsync("parkiq_session_token", token);
              await SecureStore.setItemAsync("parkiq_user_id", userId);
              if (userEmail) {
                await SecureStore.setItemAsync("parkiq_user_email", userEmail);
              }
              
              // Reload session to update auth store
              await loadSessionFromSecureStore();
            }
          }
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
      }
    };

    // Handle initial URL (if app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [loadSessionFromSecureStore]);

  // Check profile completion when user logs in (only once per user)
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setProfileComplete(null);
        profileCheckedRef.current = null;
        return;
      }

      // Skip if we already checked this user
      if (profileCheckedRef.current === user.id) {
        return;
      }

      setCheckingProfile(true);
      try {
        const profile = await apiGet<UserProfile>("/api/user/profile");
        
        // Check if required fields are present
        const isComplete = !!(profile?.firstName && profile?.lastName);
        setProfileComplete(isComplete);
        profileCheckedRef.current = user.id;
        
        // Navigate to CompleteProfile if incomplete
        // Note: User is logged in, so we navigate within MainNavigator
        if (!isComplete && navigationRef.current) {
          // Use requestAnimationFrame to ensure navigation is ready
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (navigationRef.current) {
                try {
                  navigationRef.current.navigate("Profile", { screen: "CompleteProfile" });
                } catch (navError) {
                  // Navigation might not be ready yet, ignore
                  console.warn("Navigation not ready:", navError);
                }
              }
            }, 1000);
          });
        }
      } catch (error) {
        // Handle errors gracefully - profile will be created automatically by backend
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isUserNotFound = errorMessage.toLowerCase().includes("user not found");
        const is404 = errorMessage.includes("404");
        const isFailedToFetch = errorMessage.toLowerCase().includes("failed to fetch profile");
        
        // Only log unexpected errors
        if (!is404 && !isUserNotFound && !isFailedToFetch) {
          console.error("Error checking profile:", error);
        }
        
        // Assume incomplete and navigate to CompleteProfile
        // The backend will create the profile automatically when accessed
        setProfileComplete(false);
        profileCheckedRef.current = user.id; // Mark as checked to prevent retry loops
        
        // Navigate to CompleteProfile if it's not a 404 (endpoint doesn't exist)
        // Note: User is logged in, so we navigate within MainNavigator
        if (!is404 && navigationRef.current) {
          // Use requestAnimationFrame to ensure navigation is ready
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (navigationRef.current) {
                try {
                  navigationRef.current.navigate("Profile", { screen: "CompleteProfile" });
                } catch (navError) {
                  // Navigation might not be ready yet, ignore
                  console.warn("Navigation not ready:", navError);
                }
              }
            }, 1000);
          });
        }
      } finally {
        setCheckingProfile(false);
      }
    };

    if (user && !loading) {
      checkProfileCompletion();
    }
  }, [user, loading]);

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

  if (loading || showOnboarding === null || !configLoaded || (user && checkingProfile)) {
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
      <NavigationContainer ref={navigationRef}>
        {user ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </>
  );
};

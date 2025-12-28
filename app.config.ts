import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Get backend URL from environment variable or use default
  // For local development, set EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
  // For production, it will use the default Vercel URL
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "parkiq-ten.vercel.app";

  return {
    ...config,
    name: "ParkIQ",
    slug: "parkiq",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.parkiq.app",
      infoPlist: {
        NSUserNotificationUsageDescription:
          "Notifications are used to remind you before your parking time expires.",
        NSLocationWhenInUseUsageDescription:
          "We use your location to save where you parked your vehicle.",
        NSCameraUsageDescription:
          "Camera access is used to take a photo of your parking location.",
      },
    },
    android: {
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],
    },
    scheme: "parkiq",
    extra: {
      eas: {
        projectId: "00000000-0000-0000-0000-000000000000",
      },
      backendUrl,
    },
  };
};

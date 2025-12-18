import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
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
    },
  };
};

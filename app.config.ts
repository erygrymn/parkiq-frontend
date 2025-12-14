import { ExpoConfig, ConfigContext } from "expo/config";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envLocalPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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
      config: {
        googleMapsApiKey: googleMapsKey,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "ParkIQ needs your location to show nearby parking spots and start parking sessions.",
        NSLocationAlwaysUsageDescription:
          "ParkIQ needs your location to track parking sessions.",
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
      APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || "",
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "",
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      EXPO_PUBLIC_REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "",
    },
  };
};

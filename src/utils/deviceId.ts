import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "parkiq_device_id";

/**
 * Gets or creates a unique device ID for this device
 * Uses expo-application's installation ID as the base, which is unique per app installation
 */
export async function getDeviceId(): Promise<string> {
  try {
    // First, try to get stored device ID
    const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (storedId) {
      return storedId;
    }

    // If not found, generate a new one using installation ID
    // Installation ID is unique per app installation and persists across app updates
    const installationId = Application.getInstallationIdSync();
    
    if (!installationId) {
      throw new Error("Failed to get device installation ID");
    }

    // Store it for future use
    await AsyncStorage.setItem(DEVICE_ID_KEY, installationId);
    
    return installationId;
  } catch (error) {
    console.error("Error getting device ID:", error);
    // Fallback: generate a random UUID if everything fails
    const fallbackId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, fallbackId);
    return fallbackId;
  }
}


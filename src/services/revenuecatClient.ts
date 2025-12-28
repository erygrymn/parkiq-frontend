import Purchases from "react-native-purchases";
import { useConfigStore } from "../state/configStore";
import { useAuthStore } from "../state/authStore";

let isConfigured = false;

async function configureIfNeeded() {
  if (isConfigured) return;
  await useConfigStore.getState().loadConfig();
  const config = useConfigStore.getState();
  const apiKey = "";
  if (!apiKey) {
    console.warn("RevenueCat API key not configured");
    return;
  }
  await Purchases.configure({ apiKey });
  const deviceId = useAuthStore.getState().deviceId;
  if (deviceId) {
    await Purchases.logIn(deviceId);
  }
  isConfigured = true;
}

export async function getCurrentStatus(): Promise<"free" | "premium"> {
  await configureIfNeeded();
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active["premium"] ? "premium" : "free";
}

export async function purchasePremium(): Promise<void> {
  await configureIfNeeded();
  const offerings = await Purchases.getOfferings();
  if (offerings.current) {
    const packageToPurchase = offerings.current.availablePackages[0];
    if (packageToPurchase) {
      await Purchases.purchasePackage(packageToPurchase);
    }
  }
}

export async function restorePurchases(): Promise<void> {
  await configureIfNeeded();
  await Purchases.restorePurchases();
}


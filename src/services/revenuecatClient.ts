import Purchases from "react-native-purchases";
import { useAuthStore } from "@/store/useAuthStore";

let isConfigured = false;

async function configureIfNeeded() {
  if (isConfigured) return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "";
  await Purchases.configure({ apiKey });
  const userId = useAuthStore.getState().userId;
  if (userId) {
    await Purchases.logIn(userId);
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


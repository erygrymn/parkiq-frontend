import * as Location from "expo-location";

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
}> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error("Location permission not granted");
  }
  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}


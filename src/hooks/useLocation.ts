import * as Location from "expo-location";
import { useState, useEffect } from "react";

interface LocationData {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Permission to access location was denied");
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get location");
        setLoading(false);
      }
    })();
  }, []);

  return { location, error, loading };
}

export async function getCurrentLocation(): Promise<LocationData> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission to access location was denied");
  }

  const loc = await Location.getCurrentPositionAsync({});
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
}


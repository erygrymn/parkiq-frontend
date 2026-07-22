import * as Location from 'expo-location';

// Konum + ters geocoding. Geocoder cihazın native'i (key'siz) — CLAUDE.md kuralı.
// Konum kaydı "2 saniye kuralı"nı bloklamaz: park kaydı anında biter, buradan
// dönen sonuç oturuma sonradan işlenir (§7.3).

export interface CapturedPlace {
  latitude: number;
  longitude: number;
  /** Ters geocoding sonucu; başarısızsa null — UI koordinatı asla ham göstermez. */
  placeName: string | null;
  /** Yatay doğruluk (metre); bilinmiyorsa null. Kapalı otopark sezgisi buradan. */
  accuracyM: number | null;
}

export type LocationOutcome =
  | { status: 'ok'; place: CapturedPlace }
  | { status: 'denied' }
  | { status: 'unavailable' };

/** iOS reverse geocode alanlarından okunabilir tek ad seçer. */
function pickPlaceName(result: Location.LocationGeocodedAddress | undefined): string | null {
  if (!result) return null;
  const candidate = result.name ?? result.street ?? result.district ?? result.city ?? result.region;
  if (!candidate) return null;
  // Bazı cihazlar name alanına ham koordinat/kod düşürüyor; sayı yığınını ad sayma.
  return /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(candidate) ? candidate : null;
}

export async function captureCurrentPlace(): Promise<LocationOutcome> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return { status: 'denied' };

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    let placeName: string | null = null;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      placeName = pickPlaceName(results[0]);
    } catch {
      placeName = null;
    }

    return {
      status: 'ok',
      place: {
        latitude,
        longitude,
        placeName,
        accuracyM: position.coords.accuracy ?? null,
      },
    };
  } catch {
    return { status: 'unavailable' };
  }
}

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

/**
 * Kaç konum örneği alınır ve en fazla ne kadar beklenir.
 *
 * İlk GPS düzeltmesi genelde en kötüsüdür: alıcı daha uydu topluyordur ve
 * otopark girişi tam da sinyalin bozulduğu yerdir. Birkaç saniye içinde gelen
 * örneklerin EN İYİSİ (en küçük yatay hata) seçilir — ortalama almak, kötü bir
 * örneği iyisine karıştırıp ikisini de bozar.
 *
 * "2 saniye kuralı" korunur: park kaydı bunu BEKLEMEZ, konum arkadan işlenir.
 */
const SAMPLE_COUNT = 4;
const SAMPLE_BUDGET_MS = 5000;

/** Ard arda gelen düzeltmelerden en doğrusunu seçer. */
async function bestFix(): Promise<Location.LocationObject> {
  const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

  return new Promise((resolve) => {
    let best = first;
    let subscription: Location.LocationSubscription | null = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      subscription?.remove();
      resolve(best);
    };

    const timer = setTimeout(finish, SAMPLE_BUDGET_MS);
    let seen = 1;

    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 800, distanceInterval: 0 },
      (position) => {
        const current = position.coords.accuracy;
        const known = best.coords.accuracy;
        if (current != null && (known == null || current < known)) best = position;
        seen += 1;
        if (seen >= SAMPLE_COUNT) {
          clearTimeout(timer);
          finish();
        }
      },
    ).then((sub) => {
      if (settled) sub.remove();
      else subscription = sub;
    });
  });
}

export async function captureCurrentPlace(): Promise<LocationOutcome> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return { status: 'denied' };

    const position = await bestFix();
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

/**
 * Haritadan seçilen bir noktanın adını çözer. Koordinat kullanıcıya asla ham
 * gösterilmez; ad bulunamazsa null döner ve yüzeyler onu boş bırakır.
 */
export async function describeCoords(coords: {
  latitude: number;
  longitude: number;
}): Promise<CapturedPlace> {
  let placeName: string | null = null;
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    placeName = pickPlaceName(results[0]);
  } catch {
    placeName = null;
  }
  return { ...coords, placeName, accuracyM: null };
}

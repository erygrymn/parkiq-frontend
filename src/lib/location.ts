import * as Location from 'expo-location';
import { AppState } from 'react-native';

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

/** Düzeltmenin ÖLÇÜLDÜĞÜ an bu aralıkta değilse kullanılmaz (ms, epoch). */
export interface FixWindow {
  fromMs: number;
  toMs: number;
}

/**
 * Park kaydının konum penceresi: dokunmadan biraz önce ile biraz sonrası arası.
 *
 * Pencere yokken iki yanlış "araba burada" diye kaydediliyordu: (1) telefon konum düzeltmesi
 * gelmeden kilitlenirse iOS isteği bekletip öne dönüşte teslim ediyor — saatler sonra ofiste
 * ölçülen nokta arabanın yeri oluyordu; (2) iOS önbellekteki eski bir düzeltmeyi (hâlâ
 * araçtayken, yüzlerce metre geride) "en doğru örnek" diye verebiliyordu. 30 sn yürüyüş
 * ≈ 40 m: bundan sonrası arabanın değil kullanıcının yeridir.
 */
export function parkFixWindow(tappedAtMs: number): FixWindow {
  return { fromMs: tappedAtMs - 15_000, toMs: tappedAtMs + 30_000 };
}

/** Ard arda gelen düzeltmelerden en doğrusunu seçer; pencerede hiç düzeltme yoksa null. */
async function bestFix(window?: FixWindow): Promise<Location.LocationObject | null> {
  const inWindow = (position: Location.LocationObject) =>
    !window || (position.timestamp >= window.fromMs && position.timestamp <= window.toMs);
  const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

  return new Promise((resolve) => {
    let best: Location.LocationObject | null = inWindow(first) ? first : null;
    let subscription: Location.LocationSubscription | null = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      appState.remove();
      subscription?.remove();
      resolve(best);
    };

    const timer = setTimeout(finish, SAMPLE_BUDGET_MS);
    // Arka plana geçince örnekleme biter: o ana kadarki en iyisi yazılır, sonrası beklenmez.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') finish();
    });
    let seen = 1;

    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 800, distanceInterval: 0 },
      (position) => {
        if (!inWindow(position)) {
          // Pencere kapandı: kullanıcı arabadan uzaklaşıyor olabilir.
          if (window && position.timestamp > window.toMs) finish();
          return;
        }
        const current = position.coords.accuracy;
        const known = best?.coords.accuracy;
        if (best === null || (current != null && (known == null || current < known))) best = position;
        seen += 1;
        if (seen >= SAMPLE_COUNT) finish();
      },
    )
      .then((sub) => {
        if (settled) sub.remove();
        else subscription = sub;
      })
      .catch(() => finish());
  });
}

/** Koordinatın okunur adı; çözülemezse null (UI koordinatı asla ham göstermez). */
export async function placeNameAt(coords: { latitude: number; longitude: number }): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    return pickPlaceName(results[0]);
  } catch {
    return null;
  }
}

/**
 * `window`: ölçüm anı bu aralıkta olmayan düzeltme kullanılmaz (bkz. parkFixWindow).
 * `withName: false`: ad çözülmez — park kaydı koordinatı geocoder'ı beklemeden yazar.
 */
export async function captureCurrentPlace(
  options: { window?: FixWindow; withName?: boolean } = {},
): Promise<LocationOutcome> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return { status: 'denied' };

    const position = await bestFix(options.window);
    if (!position) return { status: 'unavailable' };
    const { latitude, longitude } = position.coords;
    const placeName = options.withName === false ? null : await placeNameAt({ latitude, longitude });

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
 * İzin ZATEN verilmişse kabaca nerede olunduğu — yakındaki otoparkları sormak için.
 *
 * Keşif paneli her açılışında tam park kaydı yakalaması yapıyordu: beş saniyeye kadar en
 * yüksek doğrulukta GPS + ters geocoding (Apple bunu uygulama başına kısıtlıyor) ve izin
 * sorulmamışsa sistem penceresi. Burada izin sorulmaz, ad çözülmez.
 */
export async function roughPosition(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 });
    const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
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
  return { ...coords, placeName: await placeNameAt(coords), accuracyM: null };
}

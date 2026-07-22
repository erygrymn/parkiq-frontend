// Konum matematiği — saf, test edilebilir. Find My Car pusulası ve mesafe
// göstergesi buradan beslenir; AR katmanı (ar-find-my-car.md) da aynı formülleri
// kullanacak, ikinci bir kopya yazılmaz.

export interface Coords {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** İki nokta arası mesafe (metre) — haversine. */
export function distanceMeters(from: Coords, to: Coords): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Kuzeyden saat yönünde derece (0–360): `from` noktasından `to` noktasına yön. */
export function bearingDegrees(from: Coords, to: Coords): number {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLng = toRad(to.longitude - from.longitude);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Pusula okunun ekranda dönmesi gereken açı: hedefin yönü eksi cihazın baktığı yön.
 * Kullanıcı arabaya dönük olduğunda 0 döner (ok yukarıyı gösterir).
 */
export function relativeBearing(targetBearing: number, deviceHeading: number): number {
  return ((targetBearing - deviceHeading) % 360 + 360) % 360;
}

/** "87 m" / "1,2 km" — mesafe metni; yakında metre, uzakta km. */
export function formatDistance(meters: number, locale: string = 'en'): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const text = km.toFixed(1);
  return `${locale === 'tr' ? text.replace('.', ',') : text} km`;
}

/**
 * Kapalı otopark sezgisi: GPS doğruluğu kötüyse pusula yanıltır — o durumda
 * foto/kat kartına düşülür (§7.6). Eşik 35 m: açık alanda tipik doğruluk 5–15 m.
 */
export const INDOOR_ACCURACY_THRESHOLD_M = 35;

export function isIndoorLike(accuracyMeters: number | null): boolean {
  return accuracyMeters === null || accuracyMeters > INDOOR_ACCURACY_THRESHOLD_M;
}

/** Yakın mesafe: pusula hassasiyeti burada anlamsızlaşır, "etrafına bak" moduna geçilir. */
export const NEAR_DISTANCE_M = 20;

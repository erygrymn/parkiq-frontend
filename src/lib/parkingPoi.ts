import { distanceMeters, type Coords } from './geo';

// Otopark + şarj istasyonu verisi: OpenStreetMap Overpass API.
// Ücretsiz, anahtarsız (CLAUDE.md: Google API yasak). Sunucumuza uğramaz.

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
/** Yarıçap seçenekleri (metre) — filtre popup'ındaki mesafe kademesi. */
export const RADIUS_OPTIONS = [500, 1000, 2000, 5000] as const;
export const DEFAULT_RADIUS_M = 1000;
const MAX_RESULTS = 40;

export type PoiKind = 'parking' | 'charging';

export interface ParkingPoi {
  id: string;
  kind: PoiKind;
  name: string | null;
  latitude: number;
  longitude: number;
  /** Kapalı otopark mı (multi-storey / underground). Bilinmiyorsa null. */
  covered: boolean | null;
  /** Otoparkın kendi şarj ünitesi var mı (OSM etiketinden). Bilinmiyorsa false. */
  hasCharging: boolean;
  /** Kullanıcıya uzaklık (metre) — sorgu merkezine göre hesaplanır. */
  distanceM: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildQuery(center: Coords, radiusM: number): string {
  const around = `${radiusM},${center.latitude},${center.longitude}`;
  // nwr = node/way/relation; out center → alanların merkez noktasını verir.
  return `[out:json][timeout:20];
(
  nwr[amenity=parking][access!=private](around:${around});
  nwr[amenity=charging_station](around:${around});
);
out center ${MAX_RESULTS * 3};`;
}

function coordsOf(element: OverpassElement): Coords | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.center) return { latitude: element.center.lat, longitude: element.center.lon };
  return null;
}

/** OSM `parking` etiketinden kapalılık çıkarımı; bilinmiyorsa null bırakılır. */
function coveredOf(tags: Record<string, string>): boolean | null {
  const parking = tags.parking;
  if (tags.covered === 'yes' || parking === 'multi-storey' || parking === 'underground') return true;
  if (tags.covered === 'no' || parking === 'surface' || parking === 'street_side' || parking === 'lane') {
    return false;
  }
  return null;
}

/**
 * Otoparkın kendi şarj ünitesi. OSM'de tek bir standart yok: bazı otoparklar
 * `capacity:charging`, bazıları `socket:*` ya da düz `charging_station=yes`
 * taşır. Hiçbiri yoksa false — "bilinmiyor" ile "yok" arasında ayrım yapmak
 * kullanıcıya bir şey kazandırmaz, ikisi de "ikon gösterme" demektir.
 */
function chargingOf(tags: Record<string, string>): boolean {
  if (tags['capacity:charging']) return true;
  if (tags.charging_station === 'yes' || tags['charging_station:output']) return true;
  return Object.keys(tags).some((key) => key.startsWith('socket:'));
}

export function parseOverpass(json: unknown, center: Coords): ParkingPoi[] {
  // Overpass yoğunken null/HTML/bozuk gövde dönebilir; erişimden ÖNCE doğrula.
  if (typeof json !== 'object' || json === null) return [];
  const raw = (json as { elements?: unknown }).elements;
  if (!Array.isArray(raw)) return [];
  const elements = raw as OverpassElement[];
  const seen = new Set<string>();
  const results: ParkingPoi[] = [];

  for (const element of elements) {
    const coords = coordsOf(element);
    if (!coords) continue;
    const tags = element.tags ?? {};
    const kind: PoiKind = tags.amenity === 'charging_station' ? 'charging' : 'parking';

    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    results.push({
      id,
      kind,
      name: tags.name ?? tags.operator ?? null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      covered: kind === 'parking' ? coveredOf(tags) : null,
      hasCharging: kind === 'charging' || chargingOf(tags),
      distanceM: distanceMeters(center, coords),
    });
  }

  return results.sort((a, b) => a.distanceM - b.distanceM).slice(0, MAX_RESULTS);
}

export async function fetchNearbyParking(
  center: Coords,
  radiusM: number = DEFAULT_RADIUS_M,
  signal?: AbortSignal,
): Promise<ParkingPoi[] | null> {
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: buildQuery(center, radiusM),
      signal,
    });
    if (!response.ok) return null;
    return parseOverpass(await response.json(), center);
  } catch {
    // Overpass yoğunken 429/504 dönebilir; harita boş kalır, app çalışmaya devam eder.
    return null;
  }
}

export type PoiFilter = 'all' | 'charging' | 'covered';

/**
 * Tür + MESAFE süzgeci.
 *
 * Yarıçap istemcide de uygulanır: sorgu yenilenene kadar elde eski (daha geniş)
 * sonuçlar durur ve kullanıcı "500 m" seçmişken 1,1 km'lik yer görüyordu.
 * Gösterilen liste her zaman seçili ayara uyar.
 */
export function applyFilter(
  pois: ParkingPoi[],
  filter: PoiFilter,
  radiusM?: number,
): ParkingPoi[] {
  let out = pois;
  if (filter === 'charging') out = out.filter((p) => p.kind === 'charging');
  else if (filter === 'covered') out = out.filter((p) => p.kind === 'parking' && p.covered === true);
  if (radiusM != null) out = out.filter((p) => p.distanceM <= radiusM);
  return out;
}

/** Yürüme süresi tahmini — 80 m/dk (şehir içi ortalama). */
export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 80));
}

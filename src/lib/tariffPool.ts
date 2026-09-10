import { TWICE_KEY } from '../config';
import { distanceMeters, type Coords } from './geo';
import type { ParkingPoi } from './parkingPoi';
import type { Tariff } from './tariffMath';

/**
 * Tarife havuzu — sürücülerin girdiği otopark fiyatları, twicehub panelinde birikir.
 *
 * Park başlatılırken elde bir tarife varsa havuza yollanır; aynı otoparka park eden
 * bir başkasına o otoparkın en çok girilmiş tarifesi ÖNERİ olarak döner. Veri yoksa
 * öneri de yoktur — uydurma fiyat göstermek hiç göstermemekten kötüdür.
 *
 * Giden gövdede kullanıcı ya da oturum kimliği YOK. Biriken şey bir yerin fiyatı,
 * kimin nereye park ettiği değil. Tek kimlik `submitter`: otopark başına türetilmiş
 * kısa bir özet, sunucunun aynı kişiyi iki kez saymaması için. Otoparka bağlı olduğu
 * için iki farklı otoparktaki gönderim aynı kişiye bağlanamaz.
 */

const ENDPOINT = 'https://api.twiceapps.co/v1/sdk/parkiq/tariff';

/** Kaydedilen konumla otoparkı eşleştirme yarıçapı. */
const SPOT_MATCH_M = 80;

/** Ağ sessizce beklemez: park akışı hiçbir koşulda bunu beklemez. */
const TIMEOUT_MS = 6000;

export type TariffSource = 'manual' | 'ocr' | 'pool';

export interface PooledTariff {
  tariff: Tariff;
  /** Kaç sürücü bu tarifeyi girdi — kullanıcıya dürüstçe yazılır. */
  count: number;
}

/**
 * Otoparkın kimliği.
 *
 * OpenStreetMap kimliği (`osm:way/123`) tercih edilir: aynı isimde onlarca otopark
 * var, isimle gruplamak hepsini birbirine karıştırırdı. Eşleşme yoksa kaba bir
 * koordinat hücresine düşülür (3 ondalık ≈ 110 m) — sokak parkı için yeterince
 * dar, GPS gürültüsünü yutacak kadar geniş.
 */
export function resolveSpotId(coords: Coords, pois: ParkingPoi[]): { id: string; name: string | null } {
  let best: ParkingPoi | null = null;
  let bestDistance = SPOT_MATCH_M;
  for (const poi of pois) {
    if (poi.kind !== 'parking') continue;
    const d = distanceMeters(coords, { latitude: poi.latitude, longitude: poi.longitude });
    if (d <= bestDistance) {
      best = poi;
      bestDistance = d;
    }
  }
  if (best) return { id: `osm:${best.id}`, name: best.name };
  return { id: `geo:${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`, name: null };
}

/**
 * Kurulum tuzu — cihazdan HİÇ çıkmaz, yalnız otopark özeti türetmekte kullanılır.
 * Depolama çağıran tarafın işi (SQLite `settings`), burası saf kalır.
 */
export function makeInstallSalt(): string {
  let out = '';
  for (let i = 0; i < 4; i += 1) out += Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return out;
}

/**
 * 64 bitlik özet. Kriptografik güç gerekmiyor: tuz zaten gizli ve değer yalnız
 * "bu gönderim aynı kurulumdan mı geldi" sorusunu cevaplıyor. 32 bit, kalabalık
 * otoparklarda farklı kurulumları aynı sayacak kadar dar olurdu.
 */
export function submitterHash(salt: string, spotId: string): string {
  const input = `${salt}|${spotId}`;
  let h1 = 0x9e3779b1;
  let h2 = 0x85ebca6b;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ((c << 3) | (c >>> 5)), 0x85ebca6b) >>> 0;
    h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0;
    h2 = ((h2 << 7) | (h2 >>> 25)) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

async function call(path: string, init: RequestInit): Promise<unknown | null> {
  if (TWICE_KEY.length === 0) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-App-Key': TWICE_KEY, ...(init.headers ?? {}) },
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    // Havuz bir konfor katmanı: ağ yoksa park akışı hiç değişmeden sürer.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Bu otoparkın, bu para birimindeki en çok girilmiş tarifesi. Yoksa null. */
export async function fetchPooledTariff(spotId: string, currency: string): Promise<PooledTariff | null> {
  const query = `${ENDPOINT}?spot=${encodeURIComponent(spotId)}&currency=${encodeURIComponent(currency)}`;
  const json = (await call(query, { method: 'GET' })) as { tariff?: Tariff | null; count?: number } | null;
  if (!json || !json.tariff) return null;
  return { tariff: json.tariff, count: typeof json.count === 'number' ? json.count : 1 };
}

/** Park başlarken elde bir tarife varsa havuza yollanır. Sonuç beklenmez. */
export async function submitTariff(input: {
  spotId: string;
  name: string | null;
  coords: Coords;
  tariff: Tariff;
  source: TariffSource;
  submitter: string;
}): Promise<void> {
  await call(ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      spot: input.spotId,
      name: input.name,
      lat: input.coords.latitude,
      lng: input.coords.longitude,
      tariff: input.tariff,
      source: input.source,
      submitter: input.submitter,
    }),
  });
}

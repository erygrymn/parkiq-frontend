import { Platform, Share } from 'react-native';
import { APP_STORE_URL, BACKEND_BASE_URL, PLAY_STORE_URL } from '../config';
import type { ParkSession } from '../state/sessionStore';
import { getStoreUrl, trackLocationShared } from './analytics';

// Konum paylaşımı — ürünün ana organik büyüme döngüsü.
// GİZLİLİK KURALI (CLAUDE.md): veri linkin HASH parçasında taşınır (#...).
// Tarayıcılar hash'i sunucuya GÖNDERMEZ; yani konum Vercel'e, loglara veya
// herhangi bir veritabanına asla ulaşmaz. Sunucu yalnız statik sayfayı verir.

export interface SharePayload {
  /** latitude */
  a: number;
  /** longitude */
  o: number;
  /** place name */
  n?: string;
  /** floor */
  f?: string;
  /** paylaşım anı (epoch ms) — sayfa linki 24 saat sonra pasifleştirir */
  t: number;
  /**
   * Mağaza linki. Sayfanın CTA'sı bunu kullanır; böylece App ID ya da kampanya
   * etiketi backend'i yeniden dağıtmadan, panelden değiştirilebilir.
   * Sayfa tarafında beyaz listeden geçer — href'e ham veri konmaz.
   */
  s?: string;
}

function toBase64Url(input: string): string {
  // RN'de Buffer yok; global btoa UTF-8 taşımaz → önce yüzde kodlamadan geçir.
  const binary = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = globalThis.atob(padded);
  let percent = '';
  for (let i = 0; i < binary.length; i++) {
    percent += `%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(percent);
}

export function encodeSharePayload(payload: SharePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as SharePayload;
    if (!Number.isFinite(parsed.a) || !Number.isFinite(parsed.o)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(session: ParkSession): string | null {
  if (session.latitude === null || session.longitude === null) return null;
  const payload: SharePayload = {
    // Koordinatı 5 haneye yuvarla (~1m): link kısalır, hassasiyet yeter.
    a: Number(session.latitude.toFixed(5)),
    o: Number(session.longitude.toFixed(5)),
    // Süre PAYLAŞIMDAN sayılır: park anından saymak, ikinci gününde paylaşılan bir havalimanı
    // parkının linkini alıcıya "süresi dolmuş" gösteriyordu.
    t: Date.now(),
  };
  if (session.placeName) payload.n = session.placeName;
  if (session.floor) payload.f = session.floor;
  payload.s = getStoreUrl(
    Platform.OS === 'android' ? 'android' : 'ios',
    Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL,
  );
  return `${BACKEND_BASE_URL}/s#${encodeSharePayload(payload)}`;
}

export async function shareParkedLocation(session: ParkSession, message: string): Promise<void> {
  const url = buildShareUrl(session);
  if (!url) return;
  try {
    /* TEK öğe: link metnin İÇİNDE. iOS'ta metin ve ayrı bir URL öğesi birlikte verilince
       WhatsApp ikisini birden gönderemiyordu — sohbet seçilip "Gönder"e basılıyor ve hiçbir
       şey gitmiyordu. Metindeki linki her uygulama tanır, önizlemesini de kendisi çıkarır.
       Android zaten yalnız metni gönderiyordu. */
    const result = await Share.share({ message: `${message}\n${url}` });
    // Ana viral döngü: yalnız GERÇEKTEN paylaşılan sayılır. Kapatılan sayfa da sayılıyordu.
    if (result.action === Share.sharedAction) trackLocationShared();
  } catch {
    // Kullanıcı paylaşım sayfasını kapattıysa sessizce geç.
  }
}

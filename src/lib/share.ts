import { Share } from 'react-native';
import { BACKEND_BASE_URL } from '../config';
import type { ParkSession } from '../state/sessionStore';

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
  /** parked at (epoch ms) */
  t: number;
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
    t: session.startedAtMs,
  };
  if (session.placeName) payload.n = session.placeName;
  if (session.floor) payload.f = session.floor;
  return `${BACKEND_BASE_URL}/s#${encodeSharePayload(payload)}`;
}

export async function shareParkedLocation(session: ParkSession, message: string): Promise<void> {
  const url = buildShareUrl(session);
  if (!url) return;
  try {
    await Share.share({ message: `${message} ${url}`, url });
  } catch {
    // Kullanıcı paylaşım sayfasını kapattıysa sessizce geç.
  }
}

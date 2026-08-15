import { Linking, Platform } from 'react-native';
import type { ParkSession } from '../state/sessionStore';

// Sistem haritasına devir — "Find My Car" ve geçmiş detayı aynı yolu kullanır.
// Gömülü harita Mapbox ile geldiğinde bu, yürüyüş tarifi için ikincil çıkış olur.

export function openInMaps(session: ParkSession, options?: { directions?: boolean }): void {
  if (session.latitude === null || session.longitude === null) return;
  openCoordsInMaps(
    { latitude: session.latitude, longitude: session.longitude },
    session.placeName,
    options,
  );
}

/**
 * Serbest koordinat için aynı devir (keşifteki otopark kartı kullanır).
 *
 * `directions` gerçekten rotayı başlatır. Apple Maps `dirflg`'i yalnız `daddr`
 * ile birlikte dikkate alır — `ll` + `dirflg` sadece pin bırakıyordu, yani
 * "Yol tarifi" düğmesi yol tarifi vermiyor, kullanıcıyı iki dokunuş daha
 * uzağa bırakıyordu.
 */
export function openCoordsInMaps(
  coords: { latitude: number; longitude: number },
  label: string | null,
  options?: { directions?: boolean },
): void {
  const name = encodeURIComponent(label ?? 'ParkIQ');
  const pair = `${coords.latitude},${coords.longitude}`;
  const ios = options?.directions
    ? `maps://?daddr=${pair}&dirflg=w`
    : `maps://?ll=${pair}&q=${name}`;
  const url = Platform.OS === 'ios' ? ios : `geo:${pair}?q=${pair}(${name})`;
  void Linking.openURL(url);
}

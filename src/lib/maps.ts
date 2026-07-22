import { Linking, Platform } from 'react-native';
import type { ParkSession } from '../state/sessionStore';

// Sistem haritasına devir — "Find My Car" ve geçmiş detayı aynı yolu kullanır.
// Gömülü harita Mapbox ile geldiğinde bu, yürüyüş tarifi için ikincil çıkış olur.

export function openInMaps(session: ParkSession): void {
  if (session.latitude === null || session.longitude === null) return;
  openCoordsInMaps({ latitude: session.latitude, longitude: session.longitude }, session.placeName);
}

/** Serbest koordinat için aynı devir (keşifteki otopark kartı kullanır). */
export function openCoordsInMaps(
  coords: { latitude: number; longitude: number },
  label: string | null,
): void {
  const name = encodeURIComponent(label ?? 'ParkIQ');
  const pair = `${coords.latitude},${coords.longitude}`;
  const url =
    Platform.OS === 'ios'
      ? `maps://?ll=${pair}&q=${name}&dirflg=w`
      : `geo:${pair}?q=${pair}(${name})`;
  void Linking.openURL(url);
}

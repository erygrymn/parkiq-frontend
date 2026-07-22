import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

// design.md §7 mimari: Root'ta asla unmount olmayan harita canvas'ı.
//
// Mapbox native modül gerektirir ve Expo Go'da ÇALIŞMAZ (sabit kabuk, modül
// içinde derlenmemiş). Bu yüzden gerçek harita yalnız native build'de require
// edilir; Expo Go'da §6 zemin rengiyle boş canvas kalır ve app çökmez.
// Mac'te `npx expo run:ios` ile build alındığı an harita kendiliğinden gelir.

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let MapboxCanvas: ComponentType | null = null;
if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MapboxCanvas = (require('./MapboxCanvas') as typeof import('./MapboxCanvas')).MapboxCanvas;
  } catch {
    MapboxCanvas = null; // native modül yoksa sessizce boş canvas'a düş
  }
}

export function MapCanvas() {
  const { colors } = useTheme();
  if (MapboxCanvas) return <MapboxCanvas />;
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.mapCanvas }]} />;
}

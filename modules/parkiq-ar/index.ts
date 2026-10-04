import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import type * as React from 'react';
import type { ViewProps } from 'react-native';

// ARKit köprüsü. Native modül yalnız `expo run:ios` build'inde vardır;
// Expo Go'da yüklenmez ve AR butonu hiç gösterilmez.

/**
 * `cameraDenied` / `unsupported` / `failed` son durumlardır: AR bir daha kendiliğinden
 * başlamaz, RN haritaya döner ve sebebi panelde söyler (§7.7).
 */
export type ArStatus = 'initializing' | 'ready' | 'near' | 'limited' | 'failed' | 'unsupported' | 'cameraDenied';

export interface ArStatusEvent {
  state: ArStatus;
  /** Sistem koçluk katmanı ekranda mı — açıkken HUD gizlenir. */
  coaching?: boolean;
}

export interface ArTargetEvent {
  /** Hedefin görünüm koordinatlarında izdüşümü (pt). Ekran dışındaysa kenarın ötesinde bir nokta. */
  x: number;
  y: number;
  onScreen: boolean;
  /** AR dünyasında kameradan hedefe yatay mesafe — GPS'ten türeyen sayıdan daha sakin. */
  distanceM: number;
  near: boolean;
  /** Hedefin kullanıcının baktığı yöne göre açısı (derece, −180…180, pozitif = sağda). */
  relativeDeg: number;
}

/** Arabanın kayıtlı yeri. Değeri olmayan alan GÖNDERİLMEZ (native sözlük null almaz). */
export interface ArCar {
  latitude: number;
  longitude: number;
  /** Kayıt anındaki GPS doğruluğu (m): yakındaki belirsizlik halkasının payı. */
  accuracy?: number;
}

/** Kullanıcının GPS düzeltmesi. Değeri olmayan alan GÖNDERİLMEZ (native sözlük null almaz). */
export interface ArUserFix {
  latitude: number;
  longitude: number;
  /** Yatay doğruluk (m): füzyonda ağırlık. */
  accuracy?: number;
  /** Ölçüm anı (ms, epoch): kameranın o andaki yeriyle eşlenir. */
  timestamp?: number;
}

export interface ParkiqArViewProps extends ViewProps {
  /** Arabanın koordinatı — monolitin dikildiği nokta. */
  car: ArCar;
  /** Kullanıcının son GPS düzeltmesi; her düzeltme hedef tahminine bir örnek olarak girer. */
  user: ArUserFix | null;
  onStatus?: (event: { nativeEvent: ArStatusEvent }) => void;
  /** ≤6 Hz; kenar göstergesi, mesafe ve yön cümlesi için. */
  onTarget?: (event: { nativeEvent: ArTargetEvent }) => void;
}

interface NativeArModule {
  isSupported(): boolean;
}

let native: NativeArModule | null = null;
try {
  native = requireNativeModule<NativeArModule>('ParkiqAr');
} catch {
  native = null;
}

/** Cihaz ARKit dünya takibini destekliyor mu (A9+). */
export const isArAvailable: boolean = native !== null && (native?.isSupported() ?? false);

export const ParkiqArView: React.ComponentType<ParkiqArViewProps> | null = native
  ? requireNativeViewManager<ParkiqArViewProps>('ParkiqAr')
  : null;

import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import type * as React from 'react';
import type { ViewProps } from 'react-native';

// ARKit köprüsü. Native modül yalnız `expo run:ios` build'inde vardır;
// Expo Go'da yüklenmez ve AR butonu hiç gösterilmez.

export type ArStatus = 'initializing' | 'ready' | 'near' | 'limited' | 'failed' | 'unsupported';

export interface ArTargetEvent {
  /** Hedefin görünüm koordinatlarında izdüşümü (pt). Ekran dışındaysa kenarın ötesinde bir nokta. */
  x: number;
  y: number;
  onScreen: boolean;
  distanceM: number;
  near: boolean;
}

export interface ParkiqArViewProps extends ViewProps {
  /** Arabanın koordinatı — monolitin dikildiği nokta. */
  car: { latitude: number; longitude: number };
  /** Kullanıcının son GPS düzeltmesi; hedef her düzeltmede yeniden bağlanır. */
  user: { latitude: number; longitude: number } | null;
  onStatus?: (event: { nativeEvent: { state: ArStatus; message?: string } }) => void;
  /** ≤6 Hz; kenar göstergesi için. */
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

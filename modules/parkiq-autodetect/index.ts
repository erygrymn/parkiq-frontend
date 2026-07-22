import { requireNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';

// §7.4b oto-algılama köprüsü (premium). Expo Go'da yok → hepsi no-op.

export interface CarEvent {
  deviceName: string;
}

interface NativeAutoDetect {
  isSupported(): boolean;
  isConnectedToCar(): boolean;
  start(): void;
  stop(): void;
  addListener(event: 'onCarDisconnected' | 'onCarConnected', listener: (payload: CarEvent) => void): EventSubscription;
}

let native: NativeAutoDetect | null = null;
try {
  native = requireNativeModule<NativeAutoDetect>('ParkiqAutoDetect');
} catch {
  native = null;
}

export const isAutoDetectAvailable = native !== null;

export function isConnectedToCar(): boolean {
  try {
    return native?.isConnectedToCar() ?? false;
  } catch {
    return false;
  }
}

export function startAutoDetect(onDisconnected: (payload: CarEvent) => void): () => void {
  if (!native) return () => undefined;
  try {
    const subscription = native.addListener('onCarDisconnected', onDisconnected);
    native.start();
    return () => {
      subscription.remove();
      native?.stop();
    };
  } catch {
    return () => undefined;
  }
}

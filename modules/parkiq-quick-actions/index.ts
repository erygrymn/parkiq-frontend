import { requireNativeModule } from 'expo-modules-core';

// Ana ekran kısayolları köprüsü. Native modül yalnız iOS build'inde vardır; başka her yerde
// (Android, Expo Go, testler) bütün çağrılar sessizce hiçbir şey yapmaz.

export type QuickActionType = 'park' | 'find';

export interface QuickActionItem {
  type: QuickActionType;
  /** Dile çevrilmiş başlık. */
  title: string;
  /** SF Symbol adı. */
  symbol: string;
}

interface NativeQuickActions {
  takePending(): string | null;
  setItems(items: QuickActionItem[]): void;
  addListener(event: 'onAction', listener: (event: { type: string }) => void): { remove: () => void };
}

let native: NativeQuickActions | null = null;
try {
  native = requireNativeModule<NativeQuickActions>('ParkiqQuickActions');
} catch {
  native = null;
}

function asType(value: string | null | undefined): QuickActionType | null {
  return value === 'park' || value === 'find' ? value : null;
}

export function setQuickActions(items: QuickActionItem[]): void {
  try {
    native?.setItems(items);
  } catch {
    /* kısayol kurulamazsa uygulama aynen çalışır */
  }
}

/** Uygulamayı kısayolla açan eylem — yalnız bir kez döner. */
export function takePendingQuickAction(): QuickActionType | null {
  try {
    return asType(native?.takePending());
  } catch {
    return null;
  }
}

export function addQuickActionListener(listener: (type: QuickActionType) => void): () => void {
  if (!native) return () => undefined;
  try {
    const subscription = native.addListener('onAction', (event) => {
      const type = asType(event.type);
      if (type) listener(type);
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}

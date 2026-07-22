import { requireNativeModule } from 'expo-modules-core';

// Cihaz üstü OCR köprüsü. Native modül yalnız `expo run:ios` build'inde var;
// Expo Go'da yükleme başarısız olur → çağıran taraf null alır ve elle girişe düşer.

interface ParkiqOcrNativeModule {
  recognizeText(uri: string): Promise<string[]>;
}

let nativeModule: ParkiqOcrNativeModule | null = null;
try {
  nativeModule = requireNativeModule<ParkiqOcrNativeModule>('ParkiqOcr');
} catch {
  nativeModule = null;
}

export const isOcrAvailable = nativeModule !== null;

/** Görseldeki metin satırlarını döner; modül yoksa null. */
export async function recognizeText(uri: string): Promise<string[] | null> {
  if (!nativeModule) return null;
  try {
    return await nativeModule.recognizeText(uri);
  } catch {
    return null;
  }
}

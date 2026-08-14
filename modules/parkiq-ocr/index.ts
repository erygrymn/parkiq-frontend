import { requireNativeModule } from 'expo-modules-core';

// Cihaz üstü OCR köprüsü. Native modül yalnız `expo run:ios` build'inde var;
// Expo Go'da yükleme başarısız olur → çağıran taraf null alır ve elle girişe düşer.

/**
 * Tanınan tek bir metin bloğu. Koordinatlar 0–1 normalize, origin SOL-ALT
 * (Vision'ın kendi uzayı): `y` büyüdükçe yukarı çıkar.
 */
export interface OcrBlock {
  text: string;
  /** Bloğun sol kenarı — satır içi sıralama (sütun sırası) için. */
  x: number;
  /** Bloğun dikey ORTASI — satır gruplama için. */
  y: number;
  /** Blok yüksekliği — satır toleransı buradan türer. */
  height: number;
}

interface ParkiqOcrNativeModule {
  recognizeText(uri: string): Promise<OcrBlock[]>;
}

let nativeModule: ParkiqOcrNativeModule | null = null;
try {
  nativeModule = requireNativeModule<ParkiqOcrNativeModule>('ParkiqOcr');
} catch {
  nativeModule = null;
}

export const isOcrAvailable = nativeModule !== null;

/** Görseldeki metin bloklarını konumlarıyla döner; modül yoksa null. */
export async function recognizeText(uri: string): Promise<OcrBlock[] | null> {
  if (!nativeModule) return null;
  try {
    return await nativeModule.recognizeText(uri);
  } catch {
    return null;
  }
}

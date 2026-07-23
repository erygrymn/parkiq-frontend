import { en, type CopyKey } from './en';
import { tr } from './tr';

export type Locale = 'en' | 'tr';

const dictionaries: Record<Locale, Record<CopyKey, string>> = { en, tr };

// Cihaz dili algısı expo-localization eklendiğinde bağlanacak (screens.md §10 dil ayarı).
let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Dil-duyarlı büyük harf. RN'in `textTransform: 'uppercase'`'i dilden habersizdir:
 * Türkçe "i"yi "İ" yerine "I" yapar ("Tarife" → "TARIFE"). Büyük harfe çevrilen her
 * yüzey buradan geçer — ileride eklenecek diller de doğru davransın diye.
 */
export function upper(text: string): string {
  return text.toLocaleUpperCase(currentLocale === 'tr' ? 'tr-TR' : 'en-US');
}

export function t(key: CopyKey, params?: Record<string, string | number>): string {
  let text: string = dictionaries[currentLocale][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export type { CopyKey };

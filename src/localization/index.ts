import { en, type CopyKey } from './en';
import { tr } from './tr';
import { enGB } from './en-GB';
import { enAU } from './en-AU';
import { enCA } from './en-CA';

// Diller iki biçimde tutulur:
//  - TAM sözlük: dilin kendi dosyası, her anahtar dolu.
//  - ÜST KATMAN (overlay): yalnız taban dilinden AYRILAN anahtarlar.
//
// Overlay kalıbı bilinçli. en-GB'nin en-US'ten farkı bir avuç kelime ("car park",
// "multi storey", ceza = "fine"); dört ayrı tam kopya tutmak, sonraki her metin
// değişikliğinde üçünün sessizce eskimesi demekti. Aynısı fr-CA, es-MX ve pt-PT
// için de geçerli.

export type Locale = 'en' | 'en-GB' | 'en-AU' | 'en-CA' | 'tr';

export const LOCALES: readonly Locale[] = ['en', 'en-GB', 'en-AU', 'en-CA', 'tr'];

/** Dil seçicide görünen adlar — her zaman KENDİ dilinde yazılır. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English (US)',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'en-CA': 'English (Canada)',
  tr: 'Türkçe',
};

type Dictionary = Record<CopyKey, string>;
type Overlay = Partial<Dictionary>;

const BASE: Record<string, Dictionary> = {
  en,
  tr,
};

/** Üst katmanlar: [taban dil, yalnız farklı anahtarlar]. */
const OVERLAYS: Record<string, [string, Overlay]> = {
  'en-GB': ['en', enGB],
  'en-AU': ['en', enAU],
  'en-CA': ['en', enCA],
};

function build(locale: Locale): Dictionary {
  const overlay = OVERLAYS[locale];
  if (overlay) {
    const [baseKey, diff] = overlay;
    return { ...BASE[baseKey], ...diff };
  }
  return BASE[locale] ?? en;
}

const dictionaries = LOCALES.reduce<Record<Locale, Dictionary>>(
  (acc, locale) => {
    acc[locale] = build(locale);
    return acc;
  },
  {} as Record<Locale, Dictionary>,
);

let currentLocale: Locale = 'en';

/**
 * Cihazın dil etiketini desteklediğimiz bir dile eşler.
 *
 * Sıra önemli: önce tam eşleşme (pt-BR), sonra aynı dilin bölgesel karşılığı
 * (pt-MZ → pt-BR), sonra dilin kendisi. Hiçbiri tutmazsa İngilizce.
 */
export function resolveLocale(tag: string | null | undefined): Locale {
  if (!tag) return 'en';
  const normalized = tag.replace('_', '-');
  const exact = LOCALES.find((l) => l.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact;

  const language = normalized.split('-')[0].toLowerCase();
  const region = normalized.split('-')[1]?.toUpperCase();

  // Bölgesi olan diller: bölge tutmazsa dilin ana varyantına düş.
  const regional = LOCALES.find(
    (l) => l.toLowerCase().startsWith(`${language}-`) && l.split('-')[1]?.toUpperCase() === region,
  );
  if (regional) return regional;

  const bare = LOCALES.find((l) => l.toLowerCase() === language);
  if (bare) return bare;

  const anyRegion = LOCALES.find((l) => l.toLowerCase().startsWith(`${language}-`));
  return anyRegion ?? 'en';
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Intl'e verilecek BCP-47 etiketi ('en' → 'en-US'). */
export function localeTag(locale: Locale = currentLocale): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'tr') return 'tr-TR';
  return locale;
}

/**
 * Dil-duyarlı büyük harf. RN'in `textTransform: 'uppercase'`'i dilden habersizdir:
 * Türkçe "i"yi "İ" yerine "I" yapar ("Tarife" → "TARIFE"). Büyük harfe çevrilen her
 * yüzey buradan geçer.
 */
export function upper(text: string): string {
  return text.toLocaleUpperCase(localeTag());
}

export function t(key: CopyKey, params?: Record<string, string | number>): string {
  // Bir anahtar bir dilde eksikse İngilizceye düşülür: yarım çeviri, boş ekran
  // ya da anahtar adının kullanıcıya görünmesinden iyidir.
  let text: string = dictionaries[currentLocale][key] ?? en[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export type { CopyKey };

import { sanitizeTiers, type Tariff, type TariffTier } from './tariffMath';

// Tarife panosu metnini (cihaz üstü OCR çıktısı) tarife modeline çevirir.
// Saf fonksiyon — OCR'dan bağımsız test edilir.
//
// KÜMÜLATİF KURALI: çıktı fiyatları "o dilimde çıkarsan ödeyeceğin TOPLAM"dır
// (design.md §5.9). Pano artımlı yazıyorsa ("her ilave saat +30") burada toplama
// çevrilir; yoksa tüm dilim matematiği ve "şimdi çık ₺X" kopyası yanlış olur.

const CURRENCY_PATTERNS: Array<{ match: RegExp; code: string }> = [
  { match: /₺|\bTL\b|\bTRY\b|\bLİRA\b|\bLIRA\b/i, code: 'TRY' },
  { match: /€|\bEUR\b|\bEURO\b/i, code: 'EUR' },
  { match: /£|\bGBP\b|\bPOUND\b/i, code: 'GBP' },
  { match: /\$|\bUSD\b|\bDOLLAR\b/i, code: 'USD' },
];

const DIACRITICS: Record<string, string> = {
  İ: 'I', I: 'I', Ü: 'U', Ö: 'O', Ç: 'C', Ş: 'S', Ğ: 'G',
  ı: 'i', ü: 'u', ö: 'o', ç: 'c', ş: 's', ğ: 'g',
};

/**
 * Aksanları ASCII'ye katlayıp büyütür — kalıplar tek biçimle yazılabilsin
 * ("GÜNLÜK" → "GUNLUK", "DAKİKA" → "DAKIKA").
 */
function normalize(line: string): string {
  return line
    .replace(/[İIÜÖÇŞĞıüöçşğ]/g, (ch) => DIACRITICS[ch] ?? ch)
    .toUpperCase()
    .replace(/[،,]/g, '.') // OCR virgülü ondalık ayırıcı olarak dönebilir
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCurrency(lines: string[]): string | null {
  const joined = lines.join(' ');
  for (const { match, code } of CURRENCY_PATTERNS) {
    if (match.test(joined)) return code;
  }
  return null;
}

/** Satırdaki son sayıyı fiyat olarak alır (pano düzeni: "0-1 SAAT ... 50 TL"). */
function lastNumber(line: string): number | null {
  const matches = line.match(/\d+(?:[.,]\d{1,2})?/g);
  if (!matches || matches.length === 0) return null;
  const value = Number(matches[matches.length - 1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Çoğul ekine dayanıklı birim kalıbı: HOUR/HOURS/HR/HRS, MIN/MINS/MINUTE(S). */
const UNIT = 'SAAT|HOURS?|HRS?|DAKIKA|MINUTES?|MINS?|DK|SA';

const HOUR_WORD = /(SAAT|HOURS?|HRS?|SA\b)/;
const MINUTE_WORD = /(DAKIKA|MINUTES?|MINS?|DK\b)/;
const EXTRA_WORD = /(ILAVE|EK\b|SONRAKI|EKSTRA|ADDITIONAL|EXTRA|EACH|HER)/;
const FLAT_WORD = /(GUNLUK|SABIT|FLAT|ALL DAY|DAILY|GECELIK|24 SAAT)/;
/** AVM otoparklarında çok yaygın: ilk dilim bedava. Fiyatı 0'dır, sayı okunmaz. */
const FREE_WORD = /(UCRETSIZ|BEDAVA|PARASIZ|FREE|NO CHARGE)/;

const DAY_MINUTES = 24 * 60;

interface BracketLine {
  endMin: number;
  price: number;
}

/**
 * "0-1 SAAT 50" / "1-2 SAAT 100" / "1. SAAT 50" / "İLK 2 SAAT 80" gibi
 * dilim satırlarını yakalar. endMin = dilimin BİTİŞİ (dakika).
 */
function parseBracket(line: string): BracketLine | null {
  // "0-1 SAAT ÜCRETSİZ" → fiyat 0. Sayı aramak yanlış olur: satırdaki tek sayı
  // dilim sınırıdır ("1") ve fiyat sanılırsa kullanıcıya ₺1 denir.
  const price = FREE_WORD.test(line) ? 0 : lastNumber(line);
  if (price === null) return null;

  const isMinutes = MINUTE_WORD.test(line) && !HOUR_WORD.test(line);
  const unitMin = isMinutes ? 1 : 60;

  // "0-1 SAAT" / "1-2 SAAT" / "0–1 HOUR" → aralığın üst sınırı
  const range = line.match(new RegExp(`(\\d+)\\s*[-–—]\\s*(\\d+)\\s*(?=\\D*(?:${UNIT})\\b)`));
  if (range) {
    const upper = Number(range[2]);
    if (Number.isFinite(upper) && upper > 0) return { endMin: upper * unitMin, price };
  }

  // "1. SAAT" / "2.SAAT" (sıra sayısı = o saatin sonu)
  const ordinal = line.match(/(\d+)\s*\.\s*(SAAT|HOURS?|SA\b)/);
  if (ordinal) {
    const nth = Number(ordinal[1]);
    if (Number.isFinite(nth) && nth > 0) return { endMin: nth * unitMin, price };
  }

  // "İLK 2 SAAT 80" / "FIRST 2 HOURS 80" / "30 DAKIKA 20"
  const leading = line.match(new RegExp(`(?:ILK|FIRST)?\\s*(\\d+)\\s*(${UNIT})\\b`));
  if (leading && !EXTRA_WORD.test(line)) {
    const amount = Number(leading[1]);
    const unit = /DAKIKA|MIN|DK/.test(leading[2]) ? 1 : 60;
    if (Number.isFinite(amount) && amount > 0) return { endMin: amount * unit, price };
  }

  return null;
}

/** "HER İLAVE SAAT 30" / "EACH ADDITIONAL HOUR 3" → saat başı ek ücret. */
function parseExtraPerHour(line: string): number | null {
  if (!EXTRA_WORD.test(line) || !HOUR_WORD.test(line)) return null;
  return lastNumber(line);
}

/** "SAATLİK 40" / "PER HOUR 4" / "40 TL/SAAT" → saat başı tek ücret. */
function parsePerHour(line: string): number | null {
  const perHour = /(SAATLIK|PER HOUR|\/\s*SAAT|\/\s*HOUR|\/\s*HR|HOURLY)/.test(line);
  if (!perHour || EXTRA_WORD.test(line)) return null;
  return lastNumber(line);
}

export interface ParseResult {
  tariff: Tariff;
  /** Kullanıcıya "kontrol et" demek için: kaç satırdan üretildi. */
  matchedLines: number;
}

export function parseTariffLines(lines: string[], fallbackCurrency: string): ParseResult | null {
  const normalized = lines.map(normalize).filter((line) => line.length > 0);
  if (normalized.length === 0) return null;

  const currency = detectCurrency(normalized) ?? fallbackCurrency;

  const brackets: BracketLine[] = [];
  let extraPerHour: number | null = null;
  let perHour: number | null = null;
  let flat: number | null = null;
  let matchedLines = 0;

  for (const line of normalized) {
    const extra = parseExtraPerHour(line);
    if (extra !== null) {
      extraPerHour = extra;
      matchedLines++;
      continue;
    }

    const hourly = parsePerHour(line);
    if (hourly !== null) {
      perHour = hourly;
      matchedLines++;
      continue;
    }

    const bracket = parseBracket(line);
    if (bracket !== null) {
      brackets.push(bracket);
      matchedLines++;
      continue;
    }

    if (FLAT_WORD.test(line) && flat === null) {
      const value = lastNumber(line);
      if (value !== null) {
        flat = value;
        matchedLines++;
      }
    }
  }

  if (brackets.length > 0) {
    // Aynı bitişe birden fazla satır düşerse ilkini koru (sanitize de eler).
    const tiers: TariffTier[] = brackets.map((b) => ({ endMin: b.endMin, cumulativePrice: b.price }));

    // "Her ilave saat +X" varsa zinciri 3 saat daha kümülatif olarak uzat:
    // kullanıcı dilim çubuğunu ve uyarıyı ilk saatlerde görür, gerisi gereksiz.
    if (extraPerHour !== null) {
      const sorted = [...tiers].sort((a, b) => a.endMin - b.endMin);
      const last = sorted[sorted.length - 1];
      for (let i = 1; i <= 3; i++) {
        const cumulativePrice = last.cumulativePrice + i * extraPerHour;
        // Günlük tavan varsa artış orada durur — fiyat sonsuza kadar artmaz.
        if (flat !== null && cumulativePrice >= flat) break;
        tiers.push({ endMin: last.endMin + i * 60, cumulativePrice });
      }
    }

    // Günlük tavan ("GÜNLÜK 200 TL"): dilimlerin ardından gelen sabit ücret,
    // zincirin sonuna 24 saatlik tavan dilimi olarak eklenir. Fiyat artışı
    // burada PLATOYA oturur; düzenli/sabit artış varsayımı yoktur.
    if (flat !== null) {
      tiers.push({ endMin: DAY_MINUTES, cumulativePrice: flat });
    }

    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return { tariff: { type: 'tiered', currency, tiers: clean }, matchedLines };
  }

  if (perHour !== null) return { tariff: { type: 'hourly', currency, price: perHour }, matchedLines };
  // Tek bir "her ilave saat" satırı da fiilen saatlik tarifedir.
  if (extraPerHour !== null) return { tariff: { type: 'hourly', currency, price: extraPerHour }, matchedLines };
  if (flat !== null) return { tariff: { type: 'flat', currency, price: flat }, matchedLines };

  return null;
}

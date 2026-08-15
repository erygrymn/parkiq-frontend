import { sanitizeTiers, type Tariff, type TariffTier } from './tariffMath';

// Tarife panosu metnini (cihaz üstü OCR çıktısı) tarife modeline çevirir.
// Saf fonksiyon — OCR'dan bağımsız test edilir.
//
// KÜMÜLATİF KURALI: çıktı fiyatları "o dilimde çıkarsan ödeyeceğin TOPLAM"dır
// (design.md §5.9). Pano artımlı yazıyorsa ("her ilave saat +30") burada toplama
// çevrilir; yoksa tüm dilim matematiği ve "şimdi çık ₺X" kopyası yanlış olur.
//
// TEMEL AYIRIM: bir tarife satırında SÜRE ifadesi ve FİYAT ayrı sayılardır.
// Fiyat, süre ifadesinin DIŞINDA kalan ilk sayıdır. Bu tek kural üç şeyi birden
// çözer: dilim sınırının fiyat sanılmasını ("0-30 DK" → ₺30), fiyatın önde
// yazıldığı panoları ("£1.20 FOR 1 HOUR") ve fiyatı olmayan uyarı satırlarının
// dilim sanılmasını ("24 SAAT AÇIK", "15 DK İÇİNDE ÇIKINIZ").

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
export function normalizeLine(line: string): string {
  return line
    .replace(/[İIÜÖÇŞĞıüöçşğ]/g, (ch) => DIACRITICS[ch] ?? ch)
    .toUpperCase()
    .replace(/،/g, ',') // arapça virgül → normal virgül; ayraç çözümü sayıda yapılır
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "1.945,00" / "1,945.00" / "66,00" / "3.50" — binlik ve ondalık ayracı dilden
 * dile yer değiştirir. Kural: iki ayraç da varsa SONdaki ondalıktır. Tek ayraç
 * varsa ve ardından tam üç rakam geliyorsa binliktir ("1.500" = bin beş yüz),
 * aksi halde ondalıktır ("0.5", "3.50").
 *
 * Virgülü körlemesine noktaya çevirmek "1.945,00" değerini 1.94 yapıyordu ve
 * havalimanı panolarında günlük ücret kuruşa düşüyordu.
 */
function parseNumber(raw: string): number {
  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalAt = Math.max(lastDot, lastComma);
    const digits = raw.slice(0, decimalAt).replace(/[.,]/g, '') + '.' + raw.slice(decimalAt + 1);
    return Number(digits);
  }

  const sep = lastDot >= 0 ? lastDot : lastComma;
  if (sep < 0) return Number(raw);

  const grouped = raw.slice(sep + 1).length === 3 && !/[.,]/.test(raw.slice(sep + 1));
  return grouped ? Number(raw.replace(/[.,]/g, '')) : Number(raw.replace(',', '.'));
}

function detectCurrency(lines: string[]): string | null {
  const joined = lines.join(' ');
  for (const { match, code } of CURRENCY_PATTERNS) {
    if (match.test(joined)) return code;
  }
  return null;
}

/**
 * Birim sözcükleri. Sıra önemli: alternasyonda uzun olan önce denenmeli,
 * yoksa "SAATTEN" içindeki "SAAT" eşleşip ekini dışarıda bırakır.
 */
const UNIT =
  'SAATTEN|SAATTAN|SAATLERI|SAATI|SAAT|HOURS|HOUR|HRS|HR|DAKIKA|MINUTES|MINUTE|MINS|MIN|DK|SA|GUNU|GUNLERI|GUN|DAYS|DAY';

/** Birim sözcüğünü dakikaya çevirir. */
function minutesPerUnit(unit: string): number {
  if (/^(GUN|DAY)/.test(unit)) return 24 * 60;
  if (/^(DAKIKA|DK|MIN)/.test(unit)) return 1;
  return 60;
}

const HOUR_WORD = /(SAAT|HOURS?|HRS?|SA\b)/;
const MINUTE_WORD = /(DAKIKA|MINUTES?|MINS?|DK\b)/;
const EXTRA_WORD = /(ILAVE|EK\b|SONRAKI|EKSTRA|ADDITIONAL|EXTRA|EACH|HER)/;
const FLAT_WORD = /(GUNLUK|SABIT|FLAT|ALL DAY|DAILY|GECELIK|24 SAAT|MAKS|MAXIMUM)/;
/** AVM otoparklarında çok yaygın: ilk dilim bedava. Fiyatı 0'dır, sayı okunmaz. */
const FREE_WORD = /(UCRETSIZ|BEDAVA|PARASIZ|FREE|NO CHARGE)/;
/** "1 saat ÜZERİ" gibi ifadelerde sayı dilimin BAŞIDIR, sonu değil. */
const TAIL_WORD = '(?:UZERI|UZERINDE|USTU|SONRASI|SONRA|ASKISI)';

const DAY_MINUTES = 24 * 60;

/**
 * Abonelik satırları park OTURUMU tarifesi değildir; panolarda tarifenin hemen
 * altında yer alırlar ("15 GÜNLÜK 750 TL", "AYLIK ABONE 1.500 TL") ve dilim
 * sanılırsa kullanıcıya aylık abonelik fiyatı üzerinden sayaç işletilir.
 *
 * Ayrım "GÜNLÜK" ile "GÜN" arasında: havalimanı panolarındaki "2 GÜN 540 TL"
 * gerçek bir park süresidir ve korunur; "15 GÜNLÜK" bir abonelik paketidir.
 */
const SUBSCRIPTION_WORD =
  /(ABONE|ABONELIK|AYLIK|HAFTALIK|SUBSCRIPTION|MONTHLY|WEEKLY|SEASON TICKET|\d+\s*GUNLUK)/;

/** Gevşek "sayı + birim" kalıbının kabul ettiği en uzun satır (karakter). */
const TABULAR_MAX_LENGTH = 32;

/** Kelime sıra sayıları — "İKİNCİ SAAT 30 TL" / "SECOND HOUR $5". */
const ORDINAL_WORDS: Array<{ pattern: string; nth: number }> = [
  { pattern: 'ILK|FIRST|BIRINCI|1ST', nth: 1 },
  { pattern: 'IKINCI|SECOND|2ND', nth: 2 },
  { pattern: 'UCUNCU|THIRD|3RD', nth: 3 },
  { pattern: 'DORDUNCU|FOURTH|4TH', nth: 4 },
  { pattern: 'BESINCI|FIFTH|5TH', nth: 5 },
];

interface DurationMatch {
  /** Dilimin BİTİŞİ (dakika). */
  endMin: number;
  /** Süre ifadesinin satırdaki yeri — fiyat bunun dışında aranır. */
  start: number;
  end: number;
}

function span(match: RegExpMatchArray, endMin: number): DurationMatch {
  return { endMin, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length };
}

/** "1 SAAT 30 DK" gibi bileşik bir üst sınırı dakikaya çevirir. */
function compoundMinutes(a1: string, u1: string, a2?: string, u2?: string): number {
  const first = Number(a1) * minutesPerUnit(u1);
  const second = a2 && u2 ? Number(a2) * minutesPerUnit(u2) : 0;
  return first + second;
}

/**
 * Satırdaki SÜRE ifadesini bulur. Sırayla en özgülden en gevşeğe denenir;
 * ilk eşleşen kazanır.
 */
function matchDuration(line: string): DurationMatch | null {
  const amount = `(\\d+)\\s*(${UNIT})\\.?`;
  const compound = `${amount}(?:\\s*(\\d+)\\s*(${UNIT})\\.?)?`;

  // "1 SAAT 30 DK - 2 SAAT" / "30 DK - 1 SAAT": iki ucun birimi ve parça sayısı
  // farklı olabilir. Üst sınır KENDİ birimleriyle okunur.
  const ranged = line.match(new RegExp(`${compound}\\s*[-–—]\\s*${compound}`));
  if (ranged) {
    const endMin = compoundMinutes(ranged[5], ranged[6], ranged[7], ranged[8]);
    if (endMin > 0) return span(ranged, endMin);
  }

  // "0-1 SAAT" — birim ortak, sonda yazılmış.
  const shared = line.match(new RegExp(`(\\d+)\\s*[-–—]\\s*(\\d+)\\s*(${UNIT})\\.?`));
  if (shared) {
    const endMin = Number(shared[2]) * minutesPerUnit(shared[3]);
    if (endMin > 0) return span(shared, endMin);
  }

  // "1 SAAT ÜZERİ 40" / "1 SAATTEN SONRA 40" / "OVER 4 HOURS £12":
  // sayı dilimin BAŞIDIR. Fiyat oradan sonrası için sabittir → günlük tavana
  // uzanan bir plato olarak modellenir (kümülatif fiyat düşemez).
  const tailAfter = line.match(new RegExp(`${amount}\\s*${TAIL_WORD}`));
  if (tailAfter) return span(tailAfter, DAY_MINUTES);
  const tailBefore = line.match(new RegExp(`(?:OVER|AFTER|BEYOND)\\s*${amount}`));
  if (tailBefore) return span(tailBefore, DAY_MINUTES);

  // "UP TO 4 HOURS £8" / "EN FAZLA 4 SAAT"
  const upTo = line.match(new RegExp(`(?:UP TO|EN FAZLA|EN COK)\\s*${amount}`));
  if (upTo) {
    const endMin = Number(upTo[1]) * minutesPerUnit(upTo[2]);
    if (endMin > 0) return span(upTo, endMin);
  }

  // "1. SAAT" (sıra sayısı = o saatin sonu)
  const ordinal = line.match(/(\d+)\s*\.\s*(SAAT|SA\b)/);
  if (ordinal) {
    const nth = Number(ordinal[1]);
    if (nth > 0) return span(ordinal, nth * 60);
  }

  // "1ST HOUR" / "2ND HOUR"
  const suffixOrdinal = line.match(/(\d+)\s*(?:ST|ND|RD|TH)\s*(HOURS?|HRS?)\b/);
  if (suffixOrdinal) {
    const nth = Number(suffixOrdinal[1]);
    if (nth > 0) return span(suffixOrdinal, nth * 60);
  }

  // "İLK YARIM SAAT" / "FIRST HALF HOUR" → 30 dk
  const halfHour = line.match(/(?:ILK|FIRST)\s*(?:YARIM|HALF)\s*(?:AN\s*)?(SAAT|HOUR)\b/);
  if (halfHour) return span(halfHour, 30);

  // "İLK SAAT ÜCRETSİZ" / "SECOND HOUR $5" — RAKAM YOK, sıra sözcükle yazılı.
  for (const { pattern, nth } of ORDINAL_WORDS) {
    const worded = line.match(new RegExp(`(?:${pattern})\\s*(SAAT|HOURS?|HRS?)\\b`));
    if (worded) return span(worded, nth * 60);
  }

  // "İLK 2 SAAT 80" / "30 DAKIKA 20" — en gevşek kalıp. Panonun dip notundaki
  // düz cümle de ("...15 DK içerisinde çıkınız") buna uyar; uzun satırları alma.
  if (line.length <= TABULAR_MAX_LENGTH) {
    const leading = line.match(new RegExp(`(?:ILK|FIRST)?\\s*${compound}`));
    if (leading) {
      const endMin = compoundMinutes(leading[1], leading[2], leading[3], leading[4]);
      if (endMin > 0) return span(leading, endMin);
    }
  }

  return null;
}

/** Satırdaki sayı token'ları, konumlarıyla. */
function numberTokens(line: string): Array<{ value: number; start: number; end: number }> {
  const out: Array<{ value: number; start: number; end: number }> = [];
  // Binlik ayraçlı sayı ("1.945,00") TEK token olmalı; parçalanırsa fiyat kuruşa düşer.
  const re = /\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const value = parseNumber(match[0]);
    if (Number.isFinite(value)) {
      out.push({ value, start: match.index, end: match.index + match[0].length });
    }
  }
  return out;
}

/**
 * Süre ifadesinin DIŞINDA kalan İLK sayı = fiyat.
 *
 * İlk olması önemli: çok sütunlu panolarda ("0-1 SAAT 50 TL 75 TL") ilk sütun
 * binek araç fiyatıdır; sonuncuyu almak kullanıcıya minibüs tarifesini okur.
 * Dışında olması önemli: fiyatı olmayan uyarı satırları böylece elenir.
 */
function priceCells(line: string, duration: DurationMatch | null, currency: string): number[] {
  const cells: Array<{ value: number; at: number }> = [];

  // "ÜCRETSİZ" bir fiyat HÜCRESİDİR (0), sütun sayımında yerini korumalı:
  // "0-30 DK  ÜCRETSİZ  20 TL" panosunda hafta sonu sütunu ikinci hücredir.
  const free = /(UCRETSIZ|BEDAVA|PARASIZ|FREE|NO CHARGE)/g;
  let hit: RegExpExecArray | null;
  while ((hit = free.exec(line)) !== null) cells.push({ value: 0, at: hit.index });

  for (const token of numberTokens(line)) {
    const insideDuration = duration !== null && token.start >= duration.start && token.start < duration.end;
    if (insideDuration) continue;
    // "80P" = 80 peni → £0.80. Sadece sterlin panolarında geçerli.
    const pence = currency === 'GBP' && /^\s*P/.test(line.slice(token.end));
    cells.push({ value: pence ? token.value / 100 : token.value, at: token.start });
  }

  return cells.sort((a, b) => a.at - b.at).map((c) => c.value);
}

/**
 * Süre ifadesinin DIŞINDA kalan fiyat hücrelerinden İSTENEN SÜTUNU verir.
 *
 * Sütun seçimi önemli: çok sütunlu panolarda varsayılan ilk sütundur (binek
 * araç / hafta içi); takvim seçimi ikinci sütunu isteyebilir. Süre ifadesinin
 * dışında olması ise fiyatı olmayan uyarı satırlarını eler.
 */
function priceOutside(
  line: string,
  duration: DurationMatch | null,
  currency: string,
  column = 0,
): number | null {
  const cells = priceCells(line, duration, currency);
  if (cells.length === 0) return null;
  // Hücre birleştirilmişse (tek "ÜCRETSİZ" iki sütunu birden kapsar) en sağdakine düş.
  return cells[Math.min(column, cells.length - 1)];
}

interface BracketLine {
  endMin: number;
  price: number;
}

/** Bir dilim satırı: süre ifadesi + ondan ayrı bir fiyat. İkisi de şart. */
function parseBracket(line: string, currency: string, column: number): BracketLine | null {
  const duration = matchDuration(line);
  if (duration === null) return null;
  const price = priceOutside(line, duration, currency, column);
  if (price === null || price < 0) return null;
  return { endMin: duration.endMin, price };
}

/** Artımlı ücret adımı: "HER İLAVE SAAT 20" / "HER İLAVE 30 DAKİKA 15". */
interface IncrementStep {
  stepMin: number;
  price: number;
}

function parseIncrement(line: string, currency: string): IncrementStep | null {
  // Artım satırı da bir tablo satırıdır. Uzun cümleler ("...EKSTRA
  // ÜCRETLENDİRME YAPILACAKTIR" içinde geçen "15 DK") buraya girmemeli:
  // dakikalık bir adım uydurup zinciri baştan bozuyordu.
  if (!EXTRA_WORD.test(line) || line.length > TABULAR_MAX_LENGTH) return null;

  const duration = matchDuration(line);
  const price = priceOutside(line, duration, currency);
  if (price === null || price <= 0) return null;

  // "HER YARIM SAAT" — rakamsız yarım saat adımı.
  if (/(YARIM|HALF)/.test(line)) return { stepMin: 30, price };
  if (duration !== null) return { stepMin: duration.endMin, price };
  // Rakamsız adım yalnız saat olabilir ("HER İLAVE SAAT"). Dakikaya düşmek
  // 1 dakikalık adım üretir ve tarifeyi anlamsız kılar.
  if (HOUR_WORD.test(line)) return { stepMin: 60, price };
  return null;
}

/** "SAATLİK 40" / "SAAT BAŞI 40" / "SAATİ 40" / "40 TL/SAAT" / "PER HOUR 4". */
const PER_HOUR_WORD = /(SAATLIK|SAAT BASI|SAATI\b|PER HOUR|\/\s*SAAT|\/\s*HOUR|\/\s*HR|HOURLY)/;

function parsePerHour(line: string, currency: string): number | null {
  if (!PER_HOUR_WORD.test(line) || EXTRA_WORD.test(line)) return null;
  const price = priceOutside(line, matchDuration(line), currency);
  return price !== null && price > 0 ? price : null;
}

/** "GÜNLÜK 200" / "ALL DAY $12" — süre ifadesinin dışındaki fiyat. */
function parseFlat(line: string, currency: string): number | null {
  if (!FLAT_WORD.test(line)) return null;
  // "12-24 SAAT 130 ₺" bir DİLİM satırıdır; FLAT_WORD'ün "24 SAAT" kalıbına
  // takılıp günlük tavan sayılırsa hem o dilim kaybolur hem tavan uydurulur.
  // Aralık işareti taşıyan satır asla sabit ücret değildir.
  if (new RegExp(`\\d+\\s*(?:${UNIT})?\\.?\\s*[-–—]\\s*\\d+`).test(line)) return null;
  // Aynı satırda hem saatlik hem günlük yazılıysa ("SAATLİK 40 GÜNLÜK 200"),
  // günlük olan SONdaki sayıdır.
  const tokens = numberTokens(line);
  if (PER_HOUR_WORD.test(line) && tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    return last.value > 0 ? last.value : null;
  }
  const price = priceOutside(line, matchDuration(line), currency);
  return price !== null && price > 0 ? price : null;
}

export interface ParseResult {
  tariff: Tariff;
  /** Kullanıcıya "kontrol et" demek için: kaç satırdan üretildi. */
  matchedLines: number;
  /**
   * Tarife satırına BENZEYİP okunamayan satır sayısı: hem para birimi hem süre
   * birimi taşıyıp hiçbir kalıba oturmayanlar. Sıfırdan büyükse tarife eksik
   * çıkmış olabilir — sessizce doğru sanılmasın diye kullanıcı uyarılır.
   */
  missedLines: number;
}

/** Artım zinciri en fazla bu kadar dilim ekler — çubuk okunmaz hale gelmesin. */
const MAX_CHAIN_TIERS = 23;

/**
 * Bir dilim zincirini sabit adımlarla uzatır. Zincir kısa kesilirse fiyat
 * sonsuza dek DONAR ve app "artık artmıyor" der; bu yüzden son dilim her zaman
 * günlük tavana (ya da varsa sabit tavana) kadar götürülür.
 */
function extendChain(tiers: TariffTier[], step: IncrementStep, cap: number | null): void {
  const base = tiers[tiers.length - 1];
  if (!base || step.stepMin <= 0) return;

  let added = 0;
  for (let i = 1; added < MAX_CHAIN_TIERS; i++) {
    const endMin = base.endMin + i * step.stepMin;
    const price = base.cumulativePrice + i * step.price;
    if (endMin >= DAY_MINUTES) break;
    if (cap !== null && price >= cap) break;
    tiers.push({ endMin, cumulativePrice: price });
    added++;
  }

  // Zincir 24 saate ulaşmadıysa son noktayı ekstrapole et: fiyat donmasın.
  const last = tiers[tiers.length - 1];
  if (cap === null && last.endMin < DAY_MINUTES) {
    const steps = (DAY_MINUTES - base.endMin) / step.stepMin;
    tiers.push({ endMin: DAY_MINUTES, cumulativePrice: base.cumulativePrice + steps * step.price });
  }
}

export function parseTariffLines(
  lines: string[],
  fallbackCurrency: string,
  priceColumn = 0,
): ParseResult | null {
  const normalized = lines.map(normalizeLine).filter((line) => line.length > 0);
  if (normalized.length === 0) return null;

  const currency = detectCurrency(normalized) ?? fallbackCurrency;

  const brackets: BracketLine[] = [];
  let increment: IncrementStep | null = null;
  let perHour: number | null = null;
  let flat: number | null = null;
  let matchedLines = 0;
  let missedLines = 0;

  // Fiyat taşıyıp hiçbir dilime yerleştirilemeyen KISA satır, tablodan bir şey
  // kaçırdığımızın işaretidir. Uyarı ve dip not satırlarında para birimi
  // bulunmaz; abonelik satırları zaten yukarıda elenir. Uzun cümleler tablo
  // satırı değildir, onları saymayız.
  const hasUnplacedPrice = (line: string) =>
    line.length <= 40 && CURRENCY_PATTERNS.some((c) => c.match.test(line));

  for (const line of normalized) {
    if (SUBSCRIPTION_WORD.test(line)) continue;
    let used = false;

    const step = parseIncrement(line, currency);
    if (step !== null && increment === null) {
      increment = step;
      used = true;
    }

    if (!used) {
      const hourly = parsePerHour(line, currency);
      if (hourly !== null && perHour === null) {
        perHour = hourly;
        used = true;
      }
    }

    // Sabit/günlük ücret aynı satırda saatlikle birlikte yazılmış olabilir,
    // bu yüzden `used` olsa da denenir.
    if (flat === null) {
      const daily = parseFlat(line, currency);
      if (daily !== null) {
        flat = daily;
        used = true;
      }
    }

    if (!used) {
      const bracket = parseBracket(line, currency, priceColumn);
      if (bracket !== null) {
        brackets.push(bracket);
        used = true;
      }
    }

    if (used) matchedLines++;
    else if (hasUnplacedPrice(line)) missedLines++;
  }

  if (brackets.length > 0) {
    const tiers: TariffTier[] = brackets.map((b) => ({ endMin: b.endMin, cumulativePrice: b.price }));
    tiers.sort((a, b) => a.endMin - b.endMin);

    // Panoda "her ilave saat" yoksa ama saatlik ücret yazıyorsa, dilimlerden
    // sonrası o saatlik ücretle devam eder. Bu satır eskiden okunup atılıyordu:
    // "İlk 1 saat ücretsiz + saatlik 30 TL" panosu "hep bedava" çıkıyordu.
    const step = increment ?? (perHour !== null ? { stepMin: 60, price: perHour } : null);
    if (step !== null) extendChain(tiers, step, flat);

    // Günlük tavan: artış burada PLATOYA oturur, sonsuza kadar artmaz.
    if (flat !== null) tiers.push({ endMin: DAY_MINUTES, cumulativePrice: flat });

    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return { tariff: { type: 'tiered', currency, tiers: clean, dailyMax: flat ?? undefined }, matchedLines, missedLines };
  }

  // Saatlik + günlük tavan: tavansız saatlik gibi sonsuza kadar artmasın.
  const hourlyStep = perHour ?? increment?.price ?? null;
  if (hourlyStep !== null && flat !== null) {
    const tiers: TariffTier[] = [];
    const stepMin = increment?.stepMin ?? 60;
    for (let i = 1; i <= MAX_CHAIN_TIERS; i++) {
      const endMin = i * stepMin;
      const price = i * hourlyStep;
      if (endMin >= DAY_MINUTES || price >= flat) break;
      tiers.push({ endMin, cumulativePrice: price });
    }
    tiers.push({ endMin: DAY_MINUTES, cumulativePrice: flat });
    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return { tariff: { type: 'tiered', currency, tiers: clean, dailyMax: flat ?? undefined }, matchedLines, missedLines };
  }

  if (perHour !== null) return { tariff: { type: 'hourly', currency, price: perHour }, matchedLines, missedLines };
  // Tek bir "her ilave saat" satırı da fiilen saatlik tarifedir.
  if (increment !== null)
    return { tariff: { type: 'hourly', currency, price: increment.price }, matchedLines, missedLines };
  if (flat !== null) return { tariff: { type: 'flat', currency, price: flat }, matchedLines, missedLines };

  return null;
}

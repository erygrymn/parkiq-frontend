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

// Sıra önemli: "R$", "HK$", "NT$" genel "$"tan ÖNCE denenmeli.
const CURRENCY_PATTERNS: Array<{ match: RegExp; code: string }> = [
  { match: /₺|\bTL\b|\bTRY\b|\bLİRA\b|\bLIRA\b/i, code: 'TRY' },
  { match: /€|\bEUR\b|\bEURO\b/i, code: 'EUR' },
  { match: /£|\bGBP\b|\bPOUND\b/i, code: 'GBP' },
  { match: /R\$|\bBRL\b|\bREAIS\b/i, code: 'BRL' },
  { match: /HK\$|\bHKD\b/i, code: 'HKD' },
  { match: /MX\$|\bMXN\b/i, code: 'MXN' },
  { match: /¥|\bJPY\b|\bYEN\b/i, code: 'JPY' },
  { match: /₩|\bKRW\b|\bWON\b/i, code: 'KRW' },
  { match: /\bNTD\b|\bTWD\b|\bYUAN\b/i, code: 'TWD' },
  { match: /\bKR\b|\bSEK\b/i, code: 'SEK' },
  { match: /\$|\bUSD\b|\bDOLLAR\b/i, code: 'USD' },
];

const DIACRITICS: Record<string, string> = {
  İ: 'I', I: 'I', Ü: 'U', Ö: 'O', Ç: 'C', Ş: 'S', Ğ: 'G',
  ı: 'i', ü: 'u', ö: 'o', ç: 'c', ş: 's', ğ: 'g',
};

/**
 * Panodaki yabancı dil sözcüklerini ayrıştırıcının bildiği biçime çevirir.
 *
 * Tarama premium ve 18 dilde satılıyor; kalıplar yalnız Türkçe/İngilizce bildiği için Almanca
 * "bis 1 Std. 2,00 €", Japonca "30分 200円" panosu hiç okunmuyor ve Pro kullanıcıya "pano
 * okunamadı" deniyordu. Sözcükler tek tek kalıplara eklenmek yerine BURADA kanonik biçime
 * (HOUR, MIN, EACH, UP TO, DAILY...) çevrilir: aşağıdaki bütün kalıplar her dilde çalışır.
 *
 * Sıra önemli: önce ifadeler, sonra birimler, sonra aralık, en son tek sözcükler — yoksa
 * "JEDE WEITERE STUNDE" parçalanır ya da "1 BIS 2" aralık olmadan "UP TO" olur.
 */
const CJK_VOCABULARY: Array<[RegExp, string]> = [
  // Japonca ifadeler: "30分毎", "1時間まで", "当日最大"
  [/(\d+)\s*分\s*(?:毎|ごとに|ごと|当たり|あたり)/g, ' EACH $1 MIN '],
  [/(\d+)\s*時間\s*(?:毎|ごとに|ごと|当たり|あたり)/g, ' EACH $1 HOUR '],
  [/(?:当日|1日|24時間|日)\s*最大(?:料金)?|最大料金/g, ' DAILY MAX '],
  [/(\d+)\s*分\s*(?:まで|以内)/g, ' UP TO $1 MIN '],
  [/(\d+)\s*時間\s*(?:まで|以内)/g, ' UP TO $1 HOUR '],
  // Korece: "10분당", "1일 최대", "30분까지"
  [/(\d+)\s*분\s*(?:당|마다)/g, ' EACH $1 MIN '],
  [/(\d+)\s*시간\s*(?:당|마다)/g, ' EACH $1 HOUR '],
  [/(?:1일|일일|하루|당일)\s*최대(?:\s*요금)?/g, ' DAILY MAX '],
  [/(\d+)\s*분\s*(?:까지|이내)/g, ' UP TO $1 MIN '],
  [/(\d+)\s*시간\s*(?:까지|이내)/g, ' UP TO $1 HOUR '],
  // Çince: "每半小時", "每小時", "當日最高", "30分鐘內"
  [/每\s*半\s*(?:小時|小时)/g, ' EACH 30 MIN '],
  [/每\s*(?:小時|小时)/g, ' PER HOUR '],
  [/(?:當日|当日|每日|單日|单日)\s*(?:最高|上限)(?:收費|收费)?|最高收費|最高收费/g, ' DAILY MAX '],
  [/(\d+)\s*(?:分鐘|分钟|分)\s*(?:內|内)/g, ' UP TO $1 MIN '],
  // Birimler: önce tek anlamlı sözcükler, sonra rakama yapışık tek karakterler
  // ("時" tek başına saat başıdır — "8時" — süre değil; o yüzden yalnız "時間").
  [/小時|小时|鐘頭|钟头|時間|시간/g, ' HOUR '],
  [/分鐘|分钟/g, ' MIN '],
  [/(\d+)\s*[分분]/g, '$1 MIN '],
  [/(\d+)\s*(?:日間|天)/g, '$1 DAY '],
  // Sözcükler
  [/最初の|入庫後|入庫から|최초|기본|首|第一/g, ' FIRST '],
  [/추가/g, ' ADDITIONAL '],
  [/每/g, ' EACH '],
  [/以降|以後|이후|초과|以上/g, ' OR MORE '],
  [/無料|무료|免費|免费/g, ' FREE '],
  // Para birimleri: simge yerine sözcük — tek karakter kalıpları rakama yapışık kalmasın.
  [/円/g, ' YEN '],
  [/원/g, ' WON '],
  [/NT\$/g, ' NTD '],
  [/元/g, ' YUAN '],
];

const LATIN_VOCABULARY: Array<[RegExp, string]> = [
  // "24H/24", "7J/7", "24/7": açık olma saatleri, ücret değil — "24 saat" sanılıp günlük tavan
  // uyduruluyordu.
  [/\b24\s*H\s*\/\s*24\b|\b7\s*J\s*\/\s*7\b|\b24\s*\/\s*7\b|\b7\s*\/\s*24\b/g, ' '],
  // Sıra sayısı ekleri: "1ÈRE HEURE", "1ª HORA", "2EME HEURE" → "1. HEURE"
  [/\b(\d+)\s*(?:ERE|ER|EME|E|A|O)\s+(?=(?:STUNDE|HEURE|HORA|ORA|UUR|TIMME|TIMMEN|HOUR)\b)/g, '$1. '],
  // İfadeler (birimlerden önce)
  [/\bJEDE[NR]?\s+WEITERE[N]?\s+(?:ANGEFANGENE[N]?\s+)?/g, 'EACH ADDITIONAL '],
  [/\bJE(?:DE[NR]?)?\s+ANGEFANGENE[N]?\s+/g, 'EACH '],
  [/\bPABORJAD(?:E)?\s+/g, ''],
  [/\b(?:POR\s+|CADA\s+)?FRACC?(?:ION|AO)(?:ES)?\s+DE\s+/g, 'EACH '],
  [/\bTAGES(?:HOCHSTSATZ|HOCHSTPREIS|MAXIMUM|TICKET|PAUSCHALE|TARIF|SATZ)\b|\bHOCHSTSATZ\b/g, 'DAILY'],
  [/\bFORFAIT\s+(?:JOURNEE|JOUR)\b|\bMAXIMUM\s+JOURNALIER\b|\bJOURNALIER\b|\bTARIF\s+JOURNEE\b/g, 'DAILY'],
  [/\bMAXIMO\s+DIARIO\b|\bTARIFA\s+DIARIA\b|\bDIARIO\b|\bDIARIA\b|\bPERNOITE\b/g, 'DAILY'],
  [/\bMASSIMO\s+GIORNALIERO\b|\bTARIFFA\s+GIORNALIERA\b|\bGIORNALIER[AO]\b/g, 'DAILY'],
  [/\bDAG(?:TARIEF|KAART|MAXIMUM|PRIJS)\b|\bDYGNS(?:PRIS|AVGIFT|TAXA)\b/g, 'DAILY'],
  [/\bJUSQU\s*['’]?\s*A\b|\bFINO\s+A\b|\bUPP\s+TILL\b/g, 'UP TO'],
  [/\bAU[-\s]?DELA\s+DE\b|\bA\s+PARTIR\s+DE\b|\bDESPUES\s+DE\b|\bMAS\s+DE\b|\bACIMA\s+DE\b/g, 'AFTER'],
  [/\bL\s*['’]\s*ORA\b|\bALL\s*['’]\s*ORA\b|\bORARI[AO]\b/g, 'PER HOUR'],
  [/\bMN\b/g, 'MIN'],
  // Birimler
  [/\b(\d{1,2})H(\d{2})\s*-\s*(\d{1,2})H(\d{2})\b/g, '$1:$2-$3:$4'],
  [/\b(\d+)\s*H(\d{2})\b/g, '$1 HOUR $2 MIN'],
  [/\b(\d+)\s*[HU]\b/g, '$1 HOUR'],
  // "2,00 €/h" saatlik ücrettir; "10 KM/H" hız sınırıdır — yalnız para ya da rakamdan sonra.
  [/(€|\bEUR|\bKR|\$|\d)\s*\/\s*[HU]\b/g, '$1/HOUR'],
  [/\b(?:STUNDEN|HEURES|HORAS|ORE|TIMMAR(?:NA)?|UREN)\b/g, 'HOURS'],
  [/\b(?:STUNDE|HEURE|HORA|ORA|UUR|TIMMEN|TIMME|TIM)\b/g, 'HOUR'],
  [/\bSTD\b/g, 'HR'],
  [/\b(?:MINUTEN|MINUTOS|MINUTO|MINUTA|MINUTI|MINUTER)\b/g, 'MINUTES'],
  // Dakika başı ücret: "0,05 €/min" → adımı 1 dakika olan artım (saatliğe çevrilir).
  [/(€|\bEUR|\bKR|\$|\d)\s*\/\s*MIN(?:UTES?)?\b\.?/g, '$1 EACH 1 MIN'],
  [/\b(?:TAGE|JOURS|DIAS|GIORNI|DAGEN|DAGAR)\b/g, 'DAYS'],
  [/\b(?:TAG|JOURNEE|JOUR|DIA|GIORNO|DAG|DYGN)\b/g, 'DAY'],
  // Aralık: "1 BIS 2", "DE 1 A 2 HOURS", "1 HOUR A 2 HOURS", "0 TO 1 HOUR". Yalnız iki rakam
  // arasında (araya birim girebilir) çevrilir — "TOTAL" gibi sözcüklere dokunulmaz.
  [
    /(\d)(\s*(?:HOURS?|HRS?|MIN(?:UTES?)?|DAYS?|SAAT|DK)\.?)?\s*\b(?:TO|ILA|ILE|BIS|A|AL|HASTA|TOT|TILL|ATE)\b\s*(\d)/g,
    '$1$2-$3',
  ],
  // Tek sözcükler
  [/\b(?:PRO|PAR|POR|AL)\s+(?=(?:HOUR|HR|DAY)\b)/g, 'PER '],
  [/\b(?:PER|LES|JE)\s+(?=\d)/g, 'EACH '],
  [/\b(?:BIS|HASTA|ATE|TOT)\b/g, 'UP TO'],
  [/\bUBER\b/g, 'OVER'],
  [/\b(?:AB|APRES|DOPO|OLTRE|NA|EFTER|APOS)\s+(?=\d)/g, 'AFTER '],
  [/\b(?:ERSTE[NR]?|PREMIERE|PREMIER|PRIMERA|PRIMER|PRIMA|PRIMO|PRIMEIRA|PRIMEIRO|EERSTE|FORSTA)\b/g, 'FIRST'],
  [/\b(?:ZWEITE[NR]?|DEUXIEME|SEGUNDA|SEGUNDO|SECONDA|SECONDO|TWEEDE|ANDRA)\b/g, 'SECOND'],
  [/\b(?:DRITTE[NR]?|TROISIEME|TERCERA|TERZA|TERCEIRA|DERDE|TREDJE)\b/g, 'THIRD'],
  [/\b(?:JEDE[NR]?|CHAQUE|CADA|OGNI|ELKE?|IEDERE?|VARJE)\b/g, 'EACH'],
  [/\b(?:WEITERE[N]?|SUPPLEMENTAIRES?|ADICIONALE?S?|ADICIONAIS|SUCCESSIV[AEIO]|VOLGENDE?|YTTERLIGARE)\b/g, 'ADDITIONAL'],
  [/\b(?:DAREFTER|DEMAIS)\b/g, 'EACH ADDITIONAL'],
  [/\bSIGUIENTES?\b/g, 'ADDITIONAL'],
  [/\b(?:KOSTENLOS|GEBUHRENFREI|UNENTGELTLICH|FREI|GRATUITE?S?|GRATIS|GRATUIT[AO]|AVGIFTSFRI|ISENTO)\b/g, 'FREE'],
];

/** Para birimi ve dil bilgisini koruyarak aksanları katlar: é → E, ä → A, ã → A (CJK'ye dokunmaz). */
function foldDiacritics(line: string): string {
  return line
    .replace(/[İIÜÖÇŞĞıüöçşğ]/g, (ch) => DIACRITICS[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');
}

/**
 * Aksanları ASCII'ye katlayıp büyütür — kalıplar tek biçimle yazılabilsin
 * ("GÜNLÜK" → "GUNLUK", "DAKİKA" → "DAKIKA") — ve yabancı dildeki pano sözcüklerini
 * kanonik biçime çevirir (bkz. LATIN_VOCABULARY).
 */
export function normalizeLine(line: string): string {
  // Tam genişlikli rakam ve işaretler ("３０分", "～") ASCII'ye: Japon panolarında yaygın.
  let text = foldDiacritics(line.normalize('NFKC').replace(/⁄/g, '/')).toUpperCase();
  // Japon panosunda "30分 200円" 30 dakikada BİR 200 yen demektir, tekrar eder; ilk dilim
  // açıkça "最初の"/"入庫後" ile, tavan "最大" ile yazılır. Tek dilim okununca otopark
  // 30. dakikadan sonra bedava görünüyordu.
  if (/円/.test(text) && !/最初|入庫|まで|以内|最大|以降|以後|毎|ごと|あたり|当たり/.test(text)) {
    text = text.replace(/(\d+)\s*(分|時間)\s*\/?\s*(?=\d[\d,]*\s*円)/g, '$1$2毎 ');
  }
  text = text
    .replace(/،/g, ',') // arapça virgül → normal virgül; ayraç çözümü sayıda yapılır
    // Aralık işaretinin bütün yazımları tek tireye: figür tire, eksi işareti, tilde.
    // Aksi hâlde "0 − 1 SAAT 50" aralık sayılmıyor ve 0 fiyat diye okunuyordu.
    .replace(/[‐‑‒–—―−~〜]/g, '-');
  for (const [pattern, replacement] of CJK_VOCABULARY) text = text.replace(pattern, replacement);
  for (const [pattern, replacement] of LATIN_VOCABULARY) text = text.replace(pattern, replacement);
  return (
    text
      // "EACH ADDITIONAL 1/2 HOUR" → yarım saat; "7/24" gibi yazımlara dokunulmaz.
      .replace(/\b1\s*\/\s*2\s*(?:HOURS?|HRS?|SAAT)\b/g, '30 MIN')
      .replace(/\s+/g, ' ')
      .trim()
  );
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
  'SAATLERI|SAATLIK|SAATTEN|SAATTAN|SAATI|SAAT|HOURS|HOUR|HRS|HR|DAKIKA|MINUTES|MINUTE|MINS|MIN|DK|SA|GUNU|GUNLERI|GUN|DAYS|DAY';

/** Süre miktarı: tam ya da ondalık ("1,5 SAAT"). Ondalık okunmazsa "5 SAAT" sanılıyordu. */
const AMOUNT = '(\\d+(?:[.,]\\d+)?)';

function amountOf(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/** Birim sözcüğünü dakikaya çevirir. */
function minutesPerUnit(unit: string): number {
  if (/^(GUN|DAY)/.test(unit)) return 24 * 60;
  if (/^(DAKIKA|DK|MIN)/.test(unit)) return 1;
  return 60;
}

const HOUR_WORD = /(SAAT|HOURS?|HRS?|SA\b)/;
const MINUTE_WORD = /(DAKIKA|MINUTES?|MINS?|DK\b)/;
const EXTRA_WORD = /(ILAVE|EK\b|SONRAKI|EKSTRA|ADDITIONAL|EXTRA|EACH|HER)/;
/** Günlük ücret: 24 saatte bir yeniden başlar (çok günlük park her gün öder). */
const DAILY_WORD = /(GUNLUK|ALL DAY|DAILY|PER DAY|GECELIK|OVERNIGHT|24 SAAT|24 HOURS?|MAKS|MAXIMUM|\bMAX\b)/;
/** Sabit ücret: süreden bağımsız tek ödeme (etkinlik otoparkı). */
const FIXED_WORD = /(SABIT|\bFLAT\b)/;
/**
 * Yalnız bu sözcüklerle tanınan satır "günlük tavan" sayılmak için para birimi de taşımalı:
 * panolarda "MAKS. HIZ 10 KM" ve "MAXIMUM HEIGHT 2.10M" da yazıyor ve bunlar tavan sanılınca
 * her dilim ₺10'a kırpılıyordu.
 */
const WEAK_DAILY_WORD = /(MAKS|MAXIMUM|\bMAX\b)/;
const STRONG_DAILY_WORD = /(GUNLUK|ALL DAY|DAILY|PER DAY|GECELIK|OVERNIGHT|24 SAAT|24 HOURS?)/;
/** Fiyat olamayacak sayının ardından gelenler: hız, yükseklik, kapasite birimleri ve "7/24". */
const NON_PRICE_AFTER = /^\s*(?:KM\b|M\b|MT\b|METRE|METER|CM\b|KG\b|TON\b|ADET|ARAC|KISI|%|\/)/;
/** AVM otoparklarında çok yaygın: ilk dilim bedava. Fiyatı 0'dır, sayı okunmaz. */
const FREE_WORD = /(UCRETSIZ|BEDAVA|PARASIZ|FREE|NO CHARGE)/;
/**
 * "1 saat ÜZERİ" gibi ifadelerde sayı dilimin BAŞIDIR, sonu değil. Araya "VE" girebilir
 * ("4 SAAT VE ÜZERİ"); girmeyince satır "4 saate kadar" okunuyor ve plato kayboluyordu.
 */
const TAIL_WORD = '(?:VE\\s*)?(?:UZERI|UZERINDE|USTU|FAZLASI|FAZLA|SONRASI|SONRA|ASKISI|AND OVER|OR MORE|OR LONGER)';

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
  /** Sıra sayısıyla yazıldı ("1. SAAT", "SECOND HOUR"): fiyat o saatin kendisinin olabilir. */
  ordinal?: boolean;
  /** Süre ifadesinin satırdaki yeri — fiyat bunun dışında aranır. */
  start: number;
  end: number;
}

function span(match: RegExpMatchArray, endMin: number, ordinal = false): DurationMatch {
  return { endMin, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, ordinal };
}

/** "1 SAAT 30 DK" gibi bileşik bir üst sınırı dakikaya çevirir. */
function compoundMinutes(a1: string, u1: string, a2?: string, u2?: string): number {
  const first = amountOf(a1) * minutesPerUnit(u1);
  const second = a2 && u2 ? amountOf(a2) * minutesPerUnit(u2) : 0;
  return first + second;
}

/**
 * Satırdaki SÜRE ifadesini bulur. Sırayla en özgülden en gevşeğe denenir;
 * ilk eşleşen kazanır.
 */
function matchDuration(line: string): DurationMatch | null {
  const amount = `${AMOUNT}\\s*(${UNIT})\\.?`;
  const compound = `${amount}(?:\\s*${AMOUNT}\\s*(${UNIT})\\.?)?`;

  // "1 SAAT 30 DK - 2 SAAT" / "30 DK - 1 SAAT": iki ucun birimi ve parça sayısı
  // farklı olabilir. Üst sınır KENDİ birimleriyle okunur.
  const ranged = line.match(new RegExp(`${compound}\\s*-\\s*${compound}`));
  if (ranged) {
    const endMin = compoundMinutes(ranged[5], ranged[6], ranged[7], ranged[8]);
    if (endMin > 0) return span(ranged, endMin);
  }

  // "0-1 SAAT" / "0-1,5 SAAT" — birim ortak, sonda yazılmış.
  const shared = line.match(new RegExp(`${AMOUNT}\\s*-\\s*${AMOUNT}\\s*(${UNIT})\\.?`));
  if (shared) {
    const endMin = amountOf(shared[2]) * minutesPerUnit(shared[3]);
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
    const endMin = amountOf(upTo[1]) * minutesPerUnit(upTo[2]);
    if (endMin > 0) return span(upTo, endMin);
  }

  // "1. SAAT" / "1. STUNDE" (sıra sayısı = o saatin sonu)
  const ordinal = line.match(/(\d+)\s*\.\s*(SAAT|SA\b|HOURS?\b|HRS?\b)/);
  if (ordinal) {
    const nth = Number(ordinal[1]);
    if (nth > 0) return span(ordinal, nth * 60, true);
  }

  // "1ST HOUR" / "2ND HOUR"
  const suffixOrdinal = line.match(/(\d+)\s*(?:ST|ND|RD|TH)\s*(HOURS?|HRS?)\b/);
  if (suffixOrdinal) {
    const nth = Number(suffixOrdinal[1]);
    if (nth > 0) return span(suffixOrdinal, nth * 60, true);
  }

  // "İLK YARIM SAAT" / "FIRST HALF HOUR" → 30 dk
  const halfHour = line.match(/(?:ILK|FIRST)\s*(?:YARIM|HALF)\s*(?:AN\s*)?(SAAT|HOUR)\b/);
  if (halfHour) return span(halfHour, 30);

  // "İLK SAAT ÜCRETSİZ" / "SECOND HOUR $5" — RAKAM YOK, sıra sözcükle yazılı.
  for (const { pattern, nth } of ORDINAL_WORDS) {
    const worded = line.match(new RegExp(`(?:${pattern})\\s*(SAAT|HOURS?|HRS?)\\b`));
    if (worded) return span(worded, nth * 60, true);
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
    // Saat yazımı ("8:00-20:00") fiyat değildir: çalışma saatli satırda ilk sayı "8" fiyat okunuyordu.
    if (line[token.end] === ':' || line[token.start - 1] === ':') continue;
    // "80P" = 80 peni → £0.80. Sadece sterlin panolarında geçerli.
    const pence = currency === 'GBP' && /^\s*P\b/.test(line.slice(token.end));
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
  ordinal: boolean;
}

/** Bir dilim satırı: süre ifadesi + ondan ayrı bir fiyat. İkisi de şart. */
function parseBracket(line: string, currency: string, column: number): BracketLine | null {
  const duration = matchDuration(line);
  if (duration === null) return null;
  const price = priceOutside(line, duration, currency, column);
  if (price === null || price < 0) return null;
  return { endMin: duration.endMin, price, ordinal: duration.ordinal === true };
}

/** Artımlı ücret adımı: "HER İLAVE SAAT 20" / "HER İLAVE 30 DAKİKA 15". */
interface IncrementStep {
  stepMin: number;
  price: number;
}

/** Artım satırının kabul edildiği en uzun boy — adım sözcüğü açıkça yazılmışsa. */
const INCREMENT_MAX_LENGTH = 48;

/**
 * Adımın KENDİ birimi: "HER İLAVE 30 DAKİKA", "HER SAAT", "EACH ADDITIONAL HOUR", "+1 SAAT".
 *
 * Adım, satırdaki süre ifadesinden değil buradan okunur: "3 SAATTEN SONRA HER SAAT 20 TL"
 * satırında süre ifadesi "3 saatten sonra"dır ve günün sonuna uzanan bir plato olarak
 * okunur — onu adım saymak 1440 dakikalık tek bir "adım" üretiyor, fiyat 3. saatten
 * 24. saate kadar donuyordu.
 */
const STEP_PHRASE = new RegExp(
  `(?:\\b(?:HER|EACH|EVERY|ILAVE|ADDITIONAL|SONRAKI|EK|EXTRA)\\b|\\+)\\s*(?:\\b(?:ILAVE|ADDITIONAL|SONRAKI|EK|EXTRA)\\b)?\\s*${AMOUNT}?\\s*(YARIM|HALF)?\\s*(${UNIT})\\b`,
);

function parseIncrement(line: string, currency: string): IncrementStep | null {
  // Artım satırı da bir tablo satırıdır. Uzun cümleler ("...EKSTRA
  // ÜCRETLENDİRME YAPILACAKTIR" içinde geçen "15 DK") buraya girmemeli:
  // dakikalık bir adım uydurup zinciri baştan bozuyordu.
  if (!EXTRA_WORD.test(line) && !/\+\s*\d/.test(line)) return null;
  const phrase = line.match(STEP_PHRASE);
  if (line.length > (phrase ? INCREMENT_MAX_LENGTH : TABULAR_MAX_LENGTH)) return null;

  const duration = matchDuration(line);
  const price = priceOutside(line, duration, currency);
  if (price === null || price <= 0) return null;

  if (phrase) {
    if (phrase[2]) return { stepMin: 30, price };
    const count = phrase[1] ? amountOf(phrase[1]) : 1;
    const stepMin = count * minutesPerUnit(phrase[3]);
    // Bir günlük ya da daha uzun "adım" bir artım değildir (abonelik/günlük ücret satırı).
    if (stepMin > 0 && stepMin < DAY_MINUTES) return { stepMin, price };
  }
  // "HER YARIM SAAT" — rakamsız yarım saat adımı.
  if (/(YARIM|HALF)/.test(line)) return { stepMin: 30, price };
  // Rakamsız adım yalnız saat olabilir ("HER İLAVE SAAT"). Dakikaya düşmek
  // 1 dakikalık adım üretir ve tarifeyi anlamsız kılar.
  if (HOUR_WORD.test(line)) return { stepMin: 60, price };
  return null;
}

/** "SAATLİK 40" / "SAAT BAŞI 40" / "SAATİ 40" / "40 TL/SAAT" / "PER HOUR 4". */
const PER_HOUR_WORD = /(SAATLIK|SAAT BASI|SAATI\b|PER HOUR|\/\s*SAAT|\/\s*HOUR|\/\s*HR|HOURLY)/;
/**
 * Önünde sayı varsa "SAATLİK" bir SÜREDİR: "1 SAATLİK 40 / 2 SAATLİK 70" dilim tablosudur,
 * "İLK 1 SAATİ 40" ilk dilimdir. Saatlik ücret sanılınca ilk satır kayboluyor ve tablonun
 * üstüne uydurma bir +₺40/saat zinciri ekleniyordu.
 */
const COUNTED_HOUR = /\d\s*(SAATLIK|SAATI)\b/;

function parsePerHour(line: string, currency: string): number | null {
  if (!PER_HOUR_WORD.test(line) || EXTRA_WORD.test(line) || COUNTED_HOUR.test(line)) return null;
  const price = priceOutside(line, matchDuration(line), currency);
  return price !== null && price > 0 ? price : null;
}

interface FlatLine {
  price: number;
  /** 'daily' her 24 saatte yeniden başlar; 'fixed' süreden bağımsız tek ödemedir. */
  kind: 'daily' | 'fixed';
}

/**
 * Sabit/günlük ücretin fiyatı: süre ifadesinin dışında, ardından birim gelmeyen ve "7/24"
 * gibi bir yazımın parçası olmayan İLK sayı.
 */
function flatPrice(line: string): number | null {
  const duration = matchDuration(line);
  for (const token of numberTokens(line)) {
    if (duration !== null && token.start >= duration.start && token.start < duration.end) continue;
    if (NON_PRICE_AFTER.test(line.slice(token.end))) continue;
    if (/\/\s*$/.test(line.slice(0, token.start))) continue;
    return token.value > 0 ? token.value : null;
  }
  return null;
}

/** "GÜNLÜK 200" / "ALL DAY $12" / "SABİT ÜCRET 50 TL" — süre ifadesinin dışındaki fiyat. */
function parseFlat(line: string): FlatLine | null {
  const daily = DAILY_WORD.test(line);
  if (!daily && !FIXED_WORD.test(line)) return null;
  // "12-24 SAAT 130 ₺" bir DİLİM satırıdır; "24 SAAT" kalıbına takılıp günlük tavan
  // sayılırsa hem o dilim kaybolur hem tavan uydurulur. Aralık taşıyan satır asla sabit değildir.
  if (new RegExp(`\\d+\\s*(?:${UNIT})?\\.?\\s*-\\s*\\d+`).test(line)) return null;
  // "MAKS. HIZ 10 KM", "MAXIMUM HEIGHT 2.10M": bunlar ücret değil. Yalnız MAKS/MAX ile
  // tanınan satırdan para birimi istenir.
  if (daily && !STRONG_DAILY_WORD.test(line) && WEAK_DAILY_WORD.test(line)) {
    if (!CURRENCY_PATTERNS.some((c) => c.match.test(line))) return null;
  }
  const kind: FlatLine['kind'] = daily ? 'daily' : 'fixed';
  // Aynı satırda hem saatlik hem günlük yazılıysa ("SAATLİK 40 GÜNLÜK 200"),
  // günlük olan SONdaki sayıdır.
  const tokens = numberTokens(line);
  if (PER_HOUR_WORD.test(line) && tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    return last.value > 0 ? { price: last.value, kind } : null;
  }
  const price = flatPrice(line);
  return price !== null ? { price, kind } : null;
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

/**
 * Artım zincirinin en kısa adımı. Zincir bir günü DOLDURUR: eskiden 23 dilimde kesilip
 * günün sonuna tek sıçramayla ekstrapole ediliyordu ve 15 dakikalık adımda 7. saatte
 * gerçek ₺130 yerine ₺470 görünüyordu. Çubuk yalnız şimdiki dilimin çevresini çizer;
 * uzun liste ekranda görünmez.
 */
const MIN_CHAIN_STEP_MIN = 5;

/**
 * Bir dilim zincirini sabit adımlarla uzatır. Zincir kısa kesilirse fiyat
 * sonsuza dek DONAR ve app "artık artmıyor" der; bu yüzden son dilim her zaman
 * günlük tavana (ya da varsa sabit tavana) kadar götürülür.
 */
function extendChain(tiers: TariffTier[], step: IncrementStep, cap: number | null): void {
  const base = tiers[tiers.length - 1];
  if (!base || step.stepMin < MIN_CHAIN_STEP_MIN) return;

  for (let i = 1; ; i++) {
    const endMin = base.endMin + i * step.stepMin;
    const price = Math.round((base.cumulativePrice + i * step.price) * 100) / 100;
    if (endMin >= DAY_MINUTES) break;
    if (cap !== null && price >= cap) break;
    tiers.push({ endMin, cumulativePrice: price });
  }

  // Tavan yoksa gün, 24. saati içeren adımın fiyatıyla kapanır: fiyat donmasın, kesirli
  // adım ("₺163,33") da üretilmesin.
  const last = tiers[tiers.length - 1];
  if (cap === null && last.endMin < DAY_MINUTES) {
    const steps = Math.ceil((DAY_MINUTES - base.endMin) / step.stepMin);
    tiers.push({
      endMin: DAY_MINUTES,
      cumulativePrice: Math.round((base.cumulativePrice + steps * step.price) * 100) / 100,
    });
  }
}

/**
 * Birden çok ülkenin yazdığı simgeler: panoda yalnız simge varsa (açık kod yoksa) cihazın para
 * birimi o aileden ise o seçilir. "$" dolar kullanan her ülkede, "KR" İskandinavya'da, "元"
 * Tayvan ve Hong Kong'da, "¥" Japonya ve Çin'de yazılır.
 */
const SHARED_SYMBOLS: Array<{ code: string; family: Set<string>; explicit: RegExp }> = [
  {
    code: 'USD',
    family: new Set(['USD', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'MXN', 'TWD']),
    explicit: /\b(USD|DOLLAR)\b/,
  },
  { code: 'SEK', family: new Set(['SEK', 'NOK', 'DKK', 'ISK']), explicit: /\bSEK\b/ },
  { code: 'TWD', family: new Set(['TWD', 'HKD', 'CNY', 'MOP']), explicit: /\b(TWD|NTD)\b/ },
  { code: 'JPY', family: new Set(['JPY', 'CNY']), explicit: /\b(JPY|YEN)\b/ },
];

function resolveCurrency(detected: string | null, fallback: string, text: string): string {
  if (detected === null) return fallback;
  const shared = SHARED_SYMBOLS.find((s) => s.code === detected);
  if (shared && shared.family.has(fallback) && !shared.explicit.test(text)) return fallback;
  return detected;
}

/**
 * Dakika başı ücret ("0,05 €/min") bir dilim zinciri değildir: 5 dakikanın altındaki adım
 * saatliğe çevrilir. Zincir olarak kurulsa gün boyu her birkaç dakikada bir "fiyat artıyor"
 * uyarısı kurulurdu.
 */
const PER_MINUTE_LIMIT_MIN = 5;

export function parseTariffLines(
  lines: string[],
  fallbackCurrency: string,
  priceColumn = 0,
): ParseResult | null {
  const normalized = lines.map(normalizeLine).filter((line) => line.length > 0);
  if (normalized.length === 0) return null;

  const currency = resolveCurrency(detectCurrency(normalized), fallbackCurrency, normalized.join(' '));

  const brackets: BracketLine[] = [];
  let increment: IncrementStep | null = null;
  let perHour: number | null = null;
  let flat: FlatLine | null = null;
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
      const fixed = parseFlat(line);
      if (fixed !== null) {
        flat = fixed;
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

  if (increment !== null && increment.stepMin < PER_MINUTE_LIMIT_MIN && perHour === null) {
    perHour = (increment.price * 60) / increment.stepMin;
    increment = null;
  }

  // Günlük tavan tablodaki bir dilimden UCUZ olamaz; öyleyse okunan şey başka bir sayıdır.
  // Tavan sayılmaz ve okuma "kontrol et" uyarısıyla döner — her dilimi o sayıya kırpmak
  // sessizce yanlış fiyat göstermek demekti.
  let cap: number | null = flat?.kind === 'daily' ? flat.price : null;
  if (cap !== null) {
    const ceiling = cap;
    if (brackets.some((b) => b.price > ceiling) || (perHour !== null && perHour > ceiling)) {
      cap = null;
      flat = null;
      missedLines++;
    }
  }
  const result = (tariff: Tariff): ParseResult => ({ tariff, matchedLines, missedLines });

  // "1. Stunde 2,40 €" / "2. Stunde 2,00 €": sıra sayılı saat fiyatları ARTMIYORSA her biri o
  // saatin kendi ücretidir (artımlı). Kümülatif okununca ikinci saat bedava görünüyordu.
  if (brackets.length > 1 && brackets.every((b) => b.ordinal)) {
    brackets.sort((a, b) => a.endMin - b.endMin);
    if (brackets.some((b, i) => i > 0 && b.price <= brackets[i - 1].price)) {
      let total = 0;
      for (const bracket of brackets) {
        total = Math.round((total + bracket.price) * 100) / 100;
        bracket.price = total;
      }
    }
  }

  if (brackets.length > 0) {
    const tiers: TariffTier[] = brackets.map((b) => ({ endMin: b.endMin, cumulativePrice: b.price }));
    tiers.sort((a, b) => a.endMin - b.endMin);

    // Panoda "her ilave saat" yoksa ama saatlik ücret yazıyorsa, dilimlerden
    // sonrası o saatlik ücretle devam eder. Bu satır eskiden okunup atılıyordu:
    // "İlk 1 saat ücretsiz + saatlik 30 TL" panosu "hep bedava" çıkıyordu.
    const step = increment ?? (perHour !== null ? { stepMin: 60, price: perHour } : null);
    if (step !== null) extendChain(tiers, step, cap);

    // Günlük tavan: artış burada PLATOYA oturur, sonsuza kadar artmaz.
    if (cap !== null) tiers.push({ endMin: DAY_MINUTES, cumulativePrice: cap });

    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return result({ type: 'tiered', currency, tiers: clean, dailyMax: cap ?? undefined });
  }

  // Saatlik ücret + "her ilave X" (dilim tablosu yok): ilk saat saatlik ücretle, sonrası
  // adımla. Eskiden saatlik ücret adımın süresiyle çarpılıyordu (₺40 her 30 dakikada).
  if (perHour !== null && increment !== null) {
    const tiers: TariffTier[] = [{ endMin: 60, cumulativePrice: perHour }];
    extendChain(tiers, increment, cap);
    if (cap !== null) tiers.push({ endMin: DAY_MINUTES, cumulativePrice: cap });
    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return result({ type: 'tiered', currency, tiers: clean, dailyMax: cap ?? undefined });
  }

  // Saatlik + günlük tavan: tavansız saatlik gibi sonsuza kadar artmasın.
  const hourlyStep = perHour ?? increment?.price ?? null;
  if (hourlyStep !== null && cap !== null) {
    const tiers: TariffTier[] = [];
    const stepMin = perHour !== null ? 60 : (increment?.stepMin ?? 60);
    for (let i = 1; ; i++) {
      const endMin = i * stepMin;
      const price = i * hourlyStep;
      if (endMin >= DAY_MINUTES || price >= cap) break;
      tiers.push({ endMin, cumulativePrice: price });
    }
    tiers.push({ endMin: DAY_MINUTES, cumulativePrice: cap });
    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return result({ type: 'tiered', currency, tiers: clean, dailyMax: cap });
  }

  if (perHour !== null) return result({ type: 'hourly', currency, price: perHour });
  if (increment !== null) {
    // Tek bir "her ilave saat" satırı fiilen saatlik tarifedir. Adım saat değilse
    // ("HER 30 DK 15 TL") saatlik sanmak fiyatı yarıya indiriyordu; zincir kurulur.
    if (increment.stepMin === 60) return result({ type: 'hourly', currency, price: increment.price });
    const tiers: TariffTier[] = [{ endMin: increment.stepMin, cumulativePrice: increment.price }];
    extendChain(tiers, increment, null);
    const clean = sanitizeTiers(tiers);
    if (clean.length > 0) return result({ type: 'tiered', currency, tiers: clean });
  }
  if (flat !== null) {
    // "GÜNLÜK 250 TL" her gün yeniden başlar: 3 günlük park ₺750'dir, ₺250 değil.
    if (flat.kind === 'daily') {
      return result({
        type: 'tiered',
        currency,
        tiers: [{ endMin: DAY_MINUTES, cumulativePrice: flat.price }],
        dailyMax: flat.price,
      });
    }
    return result({ type: 'flat', currency, price: flat.price });
  }

  return null;
}

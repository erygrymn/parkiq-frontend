// Panoda birden fazla tarife varsa (hafta içi / hafta sonu, gündüz / gece)
// cihazın saatinden hangisinin geçerli olduğunu seçer. Saf — test edilir.
//
// İki düzen de gerçekte kullanılıyor:
//   SÜTUN:  "SÜRE        HAFTA İÇİ   HAFTA SONU"
//           "0-1 SAAT    50 TL       70 TL"
//   BÖLÜM:  "HAFTA İÇİ" / satırlar... / "HAFTA SONU" / satırlar...
//
// Seçim park BAŞLANGICINA göre yapılır. Oturum bir sınırı geçerse (cuma 23:00'te
// park edip cumartesi çıkmak gibi) tarife değişmez — bu yüzden hangi tarifenin
// seçildiği kullanıcıya SÖYLENİR, sessizce uygulanmaz.

export type ScheduleKind = 'weekday' | 'weekend' | 'day' | 'night';

interface Marker {
  kind: ScheduleKind;
  pattern: RegExp;
}

// Aksanlar katlanmış, büyük harfli metne göre yazılır (bkz. normalizeLine).
const MARKERS: Marker[] = [
  { kind: 'weekday', pattern: /(HAFTA ?ICI|MESAI GUNLERI|WEEKDAYS?|MON ?- ?FRI|PAZARTESI ?- ?CUMA)/ },
  {
    kind: 'weekend',
    pattern: /(HAFTA ?SONU|WEEKENDS?|CUMARTESI|PAZAR\b|SAT ?- ?SUN|RESMI TATIL|BAYRAM|HOLIDAYS?)/,
  },
  { kind: 'day', pattern: /(GUNDUZ|DAYTIME|DAY RATE)/ },
  { kind: 'night', pattern: /(GECE|NIGHT)/ },
];

/** Gündüz/gece için yazılı saat aralığı yoksa kullanılan varsayılanlar. */
const DEFAULT_WINDOW: Record<'day' | 'night', { start: number; end: number }> = {
  day: { start: 8, end: 20 },
  night: { start: 20, end: 8 },
};

/** "08:00 - 20:00" / "08.00-20.00" — etiketin yanındaki saat penceresi. */
function timeWindow(line: string): { start: number; end: number } | null {
  const match = line.match(/(\d{1,2})[:.]\d{2}\s*[-–—]\s*(\d{1,2})[:.]\d{2}/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > 23 || end > 23) return null;
  return { start, end };
}

export function appliesAt(
  kind: ScheduleKind,
  at: Date,
  window?: { start: number; end: number } | null,
): boolean {
  if (kind === 'weekday') {
    const day = at.getDay();
    return day >= 1 && day <= 5;
  }
  if (kind === 'weekend') {
    const day = at.getDay();
    return day === 0 || day === 6;
  }
  const range = window ?? DEFAULT_WINDOW[kind];
  const hour = at.getHours();
  // Gece penceresi gün dönümünü aşar (20:00 → 08:00).
  return range.start <= range.end
    ? hour >= range.start && hour < range.end
    : hour >= range.start || hour < range.end;
}

/** Satırdaki etiketleri soldan sağa, konumlarıyla verir. */
function markersIn(line: string): Array<{ kind: ScheduleKind; at: number }> {
  const found: Array<{ kind: ScheduleKind; at: number }> = [];
  for (const marker of MARKERS) {
    const match = line.match(marker.pattern);
    if (match && match.index !== undefined) found.push({ kind: marker.kind, at: match.index });
  }
  return found.sort((a, b) => a.at - b.at);
}

export interface ScheduleSelection {
  /** Ayrıştırıcıya verilecek satırlar (bölümlü panoda yalnız geçerli bölüm). */
  lines: string[];
  /** Hangi tarife seçildi; pano tek tarifeliyse null. */
  kind: ScheduleKind | null;
  /** Sütunlu panoda okunacak fiyat sütunu (0 = ilk). */
  priceColumn: number;
}

/**
 * Panoyu tek tarifeye indirger. `normalize`, ayrıştırıcının kullandığı
 * biçimleyicidir — etiketler onun ürettiği metne göre aranır.
 */
export function selectSchedule(
  lines: string[],
  at: Date,
  normalize: (line: string) => string,
): ScheduleSelection {
  const normalized = lines.map(normalize);

  // SÜTUN düzeni: bir başlık satırında iki ya da daha fazla etiket yan yana.
  for (let i = 0; i < normalized.length; i += 1) {
    const found = markersIn(normalized[i]);
    const kinds = [...new Set(found.map((f) => f.kind))];
    if (kinds.length < 2) continue;

    const window = timeWindow(normalized[i]);
    const column = found.findIndex((f) => appliesAt(f.kind, at, window));
    if (column >= 0) return { lines, kind: found[column].kind, priceColumn: column };
  }

  // BÖLÜM düzeni: tek başına etiket satırı, altındaki satırlar ona ait.
  // Etiket satırı fiyat taşımaz; taşıyorsa o zaten normal bir tarife satırıdır.
  const sections: Array<{ kind: ScheduleKind; window: { start: number; end: number } | null; lines: string[] }> = [];
  let current: (typeof sections)[number] | null = null;
  const preamble: string[] = [];

  for (let i = 0; i < normalized.length; i += 1) {
    const found = markersIn(normalized[i]);
    const isPureLabel = found.length === 1 && !/\d/.test(normalized[i].replace(/\d{1,2}[:.]\d{2}/g, ''));
    if (isPureLabel) {
      current = { kind: found[0].kind, window: timeWindow(normalized[i]), lines: [] };
      sections.push(current);
      continue;
    }
    if (current) current.lines.push(lines[i]);
    else preamble.push(lines[i]);
  }

  const applicable = sections.find((s) => s.lines.length > 0 && appliesAt(s.kind, at, s.window));
  if (sections.length >= 2 && applicable) {
    return { lines: [...preamble, ...applicable.lines], kind: applicable.kind, priceColumn: 0 };
  }

  return { lines, kind: null, priceColumn: 0 };
}

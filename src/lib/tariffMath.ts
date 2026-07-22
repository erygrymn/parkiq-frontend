// design.md §5.9 — TEK KAYNAK MATEMATİĞİ.
// Dilim/knob/amber hesabının tamamı bu saf modülde yapılır. RN in-app çubuğu ve
// SwiftUI Live Activity yalnız bu çıktıyı render eder; kendi matematiğini türetmek
// her iki tarafta da yasaktır (İlke 5: "veri asla yalan söylemez").
// Fiyatlar KÜMÜLATİF TOPLAMDIR: "Now ₺50 · Next ₺100"daki ₺100 o dilimde ödenecek
// toplam tutardır, ek tutar değil.
// Girdi güvenilmez (elle giriş + OCR): tiers burada normalize edilir — sıralama,
// geçersiz/0 süreli dilim eleme, kümülatif fiyat monotonluğu.

export type TariffType = 'tiered' | 'flat' | 'hourly';

export interface TariffTier {
  /** Dilim SONU, park başlangıcından itibaren kümülatif dakika (1h → 60, 2h → 120). */
  endMin: number;
  /** O dilimde çıkışta ödenecek KÜMÜLATİF toplam. */
  cumulativePrice: number;
}

export interface Tariff {
  type: TariffType;
  /** ISO 4217 (örn. "TRY", "EUR"). Formatlama UI katmanının işi. */
  currency: string;
  /** type === 'tiered' için zorunlu; normalize edilmemiş olabilir. */
  tiers?: TariffTier[];
  /** type === 'flat': sabit toplam. type === 'hourly': saat başı tutar. */
  price?: number;
}

export interface TariffSegment {
  startMin: number;
  /** null = açık uçlu son dilim (tanımlı son sınırın ötesi). */
  endMin: number | null;
  cumulativePrice: number;
  /** 0–100; tüm segmentlerin toplamı 100. */
  widthPct: number;
  passed: boolean;
  active: boolean;
}

export type TariffStateMode = 'none' | 'flat' | 'tiered';

/** §5.9 durum makinesi: yeşil / sınıra ≤eşik / sınır aşıldı (amber kalır, kırmızı asla). */
export type BarTone = 'green' | 'amber-approaching' | 'amber-exceeded';

export interface TariffState {
  mode: TariffStateMode;
  elapsedMin: number;
  /** Tariff.currency kopyası — ContentState kendi kendine yeterli olsun (§8). */
  currency: string | null;
  /** Şimdi çıkılırsa ödenecek kümülatif tutar (mode 'none' ise null). */
  nowPrice: number | null;
  /** Sonraki dilimde ödenecek kümülatif tutar (fiyat artmayacaksa null). */
  nextPrice: number | null;
  /** Sonraki FİYAT ARTIŞI sınırının park başlangıcından dakikası; artış yoksa null. */
  nextBoundaryMin: number | null;
  /** Sonraki fiyat artışı sınırının epoch ms karşılığı; artış yoksa null. */
  nextBoundaryAtMs: number | null;
  minutesToBoundary: number | null;
  /** barTone === 'amber-approaching' kısayolu (bildirim zamanlama vb.). */
  warn: boolean;
  barTone: BarTone;
  /** 1 tabanlı; açık uçlu bölgedeyse tiers.length + 1. */
  currentTierIndex: number | null;
  /** Çubuk segmentleri (mode 'tiered' değilse boş — flat'te çubuk gizlenir). */
  segments: TariffSegment[];
  /** Knob konumu 0–100 (çubuk yoksa null). */
  knobPct: number | null;
}

/** Görünüm penceresi: şimdiki dilim + 2 sonraki, en fazla 4 tanımlı dilim (§5.9). */
const MAX_VISIBLE_SEGMENTS = 4;
const OPEN_END_WIDTH_PCT = 22;
const MIN_SEGMENT_WIDTH_PCT = 18;
export const DEFAULT_WARN_THRESHOLD_MIN = 15;

/**
 * Güvenilmez tiers girdisini §5.9 veri modeline oturtur: endMin artan, her dilim
 * pozitif süreli (eşit/küçük endMin atılır — ilk giriş kazanır), kümülatif fiyat
 * azalmaz (azalan fiyat bir öncekine yükseltilir; negatif saved imkânsızlaşır).
 */
export function sanitizeTiers(raw: TariffTier[]): TariffTier[] {
  const sorted = raw
    .filter(
      (t) =>
        Number.isFinite(t.endMin) &&
        Number.isFinite(t.cumulativePrice) &&
        t.endMin > 0 &&
        t.cumulativePrice >= 0,
    )
    .sort((a, b) => a.endMin - b.endMin);

  const out: TariffTier[] = [];
  for (const t of sorted) {
    const prev = out[out.length - 1];
    if (prev && t.endMin <= prev.endMin) continue;
    out.push({
      endMin: t.endMin,
      cumulativePrice: prev ? Math.max(t.cumulativePrice, prev.cumulativePrice) : t.cumulativePrice,
    });
  }
  return out;
}

/** Hourly tarifeyi ihtiyaç kadar kümülatif dilime açar (1h → ₺X, 2h → ₺2X …). */
function expandTiers(tariff: Tariff, elapsedMin: number, lookaheadHours = 3): TariffTier[] {
  if (tariff.type === 'tiered') return sanitizeTiers(tariff.tiers ?? []);
  if (tariff.type === 'hourly' && tariff.price != null && tariff.price > 0) {
    const hoursNeeded = Math.floor(elapsedMin / 60) + lookaheadHours;
    const tiers: TariffTier[] = [];
    for (let h = 1; h <= hoursNeeded; h++) {
      tiers.push({ endMin: h * 60, cumulativePrice: tariff.price * h });
    }
    return tiers;
  }
  return [];
}

/** Sözleşme: tiers normalize edilmiş ve boş değil (computeTariffState garanti eder). */
function buildSegments(
  tiers: TariffTier[],
  currentIndex: number,
  elapsedMin: number,
  openEnded: boolean,
): { segments: TariffSegment[]; knobPct: number | null } {
  // Pencere: başlangıç → şimdiki dilim + 2; 4'ten fazlaysa en eskiler düşer
  // (şimdiki + 2 sonraki her zaman görünür kalır).
  const lastVisible = Math.min(tiers.length - 1, currentIndex + 2);
  const firstVisible = Math.max(0, lastVisible - (MAX_VISIBLE_SEGMENTS - 1));
  const visible = tiers.slice(firstVisible, lastVisible + 1);

  // Açık uçlu kuyruk yalnız pencere tanımlı son dilimi içeriyorsa gösterilir.
  const showOpenEnd = openEnded && lastVisible === tiers.length - 1;
  const definedBudget = showOpenEnd ? 100 - OPEN_END_WIDTH_PCT : 100;

  const durations = visible.map((t, i) => {
    const start = i === 0 ? (firstVisible === 0 ? 0 : tiers[firstVisible - 1].endMin) : visible[i - 1].endMin;
    return { start, end: t.endMin, duration: t.endMin - start, price: t.cumulativePrice };
  });
  const totalDuration = durations.reduce((sum, d) => sum + d.duration, 0);
  if (totalDuration <= 0) return { segments: [], knobPct: null };

  // Süre-orantılı genişlik + min %18 clamp (§5.9). Clamp YAPIŞKAN: bir kez 18'e
  // sabitlenen segment sonraki renormalizasyonlarda küçültülmez; kalan bütçe yalnız
  // serbest segmentler arasında süre-orantılı dağıtılır (monoton, garantili sonlanır).
  const clamped = new Set<number>();
  let widths = new Array<number>(durations.length).fill(0);
  for (;;) {
    const freeDuration = durations.reduce((s, d, i) => (clamped.has(i) ? s : s + d.duration), 0);
    const freeBudget = definedBudget - clamped.size * MIN_SEGMENT_WIDTH_PCT;
    widths = durations.map((d, i) =>
      clamped.has(i) ? MIN_SEGMENT_WIDTH_PCT : (d.duration / freeDuration) * freeBudget,
    );
    const violator = widths.findIndex((w, i) => !clamped.has(i) && w < MIN_SEGMENT_WIDTH_PCT);
    if (violator === -1) break;
    clamped.add(violator);
  }

  const segments: TariffSegment[] = durations.map((d, i) => ({
    startMin: d.start,
    endMin: d.end,
    cumulativePrice: d.price,
    widthPct: widths[i],
    passed: elapsedMin >= d.end,
    active: firstVisible + i === currentIndex,
  }));

  if (showOpenEnd) {
    segments.push({
      startMin: tiers[tiers.length - 1].endMin,
      endMin: null,
      cumulativePrice: tiers[tiers.length - 1].cumulativePrice,
      widthPct: OPEN_END_WIDTH_PCT,
      passed: false,
      active: currentIndex >= tiers.length,
    });
  }

  // Knob: segStart + (elapsedInTier/tierDuration) × segWidth — elle yüzde yasak.
  // Açık uçlu dilimde referans süre = son tanımlı dilimin süresi; segment sonunda doyar (§5.9).
  let knobPct: number | null = null;
  let acc = 0;
  for (const seg of segments) {
    if (seg.endMin !== null && elapsedMin < seg.endMin && elapsedMin >= seg.startMin) {
      knobPct = acc + ((elapsedMin - seg.startMin) / (seg.endMin - seg.startMin)) * seg.widthPct;
      break;
    }
    if (seg.endMin === null) {
      const refMin = durations[durations.length - 1].duration;
      const progress = Math.min((elapsedMin - seg.startMin) / refMin, 1);
      knobPct = acc + progress * seg.widthPct;
      break;
    }
    acc += seg.widthPct;
  }

  return { segments, knobPct };
}

export function computeTariffState(
  tariff: Tariff | null,
  parkStartMs: number,
  nowMs: number,
  warnThresholdMin: number = DEFAULT_WARN_THRESHOLD_MIN,
): TariffState {
  const elapsedMin = Math.max(0, (nowMs - parkStartMs) / 60_000);

  const empty: TariffState = {
    mode: 'none',
    elapsedMin,
    currency: tariff?.currency ?? null,
    nowPrice: null,
    nextPrice: null,
    nextBoundaryMin: null,
    nextBoundaryAtMs: null,
    minutesToBoundary: null,
    warn: false,
    barTone: 'green',
    currentTierIndex: null,
    segments: [],
    knobPct: null,
  };

  if (!tariff) return { ...empty, currency: null };

  if (tariff.type === 'flat') {
    return { ...empty, mode: 'flat', nowPrice: tariff.price ?? null };
  }

  const tiers = expandTiers(tariff, elapsedMin);
  if (tiers.length === 0) return empty;

  const currentIndex = tiers.findIndex((t) => elapsedMin < t.endMin);
  const beyondAll = currentIndex === -1;
  const effectiveIndex = beyondAll ? tiers.length : currentIndex;
  const crossedBoundary = effectiveIndex >= 1;

  const nowPrice = beyondAll
    ? tiers[tiers.length - 1].cumulativePrice
    : tiers[effectiveIndex].cumulativePrice;
  const nextTier = beyondAll ? null : tiers[effectiveIndex + 1] ?? null;

  // Sınır alanları yalnız gerçek bir FİYAT ARTIŞINI işaret eder: son dilimde/ötesinde
  // null — tüketici (local notification) fiyatı değişmeyen sınıra uyarı kurmasın.
  const nextBoundaryMin = nextTier === null ? null : tiers[effectiveIndex].endMin;
  const minutesToBoundary = nextBoundaryMin === null ? null : nextBoundaryMin - elapsedMin;

  const approaching = minutesToBoundary !== null && minutesToBoundary <= warnThresholdMin;
  const barTone: BarTone = approaching
    ? 'amber-approaching'
    : crossedBoundary
      ? 'amber-exceeded'
      : 'green';

  const { segments, knobPct } = buildSegments(tiers, effectiveIndex, elapsedMin, tariff.type === 'tiered');

  return {
    mode: 'tiered',
    elapsedMin,
    currency: tariff.currency,
    nowPrice,
    nextPrice: nextTier ? nextTier.cumulativePrice : null,
    nextBoundaryMin,
    nextBoundaryAtMs: nextBoundaryMin === null ? null : parkStartMs + nextBoundaryMin * 60_000,
    minutesToBoundary,
    warn: approaching,
    barTone,
    currentTierIndex: effectiveIndex + 1,
    segments,
    knobPct,
  };
}

export interface TariffBoundary {
  /** 1 tabanlı: bu sınırda BİTEN dilimin sırası. */
  tierIndex: number;
  atMs: number;
  /** Sınırdan önce çıkılırsa ödenecek kümülatif tutar. */
  currentPrice: number;
  /** Sınır geçilirse ödenecek kümülatif tutar (her zaman currentPrice'tan büyük). */
  nextPrice: number;
}

/**
 * Gelecekteki FİYAT ARTIŞI sınırlarını listeler — bildirimler bunları önceden
 * zamanlar (§8.4: app kapalıyken de çalışsın diye hepsi baştan kurulur).
 * Fiyatı artırmayan sınır uyarı üretmez.
 */
export function listUpcomingBoundaries(
  tariff: Tariff | null,
  parkStartMs: number,
  fromMs: number,
  maxCount = 8,
): TariffBoundary[] {
  if (!tariff || tariff.type === 'flat') return [];
  const fromMin = Math.max(0, (fromMs - parkStartMs) / 60_000);
  const tiers = expandTiers(tariff, fromMin, maxCount + 2);

  const out: TariffBoundary[] = [];
  for (let i = 0; i < tiers.length - 1 && out.length < maxCount; i++) {
    const boundaryMin = tiers[i].endMin;
    if (boundaryMin <= fromMin) continue;
    if (tiers[i + 1].cumulativePrice <= tiers[i].cumulativePrice) continue;
    out.push({
      tierIndex: i + 1,
      atMs: parkStartMs + boundaryMin * 60_000,
      currentPrice: tiers[i].cumulativePrice,
      nextPrice: tiers[i + 1].cumulativePrice,
    });
  }
  return out;
}

export interface ExitSummary {
  /** Çıkışta ödenen kümülatif tutar. */
  paid: number | null;
  /**
   * saved = nextTierPrice − currentTierPrice; yalnız sonraki dilim sınırından önce
   * çıkıldığı için gerçekleşir. Son dilimde/sınır ötesinde 0; tarifesiz ve flat'te
   * TANIMSIZ (null) — hiçbir yüzeyde gösterilmez (§5.9 veri modeli).
   */
  saved: number | null;
}

export function computeExitSummary(tariff: Tariff | null, parkStartMs: number, exitMs: number): ExitSummary {
  if (!tariff) return { paid: null, saved: null };
  if (tariff.type === 'flat') return { paid: tariff.price ?? null, saved: null };

  const state = computeTariffState(tariff, parkStartMs, exitMs);
  if (state.mode !== 'tiered' || state.nowPrice === null) return { paid: null, saved: null };
  return {
    paid: state.nowPrice,
    saved: state.nextPrice === null ? 0 : Math.max(0, state.nextPrice - state.nowPrice),
  };
}

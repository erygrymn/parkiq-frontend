import { computeExitSummary } from './tariffMath';
import type { ParkSession } from '../state/sessionStore';

// §11.2b aylık tasarruf serisi — saf hesap, grafikten bağımsız test edilir.

export interface MonthBucket {
  /** "2026-07" — sıralama ve etiket için. */
  key: string;
  /** Ayın ilk gününün epoch ms'i (etiket biçimleme için). */
  startMs: number;
  saved: number;
  paid: number;
  sessions: number;
}

function monthKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Son `months` ayı, boş aylar dahil, kronolojik döner — grafikte delik olmaz.
 * Yalnız tek para birimli oturumlar toplanır (karışıksa toplam yanıltıcı olur).
 */
export function monthlySavings(
  sessions: ParkSession[],
  nowMs: number,
  months: number = 6,
): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();
  const now = new Date(nowMs);

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(date.getTime());
    buckets.set(key, { key, startMs: date.getTime(), saved: 0, paid: 0, sessions: 0 });
  }

  for (const session of sessions) {
    if (session.endedAtMs === null) continue;
    const bucket = buckets.get(monthKey(session.startedAtMs));
    if (!bucket) continue; // pencere dışı

    bucket.sessions++;
    const exit = computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs);
    if (exit.saved !== null) bucket.saved += exit.saved;
    if (exit.paid !== null) bucket.paid += exit.paid;
  }

  return [...buckets.values()];
}

/** Y ekseni için yuvarlak üst sınır (₺0/₺100/₺200 gibi tabular tick'ler). */
export function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = magnitude * step;
    if (candidate >= value) return candidate;
  }
  return magnitude * 10;
}

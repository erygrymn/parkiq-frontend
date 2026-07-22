import { t } from '../localization';
import type { Tariff } from './tariffMath';

// Para/saat/süre biçimleme — tüm yüzeyler aynı biçimden geçer (İlke 5: para rakamla konuşur).

export function formatMoney(amount: number, currency: string, locale: string = 'en'): string {
  try {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Yerel saat, 24s "14:04". */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Sayaç: ana blok "1:23" + saniye bloğu ":47" (§7.5 — saniye görsel olarak küçülür). */
export function formatElapsed(elapsedMs: number): { main: string; seconds: string } {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { main: `${h}:${String(m).padStart(2, '0')}`, seconds: `:${String(s).padStart(2, '0')}` };
}

/** Damga süresi: "1H 45M" / "45M" (uppercase display satırlarında kullanılır). */
export function formatDurationStamp(elapsedMs: number): string {
  const totalMin = Math.max(0, Math.round(elapsedMs / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}H ${m}M` : `${m}M`;
}

/** Tarife hafızası önerisi için kısa özet: "₺50 / hour" · "₺80 flat". */
export function formatTariffSummary(tariff: Tariff, locale: string = 'en'): string {
  const amount = tariff.price != null ? formatMoney(tariff.price, tariff.currency, locale) : '';
  if (tariff.type === 'hourly') return t('perHour', { amount });
  if (tariff.type === 'flat') return t('flatRate', { amount });
  const tiers = tariff.tiers ?? [];
  const first = tiers[0];
  return first ? formatMoney(first.cumulativePrice, tariff.currency, locale) : '';
}

export function isSameDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Gün grubu başlığı için kısa tarih: "22 Jul" / "22 Tem". */
export function formatDateShort(ms: number, locale: string = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(ms));
  } catch {
    const d = new Date(ms);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

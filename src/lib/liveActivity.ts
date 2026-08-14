import {
  endLiveActivity,
  isLiveActivityAvailable,
  setWidgetData,
  startLiveActivity,
  updateLiveActivity,
  type LiveActivityPayload,
} from '../../modules/parkiq-live-activity';
import { formatDurationStamp, formatMoney } from './format';
import { monthlySavings } from './monthlyStats';
import { computeExitSummary, computeTariffState } from './tariffMath';
import { getLocale, t } from '../localization';
import type { ParkSession } from '../state/sessionStore';

// design.md §8 — Live Activity beslemesi.
// BAĞLAYICI: payload tamamen tariffMath ÇIKTISINDAN türer. SwiftUI tarafı
// kendi hesabını yapmaz; senkron garantisi buradan gelir (§5.9 tek kaynak).
//
// Aynı kural METİN için de geçerli: extension'ın sözlüğü yoktur, gördüğü her
// etiket burada dile çevrilip gönderilir. Yeni bir dil eklendiğinde Swift'e
// dokunmak gerekmez.
//
// §4.10: Live Activity/widget işletim sistemi yetenekleridir — premium kapısı YOK.

export { isLiveActivityAvailable };

/** Widget'ın statik etiketleri; App Group kutusuna yazılır. */
function widgetStrings(): Record<string, string> {
  return {
    wNoSession: t('wNoSession'),
    wSavedLabel: t('wSavedLabel'),
    wParkTitle: t('wParkTitle'),
    wParkHint: t('wParkHint'),
  };
}

function buildPayload(session: ParkSession, warnThresholdMin: number): LiveActivityPayload {
  const locale = getLocale();
  const state = computeTariffState(session.tariff, session.startedAtMs, Date.now(), warnThresholdMin);
  const currency = state.currency;
  const money = (value: number | null) =>
    value !== null && currency ? formatMoney(value, currency, locale) : null;

  const nowPriceText = money(state.nowPrice);
  const nextPriceText = money(state.nextPrice);

  return {
    startedAtMs: session.startedAtMs,
    placeName: session.placeName,
    floor: session.floor || null,
    nextBoundaryAtMs: state.nextBoundaryAtMs,
    barTone: state.barTone,
    knobPct: state.knobPct,
    segments: state.segments.map((segment) => ({
      widthPct: segment.widthPct,
      cumulativePriceText: currency ? formatMoney(segment.cumulativePrice, currency, locale) : '',
      passed: segment.passed,
      active: segment.active,
    })),
    nowPriceText,
    nextPriceText,
    // Sayacın üstündeki etiket: bir sonraki dilim biliniyorsa onun fiyatı,
    // yoksa yalnız "park edildi". Sayacın kendisi her hâlükârda ileri sayar.
    heroLabel: nextPriceText ? t('laNextTier', { price: nextPriceText }) : t('laParked'),
    footerText:
      nowPriceText && nextPriceText
        ? t('laNowNext', { now: nowPriceText, next: nextPriceText })
        : null,
  };
}

/** Bu ayın tasarrufu — oturumsuz widget'ın gösterdiği tek rakam. */
function monthlySavedText(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
    const sessions = repo.listEndedSessions();
    const buckets = monthlySavings(sessions, Date.now(), 1);
    const current = buckets[buckets.length - 1];
    if (!current || current.saved <= 0) return null;
    const currency = sessions.find((s) => s.tariff?.currency)?.tariff?.currency;
    return currency ? formatMoney(current.saved, currency, getLocale()) : null;
  } catch {
    return null;
  }
}

/**
 * Widget'ın okuduğu kutuyu güncel duruma getirir. Oturum yoksa sayaç temizlenir
 * ve yerine aylık tasarruf yazılır. Dil metinleri her yazımda tazelenir —
 * kullanıcı dili değiştirdiğinde widget da değişsin diye.
 */
export function syncWidget(session: ParkSession | null): void {
  setWidgetData({
    startedAtMs: session?.startedAtMs ?? null,
    placeName: session?.placeName ?? null,
    monthlySavedText: session ? null : monthlySavedText(),
    strings: widgetStrings(),
  });
}

export function startSessionActivity(session: ParkSession, warnThresholdMin: number): void {
  void startLiveActivity(buildPayload(session, warnThresholdMin));
  syncWidget(session);
}

export function refreshSessionActivity(session: ParkSession, warnThresholdMin: number): void {
  void updateLiveActivity(buildPayload(session, warnThresholdMin));
}

/** §8.5 bitiş karesi: 3 sn yeşil flip, sonra kalkar. */
export function endSessionActivity(session: ParkSession): void {
  const exit = computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs ?? Date.now());
  const currency = session.tariff?.currency ?? null;
  const durationMs = (session.endedAtMs ?? Date.now()) - session.startedAtMs;

  const stamp =
    exit.saved !== null && exit.saved > 0 && currency
      ? t('savedStamp', { amount: formatMoney(exit.saved, currency, getLocale()) })
      : t('parkedDurationStamp', { duration: formatDurationStamp(durationMs) });

  void endLiveActivity({ startedAtMs: session.startedAtMs, finalStampText: stamp });
  syncWidget(null);
}

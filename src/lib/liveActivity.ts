import {
  endLiveActivity,
  isLiveActivityAvailable,
  setWidgetData,
  startLiveActivity,
  updateLiveActivity,
  type LiveActivityPayload,
} from '../../modules/parkiq-live-activity';
import { formatDurationStamp, formatMoney } from './format';
import { computeExitSummary, computeTariffState } from './tariffMath';
import { getLocale, t } from '../localization';
import type { ParkSession } from '../state/sessionStore';

// design.md §8 — Live Activity beslemesi.
// BAĞLAYICI: payload tamamen tariffMath ÇIKTISINDAN türer. SwiftUI tarafı
// kendi hesabını yapmaz; senkron garantisi buradan gelir (§5.9 tek kaynak).
// Premium özelliktir: çağrı noktaları isPremium kontrolünden geçer.

export { isLiveActivityAvailable };

function buildPayload(session: ParkSession, warnThresholdMin: number): LiveActivityPayload {
  const locale = getLocale();
  const state = computeTariffState(session.tariff, session.startedAtMs, Date.now(), warnThresholdMin);
  const currency = state.currency;

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
    nowPriceText: state.nowPrice !== null && currency ? formatMoney(state.nowPrice, currency, locale) : null,
    nextPriceText: state.nextPrice !== null && currency ? formatMoney(state.nextPrice, currency, locale) : null,
  };
}

export function startSessionActivity(session: ParkSession, warnThresholdMin: number): void {
  void startLiveActivity(buildPayload(session, warnThresholdMin));
  setWidgetData({ startedAtMs: session.startedAtMs, placeName: session.placeName });
}

export function refreshSessionActivity(session: ParkSession, warnThresholdMin: number): void {
  void updateLiveActivity(buildPayload(session, warnThresholdMin));
}

/** §8.5 bitiş karesi: 3 sn yeşil flip, sonra kalkar. */
export function endSessionActivity(session: ParkSession, monthlySavedText: string | null): void {
  const exit = computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs ?? Date.now());
  const currency = session.tariff?.currency ?? null;
  const durationMs = (session.endedAtMs ?? Date.now()) - session.startedAtMs;

  const stamp =
    exit.saved !== null && exit.saved > 0 && currency
      ? t('savedStamp', { amount: formatMoney(exit.saved, currency, getLocale()) })
      : t('parkedDurationStamp', { duration: formatDurationStamp(durationMs) });

  void endLiveActivity({ startedAtMs: session.startedAtMs, finalStampText: stamp });
  setWidgetData({ startedAtMs: null, placeName: null, monthlySavedText });
}

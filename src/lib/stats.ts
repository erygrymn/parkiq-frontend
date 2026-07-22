import { computeExitSummary } from './tariffMath';
import type { ParkSession } from '../state/sessionStore';

// §7.8 KPI satırı: Total saved (hero) · Sessions · Avg duration.
// Saf hesap — kalıcı katmandan bağımsız, test edilebilir.

export interface SessionStats {
  sessionCount: number;
  /** Tasarrufu bilinen oturumların toplamı; hiç yoksa null (yüzeyde gösterilmez). */
  totalSaved: number | null;
  /** totalSaved'in para birimi; karışık para birimi varsa null. */
  savedCurrency: string | null;
  /** Ortalama oturum süresi (ms); oturum yoksa null. */
  avgDurationMs: number | null;
  totalPaid: number | null;
}

export function computeStats(sessions: ParkSession[]): SessionStats {
  const ended = sessions.filter((s) => s.endedAtMs !== null);
  if (ended.length === 0) {
    return { sessionCount: 0, totalSaved: null, savedCurrency: null, avgDurationMs: null, totalPaid: null };
  }

  let totalSaved = 0;
  let totalPaid = 0;
  let moneyCount = 0;
  const currencies = new Set<string>();

  for (const session of ended) {
    const exit = computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs!);
    if (exit.paid !== null && session.tariff) {
      totalPaid += exit.paid;
      currencies.add(session.tariff.currency);
      moneyCount++;
    }
    if (exit.saved !== null) totalSaved += exit.saved;
  }

  const totalMs = ended.reduce((sum, s) => sum + (s.endedAtMs! - s.startedAtMs), 0);

  return {
    sessionCount: ended.length,
    // Karışık para birimi varsa toplam anlamsızdır — gösterme (İlke 5: veri yalan söylemez).
    totalSaved: moneyCount > 0 && currencies.size === 1 ? totalSaved : null,
    savedCurrency: currencies.size === 1 ? [...currencies][0] : null,
    avgDurationMs: Math.round(totalMs / ended.length),
    totalPaid: moneyCount > 0 && currencies.size === 1 ? totalPaid : null,
  };
}

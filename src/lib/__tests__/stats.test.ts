import { describe, expect, it } from '@jest/globals';
import { computeStats } from '../stats';
import type { ParkSession } from '../../state/sessionStore';

const H = 60 * 60_000;
const BASE = 1_700_000_000_000;

function session(over: Partial<ParkSession>): ParkSession {
  return {
    id: `s${Math.random()}`,
    startedAtMs: BASE,
    recordedAtMs: BASE,
    endedAtMs: BASE + H,
    floor: '',
    note: '',
    tariff: null,
    latitude: null,
    longitude: null,
    placeName: null,
    photoUri: null,
    reminderAtMs: null,
    ...over,
  };
}

const hourly50 = { type: 'hourly' as const, currency: 'TRY', price: 50 };

describe('computeStats (§7.8 KPI satırı)', () => {
  it('oturum yoksa her şey boş', () => {
    const s = computeStats([]);
    expect(s.sessionCount).toBe(0);
    expect(s.totalSaved).toBeNull();
    expect(s.avgDurationMs).toBeNull();
  });

  it('devam eden oturum sayılmaz (yalnız bitmiş oturumlar)', () => {
    const s = computeStats([session({ endedAtMs: null })]);
    expect(s.sessionCount).toBe(0);
  });

  it('ortalama süre bitmiş oturumlardan hesaplanır', () => {
    const s = computeStats([
      session({ endedAtMs: BASE + H }),
      session({ endedAtMs: BASE + 3 * H }),
    ]);
    expect(s.sessionCount).toBe(2);
    expect(s.avgDurationMs).toBe(2 * H);
  });

  it('tasarruf toplanır: 30. dakikada çıkış → ₺50 kaçınılmış', () => {
    // hourly ₺50: 30. dk'da nowPrice 50, nextPrice 100 → saved 50
    const s = computeStats([session({ tariff: hourly50, endedAtMs: BASE + 30 * 60_000 })]);
    expect(s.totalSaved).toBe(50);
    expect(s.totalPaid).toBe(50);
    expect(s.savedCurrency).toBe('TRY');
  });

  it('tarifesiz oturum toplamları bozmaz', () => {
    const s = computeStats([
      session({ tariff: hourly50, endedAtMs: BASE + 30 * 60_000 }),
      session({ tariff: null, endedAtMs: BASE + 2 * H }),
    ]);
    expect(s.sessionCount).toBe(2);
    expect(s.totalSaved).toBe(50);
    expect(s.totalPaid).toBe(50);
  });

  it('karışık para birimi: toplam gösterilmez (yanıltıcı olur)', () => {
    const s = computeStats([
      session({ tariff: hourly50, endedAtMs: BASE + 30 * 60_000 }),
      session({ tariff: { type: 'hourly', currency: 'EUR', price: 3 }, endedAtMs: BASE + 30 * 60_000 }),
    ]);
    expect(s.sessionCount).toBe(2);
    expect(s.totalSaved).toBeNull();
    expect(s.totalPaid).toBeNull();
    expect(s.savedCurrency).toBeNull();
  });
});

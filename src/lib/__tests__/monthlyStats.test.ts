import { describe, expect, it } from '@jest/globals';
import { monthlySavings, niceMax } from '../monthlyStats';
import type { ParkSession } from '../../state/sessionStore';

const hourly50 = { type: 'hourly' as const, currency: 'TRY', price: 50 };

function session(startMs: number, endMs: number | null, tariff = hourly50): ParkSession {
  return {
    id: `s${startMs}`,
    startedAtMs: startMs,
    recordedAtMs: startMs,
    endedAtMs: endMs,
    floor: '',
    note: '',
    tariff,
    latitude: null,
    longitude: null,
    placeName: null,
    photoUri: null,
    reminderAtMs: null,
  };
}

const NOW = Date.UTC(2026, 6, 15, 12, 0); // 15 Temmuz 2026

describe('monthlySavings', () => {
  it('boş aylar dahil son 6 ayı kronolojik döner (grafikte delik olmaz)', () => {
    const buckets = monthlySavings([], NOW);
    expect(buckets).toHaveLength(6);
    expect(buckets[buckets.length - 1].key).toBe('2026-07');
    const keys = buckets.map((b) => b.key);
    expect(keys).toEqual([...keys].sort());
  });

  it('tasarrufu ait olduğu aya yazar', () => {
    // 30 dk park: hourly ₺50 → now 50, next 100 → saved 50
    const july = Date.UTC(2026, 6, 3, 10, 0);
    const buckets = monthlySavings([session(july, july + 30 * 60_000)], NOW);
    const target = buckets.find((b) => b.key === '2026-07');
    expect(target?.saved).toBe(50);
    expect(target?.sessions).toBe(1);
  });

  it('devam eden oturum sayılmaz', () => {
    const july = Date.UTC(2026, 6, 3, 10, 0);
    const buckets = monthlySavings([session(july, null)], NOW);
    expect(buckets.find((b) => b.key === '2026-07')?.sessions).toBe(0);
  });

  it('pencere dışındaki eski oturum toplamı bozmaz', () => {
    const old = Date.UTC(2025, 0, 3, 10, 0);
    const buckets = monthlySavings([session(old, old + 30 * 60_000)], NOW);
    expect(buckets.reduce((sum, b) => sum + b.saved, 0)).toBe(0);
  });

  it('aynı ayda birden çok oturum toplanır', () => {
    const a = Date.UTC(2026, 6, 3, 10, 0);
    const b = Date.UTC(2026, 6, 9, 10, 0);
    const buckets = monthlySavings(
      [session(a, a + 30 * 60_000), session(b, b + 30 * 60_000)],
      NOW,
    );
    expect(buckets.find((x) => x.key === '2026-07')?.saved).toBe(100);
  });
});

describe('niceMax — yuvarlak eksen üst sınırı', () => {
  it('sıfır/negatifte taban değer', () => {
    expect(niceMax(0)).toBe(100);
    expect(niceMax(-5)).toBe(100);
  });

  it('değeri kapsayan en küçük yuvarlak sayı', () => {
    expect(niceMax(45)).toBe(50);
    expect(niceMax(120)).toBe(200);
    expect(niceMax(230)).toBe(250);
    expect(niceMax(1)).toBe(1);
  });

  it('sonuç her zaman değere eşit veya büyük', () => {
    for (const value of [7, 33, 99, 101, 640, 1234]) {
      expect(niceMax(value)).toBeGreaterThanOrEqual(value);
    }
  });
});

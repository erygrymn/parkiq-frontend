import { describe, expect, it } from '@jest/globals';
import { normalizeLine, parseTariffLines } from '../tariffParser';
import { appliesAt, selectSchedule } from '../tariffSchedule';

// Bazı panolar tek tarife yazmaz: hafta içi/sonu ya da gündüz/gece ayrımı olur.
// Hangisinin geçerli olduğu cihazın saatinden seçilir.

const CUMA = new Date(2026, 7, 14, 15, 0); // Cuma 15:00
const CUMARTESI = new Date(2026, 7, 15, 15, 0); // Cumartesi 15:00
const GECE = new Date(2026, 7, 14, 23, 0); // Cuma 23:00

const pick = (lines: string[], at: Date) => {
  const s = selectSchedule(lines, at, normalizeLine);
  return { kind: s.kind, tiers: parseTariffLines(s.lines, 'TRY', s.priceColumn)?.tariff.tiers ?? null };
};

describe('appliesAt', () => {
  it('hafta içi / hafta sonu gününü ayırır', () => {
    expect(appliesAt('weekday', CUMA)).toBe(true);
    expect(appliesAt('weekend', CUMA)).toBe(false);
    expect(appliesAt('weekend', CUMARTESI)).toBe(true);
  });

  it('gece penceresi gün dönümünü aşar', () => {
    expect(appliesAt('night', GECE)).toBe(true);
    expect(appliesAt('day', GECE)).toBe(false);
    expect(appliesAt('day', CUMA)).toBe(true);
  });

  it('yazılı saat penceresini kullanır', () => {
    expect(appliesAt('day', new Date(2026, 7, 14, 7, 0), { start: 6, end: 18 })).toBe(true);
    expect(appliesAt('day', new Date(2026, 7, 14, 19, 0), { start: 6, end: 18 })).toBe(false);
  });
});

describe('sütunlu pano', () => {
  const BOARD = ['SÜRE HAFTA İÇİ HAFTA SONU', '0-1 SAAT 50 TL 70 TL', '1-2 SAAT 90 TL 120 TL'];

  it('cuma günü hafta içi sütununu okur', () => {
    expect(pick(BOARD, CUMA)).toEqual({
      kind: 'weekday',
      tiers: [
        { endMin: 60, cumulativePrice: 50 },
        { endMin: 120, cumulativePrice: 90 },
      ],
    });
  });

  it('cumartesi hafta sonu sütununu okur', () => {
    expect(pick(BOARD, CUMARTESI)).toEqual({
      kind: 'weekend',
      tiers: [
        { endMin: 60, cumulativePrice: 70 },
        { endMin: 120, cumulativePrice: 120 },
      ],
    });
  });

  it('ücretsiz hücre sütun sırasını korur', () => {
    const board = ['SÜRE HAFTA İÇİ HAFTA SONU', '0-30 DK ÜCRETSİZ 20 TL', '30 DK - 1 SAAT 40 TL 60 TL'];
    expect(pick(board, CUMA).tiers?.[0]).toEqual({ endMin: 30, cumulativePrice: 0 });
    expect(pick(board, CUMARTESI).tiers?.[0]).toEqual({ endMin: 30, cumulativePrice: 20 });
  });
});

describe('bölümlü pano', () => {
  const BOARD = ['GÜNDÜZ (08:00-20:00)', '0-1 SAAT 30 TL', '1-2 SAAT 50 TL', 'GECE (20:00-08:00)', '0-1 SAAT 60 TL', '1-2 SAAT 100 TL'];

  it('gündüz saatinde gündüz bölümünü alır', () => {
    expect(pick(BOARD, CUMA)).toEqual({
      kind: 'day',
      tiers: [
        { endMin: 60, cumulativePrice: 30 },
        { endMin: 120, cumulativePrice: 50 },
      ],
    });
  });

  it('gece saatinde gece bölümünü alır', () => {
    expect(pick(BOARD, GECE)).toEqual({
      kind: 'night',
      tiers: [
        { endMin: 60, cumulativePrice: 60 },
        { endMin: 120, cumulativePrice: 100 },
      ],
    });
  });
});

describe('tek tarifeli pano', () => {
  it('dokunmadan geçirir', () => {
    const board = ['0-30 DK ÜCRETSİZ', '30 DK - 1 SAAT 20 TL'];
    const s = selectSchedule(board, CUMA, normalizeLine);
    expect(s.kind).toBeNull();
    expect(s.priceColumn).toBe(0);
    expect(s.lines).toEqual(board);
  });

  it('araç tipi sütunlarını takvim sanmaz', () => {
    const board = ['SÜRE OTOMOBİL MOTOSİKLET', '0-1 SAAT 50 TL 30 TL'];
    const s = selectSchedule(board, CUMARTESI, normalizeLine);
    expect(s.kind).toBeNull();
    expect(parseTariffLines(s.lines, 'TRY', s.priceColumn)?.tariff.tiers).toEqual([
      { endMin: 60, cumulativePrice: 50 },
    ]);
  });
});

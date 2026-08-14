import { describe, expect, it } from '@jest/globals';
import { fromMinutes } from '../tierUnits';

// Kayıtlı dakika değerinin editörde hangi sayı + birimle görüneceği.
// Tek birim (saat) dayatmak yarım saatlik dilimi "0.5" diye yazdırıyordu;
// hiçbir pano öyle yazmaz, "30 DK" yazar.

describe('dilim süresinin görünen birimi', () => {
  it.each([
    [30, '30', 'min'],
    [45, '45', 'min'],
    [90, '90', 'min'],
    [60, '1', 'hour'],
    [180, '3', 'hour'],
    [720, '12', 'hour'],
    [1440, '24', 'hour'],
  ])('%p dakika → %s %s', (endMin, amount, unit) => {
    expect(fromMinutes(endMin as number)).toEqual({ amount, unit });
  });

  it('ondalık saat üretmez', () => {
    for (const endMin of [15, 30, 45, 90, 150, 210]) {
      expect(fromMinutes(endMin).amount).not.toContain('.');
    }
  });
});

import { formatRangeStart } from '../tierUnits';

describe('dilim aralığının başlangıcı', () => {
  it('ilk dilim sıfırdan başlar', () => {
    expect(formatRangeStart(0, 'hour')).toBe('0');
    expect(formatRangeStart(0, 'min')).toBe('0');
  });

  it('satırın kendi birimiyle yazar', () => {
    expect(formatRangeStart(180, 'hour')).toBe('3');
    expect(formatRangeStart(30, 'min')).toBe('30');
  });

  it('dönüşmeyen değeri kendi birimiyle gösterir', () => {
    // Önceki dilim 30 dk bitiyor, bu satır saatle yazılmış: "0.5" yazmak yerine
    // "30dk" yazmak doğruyu söyler.
    expect(formatRangeStart(30, 'hour')).toBe('30dk');
    expect(formatRangeStart(90, 'hour')).toBe('90dk');
  });
});

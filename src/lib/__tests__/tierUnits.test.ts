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

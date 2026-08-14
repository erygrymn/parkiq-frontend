import { describe, expect, it } from '@jest/globals';
import type { OcrBlock } from '../../../modules/parkiq-ocr';
import { assembleRows } from '../ocrRows';
import { normalizeLine, parseTariffLines } from '../tariffParser';
import { selectSchedule } from '../tariffSchedule';
import { formatRangeStart, fromMinutes, minutesOf } from '../tierUnits';

// Taranan pano ile ekranda görünen dilim satırları AYNI ŞEYİ söylemeli.
// OCR kümülatif dilim üretir; editör onu aralık satırlarına böler. Bu testler
// o çevrimin panoyu bozmadığını garanti eder.

const ROW_H = 0.035;
const row = (y: number, left: string, right: string): OcrBlock[] => [
  { text: left, x: 0.08, y, height: ROW_H },
  { text: right, x: 0.55, y, height: ROW_H },
];

/** Aydın ADÜ panosu — cihazda taranan gerçek pano. */
const BOARD: OcrBlock[] = [
  { text: 'ÜCRETLİ OTOPARK', x: 0.1, y: 0.9, height: 0.07 },
  ...row(0.74, '0-30 DK', 'ÜCRETSİZ'),
  ...row(0.68, '30 DK - 1 SAAT', '20 ₺'),
  ...row(0.62, '1-3 SAAT', '50 ₺'),
  ...row(0.56, '3-6 SAAT', '70 ₺'),
  ...row(0.5, '6-9 SAAT', '90 ₺'),
  ...row(0.44, '9-12 SAAT', '110 ₺'),
  ...row(0.38, '12-24 SAAT', '130 ₺'),
];

function scan() {
  const lines = assembleRows(BOARD);
  const schedule = selectSchedule(lines, new Date(2026, 7, 14, 15, 0), normalizeLine);
  return parseTariffLines(schedule.lines, 'TRY', schedule.priceColumn)?.tariff.tiers ?? [];
}

/** Editörün bir dilim için gösterdiği satır. */
function editorRow(tiers: { endMin: number; cumulativePrice: number }[], index: number) {
  const { amount, unit } = fromMinutes(tiers[index].endMin);
  const previousEnd = index === 0 ? 0 : tiers[index - 1].endMin;
  return {
    start: formatRangeStart(previousEnd, unit),
    end: amount,
    unit,
    price: tiers[index].cumulativePrice,
  };
}

describe('taranan pano → dilim editörü', () => {
  it('editör satırları panonun yazdığı aralıkların aynısı', () => {
    const tiers = scan();
    const shown = tiers.map((_, i) => editorRow(tiers, i));

    expect(shown).toEqual([
      { start: '0', end: '30', unit: 'min', price: 0 }, // 0-30 DK ÜCRETSİZ
      { start: '30dk', end: '1', unit: 'hour', price: 20 }, // 30 DK - 1 SAAT
      { start: '1', end: '3', unit: 'hour', price: 50 },
      { start: '3', end: '6', unit: 'hour', price: 70 },
      { start: '6', end: '9', unit: 'hour', price: 90 },
      { start: '9', end: '12', unit: 'hour', price: 110 },
      { start: '12', end: '24', unit: 'hour', price: 130 },
    ]);
  });

  it('editörde gösterilen değerler aynı dilimlere geri döner', () => {
    // Kullanıcı hiçbir şeye dokunmadan "Tamam" derse tarife değişmemeli.
    const tiers = scan();
    const roundTripped = tiers.map((tier) => {
      const { amount, unit } = fromMinutes(tier.endMin);
      return { endMin: Number(amount) * minutesOf(unit), cumulativePrice: tier.cumulativePrice };
    });
    expect(roundTripped).toEqual(tiers);
  });

  it('hiçbir dilim ondalık saat olarak gösterilmez', () => {
    for (const tier of scan()) {
      expect(fromMinutes(tier.endMin).amount).not.toContain('.');
    }
  });
});

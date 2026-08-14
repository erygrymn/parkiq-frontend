import { describe, expect, it } from '@jest/globals';
import type { OcrBlock } from '../../../modules/parkiq-ocr';
import { assembleRows } from '../ocrRows';
import { parseTariffLines } from '../tariffParser';

// Aydın ADÜ otopark panosu — cihazda yanlış okunan gerçek pano.
// Vision iki sütunu AYRI bloklar döndürür; süre solda, fiyat sağda.
// Origin sol-ALT olduğu için üstteki satırın y'si daha büyüktür.

const ROW_HEIGHT = 0.035;

/** Tek satır = solda süre bloğu, sağda fiyat bloğu. */
function row(y: number, left: string, right: string): OcrBlock[] {
  return [
    { text: left, x: 0.08, y, height: ROW_HEIGHT },
    { text: right, x: 0.55, y, height: ROW_HEIGHT },
  ];
}

const BOARD: OcrBlock[] = [
  { text: 'ÜCRETLİ', x: 0.1, y: 0.92, height: 0.07 },
  { text: 'OTOPARK', x: 0.1, y: 0.84, height: 0.07 },
  ...row(0.74, '0-30 DK', 'ÜCRETSİZ'),
  ...row(0.68, '30 DK - 1 SAAT', '20 ₺'),
  ...row(0.62, '1-3 SAAT', '50 ₺'),
  ...row(0.56, '3-6 SAAT', '70 ₺'),
  ...row(0.5, '6-9 SAAT', '90 ₺'),
  ...row(0.44, '9-12 SAAT', '110 ₺'),
  ...row(0.38, '12-24 SAAT', '130 ₺'),
  // Dip notlar: tabloya benzeyen sayılar taşırlar ama dilim DEĞİLDİRLER.
  {
    text: 'ÖDEMENİZİ YAPTIKTAN SONRA 15 DK İÇERİSİNDE OTOPARKTAN ÇIKINIZ. AKSİ HALDE EKSTRA ÜCRETLENDİRME YAPILACAKTIR.',
    x: 0.06,
    y: 0.16,
    height: 0.02,
  },
  { text: 'OTOPARKIMIZDA 7/24 KAMERA SİSTEMİ İLE KAYIT YAPILMAKTADIR.', x: 0.06, y: 0.12, height: 0.02 },
];

describe('assembleRows', () => {
  it('aynı satırdaki sütunları soldan sağa birleştirir', () => {
    const rows = assembleRows(BOARD);
    expect(rows).toContain('0-30 DK ÜCRETSİZ');
    expect(rows).toContain('30 DK - 1 SAAT 20 ₺');
    expect(rows).toContain('12-24 SAAT 130 ₺');
  });

  it('satırları yukarıdan aşağıya sıralar', () => {
    const rows = assembleRows(BOARD);
    expect(rows[0]).toBe('ÜCRETLİ');
    expect(rows.indexOf('0-30 DK ÜCRETSİZ')).toBeLessThan(rows.indexOf('1-3 SAAT 50 ₺'));
  });

  it('sütun sırası bozuk gelse de x konumuna göre düzeltir', () => {
    // Vision blokları rastgele sırada döndürebilir.
    const shuffled = [...BOARD].reverse();
    expect(assembleRows(shuffled)).toContain('30 DK - 1 SAAT 20 ₺');
  });

  it('bozuk/eksik blokları eler, çökmez', () => {
    const junk = [
      { text: '   ', x: 0.1, y: 0.5, height: 0.03 },
      { text: 'OK', x: 0.1, y: Number.NaN, height: 0.03 },
    ] as OcrBlock[];
    expect(assembleRows(junk)).toEqual([]);
    expect(assembleRows([])).toEqual([]);
  });
});

describe('pano → tarife (uçtan uca)', () => {
  it('ADÜ panosunu doğru dilimlere çevirir', () => {
    const parsed = parseTariffLines(assembleRows(BOARD), 'TRY');
    expect(parsed).not.toBeNull();
    expect(parsed?.tariff.type).toBe('tiered');
    expect(parsed?.tariff.currency).toBe('TRY');
    expect(parsed?.tariff.tiers).toEqual([
      { endMin: 30, cumulativePrice: 0 }, // 0-30 DK ücretsiz
      { endMin: 60, cumulativePrice: 20 }, // 30 DK - 1 SAAT
      { endMin: 180, cumulativePrice: 50 },
      { endMin: 360, cumulativePrice: 70 },
      { endMin: 540, cumulativePrice: 90 },
      { endMin: 720, cumulativePrice: 110 },
      { endMin: 1440, cumulativePrice: 130 },
    ]);
  });

  it('sütunlar ayrı satır sanıldığında ortaya çıkan hatayı bir daha yapmaz', () => {
    // Regresyon: eskiden "0-30 DK" tek başına ayrıştırılıyor ve dilim sınırı
    // olan 30 fiyat sanılıyordu; sonra kümülatif kilit tüm dilimleri 30'a
    // sabitliyordu (cihazda görülen tablo).
    const parsed = parseTariffLines(assembleRows(BOARD), 'TRY');
    const prices = parsed?.tariff.tiers?.map((t) => t.cumulativePrice) ?? [];
    expect(new Set(prices).size).toBeGreaterThan(1);
    expect(prices).not.toContain(30);
  });
});

import { describe, expect, it } from '@jest/globals';
import { CARD_WIDTH, fitHeroSize, heroWidthUnits } from '../../components/SavingsCard';

/**
 * Paylaşım kartı ekran dışında TEK karede çizilip fotoğraflanıyor: taşan bir
 * satırı düzeltecek ikinci bir kare yok. Bu yüzden punto seçimi burada kilitli.
 *
 * Aşağıdaki genişlikler Inter Black'ten GERÇEKTEN ölçüldü (punto=100, wght=900,
 * birim = genişlik / punto). Test bağımsız olsun diye üretimdeki tahmin
 * fonksiyonu değil bu ölçümler kullanılıyor.
 */
const MEASURED: Record<string, number> = {
  SAVED: 3.53,
  GESPART: 4.78,
  PARKED: 4.13,
  'SAVED.': 3.79,
  'CEBİNDE.': 4.63,
  '$5.': 1.56,
  '$1,250.': 3.58,
  '₺50': 1.98,
};

const USABLE = CARD_WIDTH - 96 * 2;

/** Seçilen puntoda GERÇEK genişlik kartın içinde kalıyor mu. */
function overflow(lines: string[]): number {
  const size = fitHeroSize(lines);
  const widest = Math.max(
    ...lines.map((line, i) => {
      const text = i === lines.length - 1 ? `${line}.` : line;
      const units = MEASURED[text];
      if (units === undefined) throw new Error(`ölçüm yok: ${text}`);
      return units * size;
    }),
  );
  return widest - USABLE;
}

describe('fitHeroSize', () => {
  it('İngilizce "SAVED / $5" satır bölmeden sığar', () => {
    expect(overflow(['SAVED', '$5'])).toBeLessThanOrEqual(0);
  });

  it('Türkçe "₺50 / CEBİNDE" sığar', () => {
    expect(overflow(['₺50', 'CEBİNDE'])).toBeLessThanOrEqual(0);
  });

  it('en uzun dil karşılığı (Almanca GESPART) sığar', () => {
    expect(overflow(['GESPART', '$5'])).toBeLessThanOrEqual(0);
  });

  it('tarifesiz oturumun "PARKED" damgası sığar', () => {
    expect(overflow(['PARKED', '$5'])).toBeLessThanOrEqual(0);
  });

  it('dört haneli tutar sığar', () => {
    expect(overflow(['SAVED', '$1,250'])).toBeLessThanOrEqual(0);
  });

  it('tahmin gerçeğin altında KALMAZ — eksik tahmin satırı böler', () => {
    for (const [text, measured] of Object.entries(MEASURED)) {
      expect(heroWidthUnits(text)).toBeGreaterThanOrEqual(measured);
    }
  });

  it('geniş harfler dar harflerden fazla yer tutar', () => {
    expect(heroWidthUnits('WWWWW')).toBeGreaterThan(heroWidthUnits('IIIII'));
  });

  it('punto tavanı aşılmaz', () => {
    expect(fitHeroSize(['$5', '$5'])).toBeLessThanOrEqual(288);
  });
});

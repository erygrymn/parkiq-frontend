import { describe, expect, it } from '@jest/globals';
import { parseTariffLines } from '../tariffParser';
import { computeTariffState } from '../tariffMath';

// Gerçek otopark panolarında görülen yazım biçimleri.
// OCR satır satır döner; ayrıştırıcı bunları KÜMÜLATİF tarifeye çevirmeli.

const parse = (lines: string[], currency = 'TRY') => parseTariffLines(lines, currency);

describe('parseTariffLines — Türkçe panolar', () => {
  it('klasik aralık listesi', () => {
    const result = parse(['OTOPARK ÜCRET TARİFESİ', '0-1 SAAT 50 TL', '1-2 SAAT 100 TL', '2-3 SAAT 140 TL']);
    expect(result?.tariff).toEqual({
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 60, cumulativePrice: 50 },
        { endMin: 120, cumulativePrice: 100 },
        { endMin: 180, cumulativePrice: 140 },
      ],
    });
  });

  it('sıra sayılı yazım: "1. SAAT"', () => {
    const result = parse(['1. SAAT 40 TL', '2. SAAT 70 TL']);
    expect(result?.tariff.tiers).toEqual([
      { endMin: 60, cumulativePrice: 40 },
      { endMin: 120, cumulativePrice: 70 },
    ]);
  });

  it('"İLK 2 SAAT" + "HER İLAVE SAAT" → kümülatif zincire çevrilir', () => {
    const result = parse(['İLK 2 SAAT 80 TL', 'HER İLAVE SAAT 30 TL']);
    const tiers = result?.tariff.tiers ?? [];
    expect(tiers[0]).toEqual({ endMin: 120, cumulativePrice: 80 });
    // İlave saatler TOPLAM olarak birikir: 110, 140, 170
    expect(tiers[1]).toEqual({ endMin: 180, cumulativePrice: 110 });
    expect(tiers[2]).toEqual({ endMin: 240, cumulativePrice: 140 });
    expect(tiers.every((t, i) => i === 0 || t.cumulativePrice > tiers[i - 1].cumulativePrice)).toBe(true);
  });

  it('dakika bazlı dilim', () => {
    const result = parse(['30 DAKİKA 20 TL', '60 DAKİKA 35 TL']);
    expect(result?.tariff.tiers).toEqual([
      { endMin: 30, cumulativePrice: 20 },
      { endMin: 60, cumulativePrice: 35 },
    ]);
  });

  it('saatlik tek ücret', () => {
    const result = parse(['SAATLİK 45 TL']);
    expect(result?.tariff).toEqual({ type: 'hourly', currency: 'TRY', price: 45 });
  });

  it('"40 TL/SAAT" biçimi', () => {
    const result = parse(['ÜCRET: 40 TL/SAAT']);
    expect(result?.tariff.type).toBe('hourly');
    expect(result?.tariff.price).toBe(40);
  });

  it('günlük sabit ücret', () => {
    const result = parse(['GÜNLÜK 250 TL']);
    expect(result?.tariff).toEqual({ type: 'flat', currency: 'TRY', price: 250 });
  });

  it('₺ sembolü para birimini belirler', () => {
    const result = parse(['0-1 SAAT 50₺', '1-2 SAAT 90₺'], 'EUR');
    expect(result?.tariff.currency).toBe('TRY');
  });
});

describe('parseTariffLines — İngilizce panolar', () => {
  it('saat aralıkları', () => {
    const result = parse(['PARKING RATES', '0-1 HOUR $3', '1-2 HOURS $5.50']);
    expect(result?.tariff.currency).toBe('USD');
    expect(result?.tariff.tiers).toEqual([
      { endMin: 60, cumulativePrice: 3 },
      { endMin: 120, cumulativePrice: 5.5 },
    ]);
  });

  it('"EACH ADDITIONAL HOUR" zinciri', () => {
    const result = parse(['FIRST 3 HOURS £6', 'EACH ADDITIONAL HOUR £2']);
    const tiers = result?.tariff.tiers ?? [];
    expect(result?.tariff.currency).toBe('GBP');
    expect(tiers[0]).toEqual({ endMin: 180, cumulativePrice: 6 });
    expect(tiers[1]).toEqual({ endMin: 240, cumulativePrice: 8 });
  });

  it('per hour', () => {
    const result = parse(['PER HOUR €2.50']);
    expect(result?.tariff).toEqual({ type: 'hourly', currency: 'EUR', price: 2.5 });
  });

  it('flat rate', () => {
    const result = parse(['FLAT RATE $12']);
    expect(result?.tariff).toEqual({ type: 'flat', currency: 'USD', price: 12 });
  });
});

describe('parseTariffLines — düzensiz gerçek panolar', () => {
  it('dilim süreleri ve artışlar eşit olmak zorunda değil', () => {
    const result = parse([
      '0-1 SAAT 50 TL',
      '1-2 SAAT 90 TL', // +40
      '2-4 SAAT 120 TL', // 2 saatlik dilim, +30
      '4-8 SAAT 150 TL', // 4 saatlik dilim, +30
    ]);
    expect(result?.tariff.tiers).toEqual([
      { endMin: 60, cumulativePrice: 50 },
      { endMin: 120, cumulativePrice: 90 },
      { endMin: 240, cumulativePrice: 120 },
      { endMin: 480, cumulativePrice: 150 },
    ]);
  });

  it('günlük tavan zincire eklenir, fiyat platoya oturur', () => {
    const result = parse(['0-1 SAAT 50 TL', '1-2 SAAT 90 TL', 'GÜNLÜK 200 TL']);
    const tiers = result?.tariff.tiers ?? [];
    expect(tiers[tiers.length - 1]).toEqual({ endMin: 1440, cumulativePrice: 200 });
    // 8 saat parkta kalan günlük tavanı öder, saat başı artış devam etmez
    const start = Date.UTC(2026, 6, 22, 10, 0);
    const state = computeTariffState(result!.tariff, start, start + 8 * 60 * 60_000);
    expect(state.nowPrice).toBe(200);
  });

  it('ilk dilim ücretsiz: fiyat 0 okunur (aralık sayısı fiyat sanılmaz)', () => {
    const result = parse(['0-1 SAAT ÜCRETSİZ', '1-2 SAAT 50 TL', '2-3 SAAT 90 TL']);
    expect(result?.tariff.tiers?.[0]).toEqual({ endMin: 60, cumulativePrice: 0 });
    // Bedava dilimdeyken uyarı doğru kurgulanır: "şimdi çık ₺0, geçersen ₺50"
    const start = Date.UTC(2026, 6, 22, 10, 0);
    const state = computeTariffState(result!.tariff, start, start + 30 * 60_000);
    expect(state.nowPrice).toBe(0);
    expect(state.nextPrice).toBe(50);
  });

  it('"İLK 30 DK ÜCRETSİZ" biçimi', () => {
    const result = parse(['İLK 30 DK ÜCRETSİZ', '30-60 DK 25 TL']);
    expect(result?.tariff.tiers?.[0]).toEqual({ endMin: 30, cumulativePrice: 0 });
  });

  it('İngilizce ücretsiz dilim', () => {
    const result = parse(['FIRST 2 HOURS FREE', '2-3 HOURS $4']);
    expect(result?.tariff.tiers?.[0]).toEqual({ endMin: 120, cumulativePrice: 0 });
  });

  it('ilave saat + günlük tavan: artış tavanda durur', () => {
    const result = parse(['İLK 1 SAAT 60 TL', 'HER İLAVE SAAT 40 TL', 'GÜNLÜK 150 TL']);
    const tiers = result?.tariff.tiers ?? [];
    // 60 → 100 → 140 → (180 tavanı aşar, eklenmez) → tavan 150
    expect(tiers.map((t) => t.cumulativePrice)).toEqual([60, 100, 140, 150]);
    expect(tiers[tiers.length - 1].endMin).toBe(1440);
  });
});

describe('parseTariffLines — gürültü ve hata halleri', () => {
  it('alakasız metin → null (elle girişe düşer)', () => {
    expect(parse(['ÇIKIŞ', 'KAT -2', 'ASANSÖR'])).toBeNull();
  });

  it('boş girdi → null', () => {
    expect(parse([])).toBeNull();
    expect(parse(['', '   '])).toBeNull();
  });

  it('başlık/gürültü satırları dilimleri bozmaz', () => {
    const result = parse([
      'XYZ OTOPARK',
      'ÜCRET TARİFESİ 2026',
      '0-1 SAAT 50 TL',
      'KREDİ KARTI GEÇERLİDİR',
      '1-2 SAAT 100 TL',
      'TEL: 0212 555 44 33',
    ]);
    expect(result?.tariff.tiers).toEqual([
      { endMin: 60, cumulativePrice: 50 },
      { endMin: 120, cumulativePrice: 100 },
    ]);
  });

  it('azalan fiyat okunursa monotonlaştırılır (negatif tasarruf imkânsız)', () => {
    const result = parse(['0-1 SAAT 100 TL', '1-2 SAAT 40 TL']);
    const tiers = result?.tariff.tiers ?? [];
    expect(tiers[1].cumulativePrice).toBeGreaterThanOrEqual(tiers[0].cumulativePrice);
  });

  it('çıktı doğrudan tariffMath ile çalışır (uçtan uca)', () => {
    const result = parse(['0-1 SAAT 50 TL', '1-2 SAAT 100 TL']);
    const start = Date.UTC(2026, 6, 22, 13, 0);
    const state = computeTariffState(result!.tariff, start, start + 30 * 60_000);
    expect(state.nowPrice).toBe(50);
    expect(state.nextPrice).toBe(100);
    expect(state.segments.length).toBeGreaterThan(0);
  });

  it('matchedLines eşleşen satır sayısını verir', () => {
    const result = parse(['BAŞLIK', '0-1 SAAT 50 TL', '1-2 SAAT 100 TL']);
    expect(result?.matchedLines).toBe(2);
  });
});

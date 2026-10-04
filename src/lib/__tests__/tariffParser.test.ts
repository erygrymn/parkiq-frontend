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

  it('günlük ücret her gün yeniden başlar (3 gün = 3 × ücret)', () => {
    const result = parse(['GÜNLÜK 250 TL']);
    expect(result?.tariff).toEqual({
      type: 'tiered',
      currency: 'TRY',
      tiers: [{ endMin: 24 * 60, cumulativePrice: 250 }],
      dailyMax: 250,
    });
    const threeDays = computeTariffState(result!.tariff, 0, 72 * 60 * 60_000 - 60_000);
    expect(threeDays.nowPrice).toBe(750);
  });

  it('sabit ücret süreden bağımsızdır', () => {
    const result = parse(['SABİT ÜCRET 50 TL']);
    expect(result?.tariff).toEqual({ type: 'flat', currency: 'TRY', price: 50 });
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

describe('yanlış fiyat regresyonları (2026-10-03 denetimi)', () => {
  const priceAt = (lines: string[], minutes: number, currency = 'TRY') => {
    const result = parseTariffLines(lines, currency);
    return result ? computeTariffState(result.tariff, 0, minutes * 60_000).nowPrice : null;
  };

  it('"MAKS. HIZ 10 KM" günlük tavan sayılmaz', () => {
    const lines = ['0-1 SAAT 50 TL', '1-2 SAAT 90 TL', '2-4 SAAT 120 TL', 'MAKS. HIZ 10 KM'];
    expect(priceAt(lines, 30)).toBe(50);
    expect(priceAt(lines, 90)).toBe(90);
    expect(parseTariffLines(lines, 'TRY')?.tariff.dailyMax).toBeUndefined();
  });

  it('"MAXIMUM HEIGHT 2.10M" ve "7/24 SAAT AÇIK" tavan sayılmaz', () => {
    expect(parseTariffLines(['0-1 SAAT 50 TL', 'MAXIMUM HEIGHT 2.10M'], 'TRY')?.tariff.dailyMax).toBeUndefined();
    expect(parseTariffLines(['0-1 SAAT 50 TL', '7/24 SAAT AÇIK'], 'TRY')?.tariff.dailyMax).toBeUndefined();
  });

  it('dilimden ucuz "tavan" düşer ve okuma kontrol uyarısıyla döner', () => {
    const result = parseTariffLines(['0-1 SAAT 50 TL', '1-3 SAAT 120 TL', 'GÜNLÜK MAKS 100 TL'], 'TRY');
    expect(result?.tariff.dailyMax).toBeUndefined();
    expect(result?.missedLines).toBeGreaterThan(0);
  });

  it('peni okunur: 50P = £0.50', () => {
    const result = parseTariffLines(['UP TO 30 MINS 50P', 'UP TO 1 HOUR £1.00', 'UP TO 2 HOURS £1.80'], 'GBP');
    expect(result?.tariff.tiers).toEqual([
      { endMin: 30, cumulativePrice: 0.5 },
      { endMin: 60, cumulativePrice: 1 },
      { endMin: 120, cumulativePrice: 1.8 },
    ]);
  });

  it('"3 SAATTEN SONRA HER SAAT 20 TL" saatlik adımdır, 1440 dakikalık değil', () => {
    const lines = ['0-1 SAAT 50 TL', '1-3 SAAT 80 TL', '3 SAATTEN SONRA HER SAAT 20 TL'];
    expect(priceAt(lines, 200)).toBe(100);
    expect(priceAt(lines, 290)).toBe(120);
  });

  it('"1 SAAT ÜZERİ HER SAAT 15 TL" zinciri kurar', () => {
    const lines = ['0-1 SAAT 30 TL', '1 SAAT ÜZERİ HER SAAT 15 TL'];
    expect(priceAt(lines, 90)).toBe(45);
    expect(priceAt(lines, 150)).toBe(60);
  });

  it('uzun İngilizce artım satırı da okunur', () => {
    const lines = ['UP TO 3 HOURS £6', 'AFTER 3 HOURS EACH ADDITIONAL HOUR £2'];
    expect(priceAt(lines, 200, 'GBP')).toBe(8);
    expect(priceAt(lines, 260, 'GBP')).toBe(10);
  });

  it('"4 SAAT VE ÜZERİ 120 TL" plato olarak okunur', () => {
    const lines = ['0-1 SAAT 50 TL', '1-4 SAAT 100 TL', '4 SAAT VE ÜZERİ 120 TL'];
    expect(priceAt(lines, 300)).toBe(120);
  });

  it('sözcükle ve farklı tireyle yazılmış aralıklar', () => {
    expect(priceAt(['0 TO 1 HOUR $3', '1 TO 2 HOURS $5', '2 TO 4 HOURS $8'], 90, 'USD')).toBe(5);
    expect(priceAt(['0 İLA 1 SAAT 50 TL', '1 İLA 2 SAAT 90 TL'], 30)).toBe(50);
    expect(priceAt(['0 − 1 SAAT 50 TL', '1 − 2 SAAT 90 TL'], 90)).toBe(90);
  });

  it('ondalık süre: "0-1,5 SAAT 40"', () => {
    const result = parseTariffLines(['0-1,5 SAAT 40 TL', '1,5-3 SAAT 70 TL'], 'TRY');
    expect(result?.tariff.tiers).toEqual([
      { endMin: 90, cumulativePrice: 40 },
      { endMin: 180, cumulativePrice: 70 },
    ]);
  });

  it('"N SAATLİK" bir süredir, saatlik ücret değil', () => {
    const lines = ['1 SAATLİK 40 TL', '2 SAATLİK 70 TL', '3 SAATLİK 100 TL'];
    const result = parseTariffLines(lines, 'TRY');
    expect(result?.tariff.tiers?.slice(0, 3)).toEqual([
      { endMin: 60, cumulativePrice: 40 },
      { endMin: 120, cumulativePrice: 70 },
      { endMin: 180, cumulativePrice: 100 },
    ]);
    expect(priceAt(lines, 30)).toBe(40);
  });

  it('"İLK 1 SAATİ 40 / SONRAKİ HER SAATİ 20" → 90. dakikada ₺60', () => {
    expect(priceAt(['İLK 1 SAATİ 40 TL', 'SONRAKİ HER SAATİ 20 TL'], 90)).toBe(60);
  });

  it('saatlik + "her ilave 30 dk" + günlük: ilk saat saatlik, sonrası adım', () => {
    const lines = ['SAATLİK 40 TL', 'HER İLAVE 30 DK 20 TL', 'GÜNLÜK 200 TL'];
    expect(priceAt(lines, 50)).toBe(40);
    expect(priceAt(lines, 80)).toBe(60);
    expect(priceAt(lines, 100)).toBe(80);
  });

  it('15 dakikalık zincir 7. saatte gerçek fiyatı verir', () => {
    // 10 + 6 saatte 24 ilave çeyrek × 5 = 130
    expect(priceAt(['İLK 1 SAAT 10 TL', 'HER İLAVE 15 DK 5 TL'], 7 * 60 - 1)).toBe(130);
  });

  it('avustralya panosundaki "$" cihazın dolarıdır', () => {
    expect(parseTariffLines(['0-1 HOUR $4', '1-2 HOURS $7'], 'AUD')?.tariff.currency).toBe('AUD');
    expect(parseTariffLines(['0-1 HOUR $4', '1-2 HOURS $7'], 'TRY')?.tariff.currency).toBe('USD');
  });
});

// Tarama Pro'dur ve 18 dilde satılıyor: her dilin tipik panosu okunmalı (2026-10-03).
describe('yabancı dilde panolar', () => {
  const tiersOf = (lines: string[], currency: string) => parseTariffLines(lines, currency)?.tariff.tiers ?? [];

  it('Almanca: "bis 1 Std." + "jede weitere Std." + Tageshöchstsatz', () => {
    const result = parseTariffLines(
      ['Parkgebühren', 'bis 1 Std. 2,00 €', 'bis 2 Std. 3,50 €', 'jede weitere Std. 1,50 €', 'Tageshöchstsatz 15,00 €'],
      'EUR',
    );
    expect(result?.tariff.currency).toBe('EUR');
    expect(result?.tariff.dailyMax).toBe(15);
    expect(result?.tariff.tiers?.slice(0, 3)).toEqual([
      { endMin: 60, cumulativePrice: 2 },
      { endMin: 120, cumulativePrice: 3.5 },
      { endMin: 180, cumulativePrice: 5 },
    ]);
  });

  it('Almanca: "€/h" saatliktir, "km/h" hız sınırıdır', () => {
    expect(parseTariffLines(['2,00 €/h', 'max. 10 km/h'], 'EUR')?.tariff).toEqual({ type: 'hourly', currency: 'EUR', price: 2 });
    expect(parseTariffLines(['je angefangene Stunde 1,50 €'], 'EUR')?.tariff.price).toBe(1.5);
  });

  it('Almanca: "1. Stunde frei"', () => {
    expect(tiersOf(['1. Stunde frei', 'jede weitere Stunde 2 €'], 'EUR').slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 0 },
      { endMin: 120, cumulativePrice: 2 },
    ]);
  });

  it('Fransızca: "1h", "gratuit", "Forfait 24h"; "24h/24" ücret değildir', () => {
    const result = parseTariffLines(
      ['De 0 à 15 min : gratuit', '1h 2,40 €', '2h 4,20 €', 'Forfait 24h 25 €', 'Ouvert 24h/24 7j/7'],
      'EUR',
    );
    expect(result?.tariff.tiers).toEqual([
      { endMin: 15, cumulativePrice: 0 },
      { endMin: 60, cumulativePrice: 2.4 },
      { endMin: 120, cumulativePrice: 4.2 },
      { endMin: 1440, cumulativePrice: 25 },
    ]);
    expect(result?.missedLines).toBe(0);
  });

  it('sıra sayılı saat fiyatı artmıyorsa saat başı ücrettir: "1ère heure 2,40 €" + "2ème heure 2,00 €"', () => {
    expect(tiersOf(['1ère heure 2,40 €', '2ème heure 2,00 €'], 'EUR')).toEqual([
      { endMin: 60, cumulativePrice: 2.4 },
      { endMin: 120, cumulativePrice: 4.4 },
    ]);
  });

  it('İspanyolca: "Hasta 1 hora" + "cada hora adicional" + "máximo diario"', () => {
    const result = parseTariffLines(['Hasta 1 hora 2,10 €', 'Cada hora adicional 1,80 €', 'Máximo diario 18 €'], 'EUR');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 2.1 },
      { endMin: 120, cumulativePrice: 3.9 },
    ]);
    expect(result?.tariff.dailyMax).toBe(18);
  });

  it('İspanyolca: dakika başı ücret saatliğe çevrilir', () => {
    expect(parseTariffLines(['0,05 € / minuto'], 'EUR')?.tariff).toEqual({ type: 'hourly', currency: 'EUR', price: 3 });
  });

  it('İtalyanca: "prima ora" + "ore successive €/h" + "massimo giornaliero"', () => {
    const result = parseTariffLines(['Prima ora 1,50 €', 'Ore successive 2,00 €/h', 'Massimo giornaliero 15 €'], 'EUR');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 1.5 },
      { endMin: 120, cumulativePrice: 3.5 },
    ]);
    expect(result?.tariff.dailyMax).toBe(15);
  });

  it('Felemenkçe: "eerste uur" + "elk volgend uur" + "dagtarief"', () => {
    const result = parseTariffLines(['Eerste uur € 1,00', 'Elk volgend uur € 2,00', 'Dagtarief € 15'], 'EUR');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 1 },
      { endMin: 120, cumulativePrice: 3 },
    ]);
    expect(result?.tariff.dailyMax).toBe(15);
  });

  it('İsveççe: "första timmen" + "därefter kr/påbörjad timme" + "max kr/dygn"', () => {
    const result = parseTariffLines(
      ['Första timmen 20 kr', 'Därefter 15 kr/påbörjad timme', 'Max 150 kr/dygn'],
      'SEK',
    );
    expect(result?.tariff.currency).toBe('SEK');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 20 },
      { endMin: 120, cumulativePrice: 35 },
    ]);
    expect(result?.tariff.dailyMax).toBe(150);
    // Norveç'te de "kr" yazılır: cihaz NOK ise o seçilir.
    expect(parseTariffLines(['10 kr/tim'], 'NOK')?.tariff.currency).toBe('NOK');
  });

  it('Portekizce: "até 1 hora R$" + "hora adicional" + "diária"', () => {
    const result = parseTariffLines(['Até 1 hora R$ 10,00', 'Hora adicional R$ 5,00', 'Diária R$ 40,00'], 'BRL');
    expect(result?.tariff.currency).toBe('BRL');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 10 },
      { endMin: 120, cumulativePrice: 15 },
    ]);
    expect(result?.tariff.dailyMax).toBe(40);
  });

  it('Japonca: "最初の1時間" + "以降30分毎" + "当日最大"', () => {
    const result = parseTariffLines(['駐車料金', '最初の1時間 300円', '以降30分毎 100円', '当日最大 1,200円'], 'JPY');
    expect(result?.tariff.currency).toBe('JPY');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 60, cumulativePrice: 300 },
      { endMin: 90, cumulativePrice: 400 },
    ]);
    expect(result?.tariff.dailyMax).toBe(1200);
  });

  it('Japonca: "30分 200円" tekrar eden ücrettir, tam genişlikli rakamlar da okunur', () => {
    const result = parseTariffLines(['３０分 ２００円', '最大料金 １２００円'], 'JPY');
    expect(result?.tariff.tiers?.slice(0, 3)).toEqual([
      { endMin: 30, cumulativePrice: 200 },
      { endMin: 60, cumulativePrice: 400 },
      { endMin: 90, cumulativePrice: 600 },
    ]);
    expect(result?.tariff.dailyMax).toBe(1200);
  });

  it('Korece: "최초 30분" + "추가 10분당" + "1일 최대"', () => {
    const result = parseTariffLines(['최초 30분 1,000원', '추가 10분당 500원', '1일 최대 20,000원'], 'KRW');
    expect(result?.tariff.currency).toBe('KRW');
    expect(result?.tariff.tiers?.slice(0, 2)).toEqual([
      { endMin: 30, cumulativePrice: 1000 },
      { endMin: 40, cumulativePrice: 1500 },
    ]);
    expect(result?.tariff.dailyMax).toBe(20000);
  });

  it('Çince: "每小時" + "當日最高"; Hong Kong cihazında "元" HKD\'dir', () => {
    const result = parseTariffLines(['每小時 30元', '當日最高 200元'], 'TWD');
    expect(result?.tariff.currency).toBe('TWD');
    expect(result?.tariff.tiers?.[0]).toEqual({ endMin: 60, cumulativePrice: 30 });
    expect(result?.tariff.dailyMax).toBe(200);
    expect(parseTariffLines(['每小時 25元'], 'HKD')?.tariff).toEqual({ type: 'hourly', currency: 'HKD', price: 25 });
  });

  it('saat yazımı fiyat sayılmaz: "8:00-20:00 30 MIN 200"', () => {
    expect(tiersOf(['8:00-20:00 30 MIN 200 TL'], 'TRY')[0]).toEqual({ endMin: 30, cumulativePrice: 200 });
  });
});

import { describe, expect, it } from '@jest/globals';
import { parseTariffLines } from '../tariffParser';

// Gerçek panolara karşı yapılan sistematik taramada ONAYLANMIŞ hataların
// regresyon kilidi. Her başlık, kullanıcıya yanlış para söyleyen bir durumdu.

const tiersOf = (lines: string[], currency = 'TRY') =>
  parseTariffLines(lines, currency)?.tariff.tiers ?? null;

describe('ücretsiz ilk dilim + devam eden ücret', () => {
  it('saatlik satırı dilimlerden sonra zincire ekler (eskiden "hep bedava" çıkıyordu)', () => {
    const tiers = tiersOf(['İLK 1 SAAT ÜCRETSİZ', 'SAATLİK 30 TL']);
    expect(tiers?.slice(0, 3)).toEqual([
      { endMin: 60, cumulativePrice: 0 },
      { endMin: 120, cumulativePrice: 30 },
      { endMin: 180, cumulativePrice: 60 },
    ]);
  });

  it('rakamsız "İLK SAAT" ifadesini 1 saat sayar', () => {
    const tiers = tiersOf(['İLK SAAT ÜCRETSİZ', 'SONRAKİ HER SAAT 25 TL']);
    expect(tiers?.[0]).toEqual({ endMin: 60, cumulativePrice: 0 });
    expect(tiers?.[1]).toEqual({ endMin: 120, cumulativePrice: 25 });
  });

  it('"1 SAAT ÜZERİ" ifadesinde sayı dilimin BAŞIdır, sonu değil', () => {
    // Sonu sanılınca ücretsiz dilimle çakışıp eleniyor ve tarife "bedava" kalıyordu.
    const tiers = tiersOf(['İLK 1 SAAT ÜCRETSİZ', '1 SAAT ÜZERİ 40 TL']);
    expect(tiers).toEqual([
      { endMin: 60, cumulativePrice: 0 },
      { endMin: 1440, cumulativePrice: 40 },
    ]);
  });

  it('fiyat sütununa "0 TL" yazan ücretsiz satırı okur', () => {
    expect(tiersOf(['İLK 1 SAAT 0 TL', '1-2 SAAT 30 TL'])?.[0]).toEqual({
      endMin: 60,
      cumulativePrice: 0,
    });
  });
});

describe('fiyatı olmayan satırlar dilim DEĞİLDİR', () => {
  const REAL = ['0-30 DK ÜCRETSİZ', '30 DK - 1 SAAT 25 TL', '1-3 SAAT 60 TL'];

  it.each([
    ['çıkış uyarısı', '15 DK İÇİNDE ÇIKINIZ'],
    ['açılış saati', '24 SAAT AÇIK'],
    ['açılış cümlesi', 'HER GÜN 24 SAAT AÇIKTIR'],
    ['azami süre', 'MAKS. 4 SAAT PARK EDİLİR'],
    ['ingilizce azami süre', 'MAX STAY 3 HOURS'],
    ['başlık', '24 SAAT AÇIK OTOPARK'],
  ])('%s satırı tarifeyi bozmaz', (_label, noise) => {
    expect(tiersOf([...REAL, noise])).toEqual(tiersOf(REAL));
  });

  it('uzun dip not artım adımı uydurmaz', () => {
    const footer =
      'ÖDEMENİZİ YAPTIKTAN SONRA 15 DK İÇERİSİNDE OTOPARKTAN ÇIKINIZ. AKSİ HALDE EKSTRA ÜCRETLENDİRME YAPILACAKTIR.';
    expect(tiersOf([...REAL, footer])).toEqual(tiersOf(REAL));
  });
});

describe('fiyat sütunu seçimi', () => {
  it('çok sütunlu panoda İLK fiyat sütununu alır (binek araç)', () => {
    // Sonuncuyu almak kullanıcıya minibüs tarifesini okuyordu.
    expect(tiersOf(['0-1 SAAT 50 TL 75 TL', '1-2 SAAT 90 TL 135 TL'])).toEqual([
      { endMin: 60, cumulativePrice: 50 },
      { endMin: 120, cumulativePrice: 90 },
    ]);
  });

  it('fiyat önde yazıldığında süreyi fiyat sanmaz', () => {
    expect(tiersOf(['£1.20 FOR 1 HOUR', '£2.40 FOR 2 HOURS'], 'GBP')).toEqual([
      { endMin: 60, cumulativePrice: 1.2 },
      { endMin: 120, cumulativePrice: 2.4 },
    ]);
  });
});

describe('bileşik ve kısaltmalı süre yazımları', () => {
  it('"1 SAAT 30 DK" bileşik üst sınırını 90 dakika okur', () => {
    const tiers = tiersOf(['0 - 1 SAAT 20 TL', '1 SAAT - 1 SAAT 30 DK 30 TL', '1 SAAT 30 DK - 2 SAAT 40 TL']);
    expect(tiers).toEqual([
      { endMin: 60, cumulativePrice: 20 },
      { endMin: 90, cumulativePrice: 30 },
      { endMin: 120, cumulativePrice: 40 },
    ]);
  });

  it('noktalı kısaltmalarda ("30 Dk. - 1 Saat") karışık birimi korur', () => {
    expect(tiersOf(['0 - 30 Dk. ÜCRETSİZ', '30 Dk. - 1 Saat 20 TL', '1 - 2 Saat 35 TL'])).toEqual([
      { endMin: 30, cumulativePrice: 0 },
      { endMin: 60, cumulativePrice: 20 },
      { endMin: 120, cumulativePrice: 35 },
    ]);
  });
});

describe('ingilizce panolar', () => {
  it('"OVER n HOURS" kuyruk dilimini yutmaz', () => {
    const tiers = tiersOf(['UP TO 1 HOUR £3.00', 'UP TO 4 HOURS £8.00', 'OVER 4 HOURS £12.00'], 'GBP');
    expect(tiers?.[tiers.length - 1]).toEqual({ endMin: 1440, cumulativePrice: 12 });
  });

  it('sıra eki ("1ST HOUR") tanır', () => {
    expect(tiersOf(['1ST HOUR $3', '2ND HOUR $5'], 'USD')).toEqual([
      { endMin: 60, cumulativePrice: 3 },
      { endMin: 120, cumulativePrice: 5 },
    ]);
  });

  it('gün bazlı uzun konaklamayı okur', () => {
    const tiers = tiersOf(['UP TO 24 HOURS £30.00', '2 DAYS £50.00'], 'GBP');
    expect(tiers?.some((t) => t.endMin === 2880 && t.cumulativePrice === 50)).toBe(true);
  });
});

describe('saatlik ve günlük tavan', () => {
  it('saatlik + günlük tavan sonsuza kadar artmaz', () => {
    const parsed = parseTariffLines(['SAATLİK 40 TL', 'GÜNLÜK 200 TL'], 'TRY');
    expect(parsed?.tariff.type).toBe('tiered');
    const tiers = parsed?.tariff.tiers ?? [];
    expect(tiers[tiers.length - 1]).toEqual({ endMin: 1440, cumulativePrice: 200 });
    expect(tiers.every((t) => t.cumulativePrice <= 200)).toBe(true);
  });

  it('"SAAT BAŞI" ve "SAATİ" yazımlarını tanır', () => {
    expect(parseTariffLines(['SAAT BAŞI 40 TL'], 'TRY')?.tariff).toEqual({
      type: 'hourly',
      currency: 'TRY',
      price: 40,
    });
    expect(parseTariffLines(['SAATİ 40 TL'], 'TRY')?.tariff.price).toBe(40);
  });

  it('aynı satırdaki saatlik + günlük ikisini de okur', () => {
    const tiers = tiersOf(['SAATLİK 40 ₺ GÜNLÜK 200 ₺']);
    expect(tiers?.[0]).toEqual({ endMin: 60, cumulativePrice: 40 });
    expect(tiers?.[tiers.length - 1]).toEqual({ endMin: 1440, cumulativePrice: 200 });
  });
});

describe('artım zinciri', () => {
  it('yarım saatlik artımı saat sanmaz', () => {
    const tiers = tiersOf(['İLK 1 SAAT 30 TL', 'HER İLAVE 30 DAKİKA 15 TL']);
    expect(tiers?.slice(0, 3)).toEqual([
      { endMin: 60, cumulativePrice: 30 },
      { endMin: 90, cumulativePrice: 45 },
      { endMin: 120, cumulativePrice: 60 },
    ]);
  });

  it('"HER YARIM SAAT" adımını 30 dakika sayar', () => {
    const tiers = tiersOf(['İLK 1 SAAT 30 TL', 'HER YARIM SAAT 15 TL']);
    expect(tiers?.[1]).toEqual({ endMin: 90, cumulativePrice: 45 });
  });

  it('tavana ulaşınca durur, tavanı aşmaz', () => {
    const tiers = tiersOf(['İLK 2 SAAT 50 TL', 'HER İLAVE SAAT 20 TL', 'GÜNLÜK 200 TL']) ?? [];
    expect(tiers[tiers.length - 1]).toEqual({ endMin: 1440, cumulativePrice: 200 });
    expect(tiers.every((t) => t.cumulativePrice <= 200)).toBe(true);
  });

  it('tavan yokken fiyat donmaz — zincir 24 saate kadar gider', () => {
    // Eskiden 3 ilave saatten sonra kesiliyordu; app "artık artmıyor" diyordu.
    const tiers = tiersOf(['İLK 1 SAAT 40 TL', 'HER İLAVE SAAT 15 TL']) ?? [];
    expect(tiers[tiers.length - 1].endMin).toBe(1440);
    expect(tiers[tiers.length - 1].cumulativePrice).toBeGreaterThan(40);
  });
});

describe('sayı biçimleri ve abonelik satırları', () => {
  it('binlik ayracını kuruş sanmaz', () => {
    // "1.945,00" eskiden 1.94 okunuyordu: havalimanı günlüğü kuruşa düşüyordu.
    const tiers = tiersOf(['0-1 SAAT 90 TL', '12-24 SAAT 270 TL', '7 GÜN 1.945,00 TL']) ?? [];
    expect(tiers[tiers.length - 1]).toEqual({ endMin: 10080, cumulativePrice: 1945 });
  });

  it.each([
    ['66,00', 66],
    ['34,5', 34.5],
    ['3.50', 3.5],
    ['1.500,00', 1500],
    ['2.225', 2225],
  ])('%s → %p', (written, value) => {
    expect(tiersOf([`0-1 SAAT ${written} TL`])?.[0].cumulativePrice).toBe(value);
  });

  it('abonelik satırlarını dilim saymaz', () => {
    const real = ['0-2 SAATE KADAR 15,00', '2-4 SAATE KADAR 20,00', '10-24 SAATE KADAR 50,00'];
    const withSubscription = [...real, '15 GÜNLÜK 750,00', '30 GÜNLÜK 1.500,00', 'AYLIK ABONE 2.225,00'];
    expect(tiersOf(withSubscription)).toEqual(tiersOf(real));
  });

  it('havalimanındaki gerçek gün dilimlerini korur ("2 GÜN" abonelik değildir)', () => {
    const tiers = tiersOf(['12-24 SAAT 270 TL', '2 GÜN 540 TL']) ?? [];
    expect(tiers.some((t) => t.endMin === 2880 && t.cumulativePrice === 540)).toBe(true);
  });

  it('istiflenmiş araç tablosunda ilk tabloyu (otomobil) alır', () => {
    const tiers = tiersOf([
      'OTOMOBİL GRUBU TAŞITLAR',
      '20 DAKİKAYA KADAR ÜCRETSİZ',
      '1 SAATE KADAR 35₺',
      '6 SAATTEN SONRA (GÜN BOYU) 130₺',
      'MOTOSİKLET GRUBU TAŞITLAR',
      '15,00',
    ]);
    expect(tiers).toEqual([
      { endMin: 20, cumulativePrice: 0 },
      { endMin: 60, cumulativePrice: 35 },
      { endMin: 1440, cumulativePrice: 130 },
    ]);
  });
});

describe('eksik okuma uyarısı', () => {
  const parse = (lines: string[]) => parseTariffLines(lines, 'TRY');

  it('temiz panoda uyarı çıkarmaz', () => {
    expect(parse(['0-30 DK ÜCRETSİZ', '30 DK - 1 SAAT 20 TL', '1-3 SAAT 50 TL'])?.missedLines).toBe(0);
  });

  it('yerleştirilemeyen fiyat satırını sayar', () => {
    // Fiyatı var ama süresi hiçbir kalıba oturmuyor: tablodan bir şey kaçtı.
    expect(parse(['0-1 SAAT 50 TL', 'YARIM SAAT 20 TL'])?.missedLines).toBeGreaterThan(0);
    expect(parse(['0-1 SAAT 50 TL', 'KAYIP BİLET 200 TL'])?.missedLines).toBeGreaterThan(0);
  });

  it('uyarı/başlık satırlarını eksik saymaz', () => {
    // Bunlarda para birimi yok — doğru şekilde yok sayılıyorlar, eksik değiller.
    const result = parse([
      '0-1 SAAT 50 TL',
      '24 SAAT AÇIK',
      'MAKS. 4 SAAT PARK EDİLİR',
      '15 DK İÇİNDE ÇIKINIZ',
    ]);
    expect(result?.missedLines).toBe(0);
  });

  it('abonelik satırlarını eksik saymaz', () => {
    const result = parse(['0-1 SAAT 50 TL', '30 GÜNLÜK 1.500,00 TL']);
    expect(result?.missedLines).toBe(0);
  });
});

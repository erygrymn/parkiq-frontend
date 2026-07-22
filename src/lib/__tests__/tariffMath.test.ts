import { describe, expect, it } from '@jest/globals';
import {
  computeExitSummary,
  computeTariffState,
  listUpcomingBoundaries,
  sanitizeTiers,
  type Tariff,
} from '../tariffMath';

// design.md §5.9 "Örnek hesap": park 13:04, tarife [1h → ₺50, 2h → ₺100]
const PARK_START = Date.UTC(2026, 6, 22, 13, 4);
const at = (h: number, m: number) => Date.UTC(2026, 6, 22, h, m);

const twoTier: Tariff = {
  type: 'tiered',
  currency: 'TRY',
  tiers: [
    { endMin: 60, cumulativePrice: 50 },
    { endMin: 120, cumulativePrice: 100 },
  ],
};

describe('computeTariffState — spec örneği (§5.9)', () => {
  it('13:49: Now ₺50, Next ₺100, sınıra 15 dk → amber', () => {
    const s = computeTariffState(twoTier, PARK_START, at(13, 49));
    expect(s.mode).toBe('tiered');
    expect(s.nowPrice).toBe(50);
    expect(s.nextPrice).toBe(100);
    expect(s.nextBoundaryAtMs).toBe(at(14, 4));
    expect(s.minutesToBoundary).toBeCloseTo(15);
    expect(s.warn).toBe(true);
  });

  it('13:30: sınıra 34 dk → amber değil', () => {
    const s = computeTariffState(twoTier, PARK_START, at(13, 30));
    expect(s.warn).toBe(false);
    expect(s.currentTierIndex).toBe(1);
  });

  it('14:10: 2. dilimde, Now ₺100; fiyat artışı kalmadığından sınır alanları null', () => {
    const s = computeTariffState(twoTier, PARK_START, at(14, 10));
    expect(s.currentTierIndex).toBe(2);
    expect(s.nowPrice).toBe(100);
    expect(s.nextPrice).toBeNull();
    expect(s.nextBoundaryMin).toBeNull();
    expect(s.minutesToBoundary).toBeNull();
    expect(s.warn).toBe(false);
  });

  it('tüm sınırların ötesinde: son kümülatif fiyat korunur', () => {
    const s = computeTariffState(twoTier, PARK_START, at(16, 0));
    expect(s.nowPrice).toBe(100);
    expect(s.nextPrice).toBeNull();
    expect(s.nextBoundaryMin).toBeNull();
    expect(s.currentTierIndex).toBe(3); // açık uçlu bölge
  });
});

describe('barTone durum makinesi (§5.9: yeşil / amber-approaching / amber-exceeded)', () => {
  it('sınıra uzakken green', () => {
    expect(computeTariffState(twoTier, PARK_START, at(13, 30)).barTone).toBe('green');
  });

  it('sınıra ≤15 dk: amber-approaching', () => {
    expect(computeTariffState(twoTier, PARK_START, at(13, 49)).barTone).toBe('amber-approaching');
  });

  it('dilim aşıldı: amber kalır (amber-exceeded), kırmızı asla', () => {
    expect(computeTariffState(twoTier, PARK_START, at(14, 10)).barTone).toBe('amber-exceeded');
    expect(computeTariffState(twoTier, PARK_START, at(16, 0)).barTone).toBe('amber-exceeded');
  });

  it('aşılmış + yeni sınıra yaklaşılıyor: approaching öncelikli', () => {
    const threeTier: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 60, cumulativePrice: 50 },
        { endMin: 120, cumulativePrice: 100 },
        { endMin: 240, cumulativePrice: 150 },
      ],
    };
    // 110. dk: 2. dilimde (aşılmış), 120 sınırına 10 dk
    const s = computeTariffState(threeTier, PARK_START, PARK_START + 110 * 60_000);
    expect(s.barTone).toBe('amber-approaching');
  });
});

describe('computeExitSummary — spec örneği (§5.9)', () => {
  it('13:58 çıkış → Paid ₺50, Saved ₺50 (varyant c)', () => {
    const e = computeExitSummary(twoTier, PARK_START, at(13, 58));
    expect(e.paid).toBe(50);
    expect(e.saved).toBe(50);
  });

  it('14:20 çıkış → Paid ₺100, Saved 0 (varyant b)', () => {
    const e = computeExitSummary(twoTier, PARK_START, at(14, 20));
    expect(e.paid).toBe(100);
    expect(e.saved).toBe(0);
  });

  it('tarifesiz → paid/saved tanımsız', () => {
    const e = computeExitSummary(null, PARK_START, at(14, 0));
    expect(e.paid).toBeNull();
    expect(e.saved).toBeNull();
  });

  it('flat → paid sabit, saved tanımsız (hiçbir yüzeyde gösterilmez)', () => {
    const e = computeExitSummary({ type: 'flat', currency: 'TRY', price: 80 }, PARK_START, at(18, 0));
    expect(e.paid).toBe(80);
    expect(e.saved).toBeNull();
  });
});

describe('flat ve hourly tarife tipleri (§5.9 veri modeli)', () => {
  it('flat: çubuk gizlenir (segment yok), nowPrice sabit', () => {
    const s = computeTariffState({ type: 'flat', currency: 'TRY', price: 80 }, PARK_START, at(15, 0));
    expect(s.mode).toBe('flat');
    expect(s.nowPrice).toBe(80);
    expect(s.segments).toHaveLength(0);
    expect(s.knobPct).toBeNull();
  });

  it('hourly ₺40: 90. dakikada Now ₺80, Next ₺120, sınır 120. dk', () => {
    const s = computeTariffState(
      { type: 'hourly', currency: 'TRY', price: 40 },
      PARK_START,
      PARK_START + 90 * 60_000,
    );
    expect(s.nowPrice).toBe(80);
    expect(s.nextPrice).toBe(120);
    expect(s.nextBoundaryMin).toBe(120);
    expect(s.minutesToBoundary).toBeCloseTo(30);
  });

  it('hourly: açık uçlu kuyruk yok (dilimler sonsuz üretilir)', () => {
    const s = computeTariffState(
      { type: 'hourly', currency: 'TRY', price: 40 },
      PARK_START,
      PARK_START + 90 * 60_000,
    );
    expect(s.segments.every((seg) => seg.endMin !== null)).toBe(true);
  });
});

describe('segment geometrisi (§5.9 görsel spec)', () => {
  const threeTier: Tariff = {
    type: 'tiered',
    currency: 'TRY',
    tiers: [
      { endMin: 60, cumulativePrice: 50 },
      { endMin: 120, cumulativePrice: 100 },
      { endMin: 240, cumulativePrice: 150 },
    ],
  };

  it('genişlikler süre-orantılı + açık uç sabit %22, toplam 100', () => {
    const s = computeTariffState(threeTier, PARK_START, PARK_START + 30 * 60_000);
    const total = s.segments.reduce((sum, seg) => sum + seg.widthPct, 0);
    expect(total).toBeCloseTo(100);
    const openEnd = s.segments[s.segments.length - 1];
    expect(openEnd.endMin).toBeNull();
    expect(openEnd.widthPct).toBeCloseTo(22);
    // 78'in 60:60:120 orantısı → 19.5 / 19.5 / 39
    expect(s.segments[0].widthPct).toBeCloseTo(19.5);
    expect(s.segments[2].widthPct).toBeCloseTo(39);
  });

  it('min %18 clamp: kısa dilim 18\'e sabitlenir, kalan renormalize, toplam 100', () => {
    const shortFirst: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 30, cumulativePrice: 20 },
        { endMin: 60, cumulativePrice: 40 },
        { endMin: 240, cumulativePrice: 80 },
      ],
    };
    const s = computeTariffState(shortFirst, PARK_START, PARK_START + 10 * 60_000);
    const defined = s.segments.filter((seg) => seg.endMin !== null);
    for (const seg of defined) expect(seg.widthPct).toBeGreaterThanOrEqual(18 - 1e-9);
    expect(s.segments.reduce((sum, seg) => sum + seg.widthPct, 0)).toBeCloseTo(100);
  });

  it('knob: segStart + (elapsedInTier/tierDuration) × segWidth', () => {
    const s = computeTariffState(threeTier, PARK_START, PARK_START + 30 * 60_000);
    // 1. dilimin yarısı: 19.5 × 0.5 = 9.75
    expect(s.knobPct).toBeCloseTo(9.75);
  });

  it('passed/active bayrakları elapsed ile tutarlı', () => {
    const s = computeTariffState(threeTier, PARK_START, PARK_START + 90 * 60_000);
    expect(s.segments[0].passed).toBe(true);
    expect(s.segments[1].active).toBe(true);
    expect(s.segments[1].passed).toBe(false);
  });

  it('pencere: 6 dilimli tarifede en fazla 4 tanımlı segment, şimdiki+2 görünür', () => {
    const manyTiers: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [1, 2, 3, 4, 5, 6].map((h) => ({ endMin: h * 60, cumulativePrice: h * 30 })),
    };
    const s = computeTariffState(manyTiers, PARK_START, PARK_START + 150 * 60_000); // 3. dilimde
    const defined = s.segments.filter((seg) => seg.endMin !== null);
    expect(defined.length).toBeLessThanOrEqual(4);
    expect(defined.some((seg) => seg.active)).toBe(true);
    // şimdiki dilim + 2 sonraki pencerede
    expect(defined[defined.length - 1].endMin).toBe(5 * 60);
  });
});

describe('açık uçlu dilimde knob (referans = son tanımlı dilim süresi, sonda doyar)', () => {
  it('sınır anında açık uç başında, referans süre boyunca ilerler, sonra doyar', () => {
    // twoTier: tanımlı 2 segment eşit süre (60+60) → 39/39, açık uç 22 → başlangıç %78
    const at120 = computeTariffState(twoTier, PARK_START, PARK_START + 120 * 60_000);
    expect(at120.knobPct).toBeCloseTo(78);
    const at150 = computeTariffState(twoTier, PARK_START, PARK_START + 150 * 60_000);
    expect(at150.knobPct).toBeCloseTo(78 + (30 / 60) * 22); // 89
    const at300 = computeTariffState(twoTier, PARK_START, PARK_START + 300 * 60_000);
    expect(at300.knobPct).toBeCloseTo(100);
  });
});

describe('girdi normalizasyonu (güvenilmez elle giriş / OCR verisi)', () => {
  it('sırasız tiers sıralanır: 30. dakikada doğru fiyat ₺50', () => {
    const unsorted: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 120, cumulativePrice: 100 },
        { endMin: 60, cumulativePrice: 50 },
      ],
    };
    const s = computeTariffState(unsorted, PARK_START, PARK_START + 30 * 60_000);
    expect(s.nowPrice).toBe(50);
    expect(s.nextPrice).toBe(100);
  });

  it('0 süreli / duplike sınır elenir: hayalet dilim çizilmez, Next doğru', () => {
    const ghost: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 60, cumulativePrice: 50 },
        { endMin: 60, cumulativePrice: 80 },
        { endMin: 120, cumulativePrice: 100 },
      ],
    };
    const s = computeTariffState(ghost, PARK_START, PARK_START + 50 * 60_000);
    expect(s.nextPrice).toBe(100);
    expect(s.segments.every((seg) => seg.endMin === null || seg.endMin > seg.startMin)).toBe(true);
  });

  it('endMin ≤ 0 dilim elenir; hepsi geçersizse mode none (NaN asla sızmaz)', () => {
    const zeroOnly = computeTariffState(
      { type: 'tiered', currency: 'TRY', tiers: [{ endMin: 0, cumulativePrice: 30 }] },
      PARK_START,
      PARK_START + 10 * 60_000,
    );
    expect(zeroOnly.mode).toBe('none');
    expect(zeroOnly.segments).toHaveLength(0);
    expect(zeroOnly.knobPct).toBeNull();
  });

  it('tüm sayısal çıktılar sonlu (NaN/Infinity serileştirmeye sızamaz)', () => {
    const nasty: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 60, cumulativePrice: 50 },
        { endMin: 0, cumulativePrice: 100 },
        { endMin: Number.NaN, cumulativePrice: 10 },
      ],
    };
    const s = computeTariffState(nasty, PARK_START, PARK_START + 30 * 60_000);
    for (const seg of s.segments) expect(Number.isFinite(seg.widthPct)).toBe(true);
    if (s.knobPct !== null) expect(Number.isFinite(s.knobPct)).toBe(true);
  });

  it('azalan kümülatif fiyat monotonlaştırılır: SAVED asla negatif olamaz', () => {
    const decreasing: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 60, cumulativePrice: 100 },
        { endMin: 120, cumulativePrice: 50 },
      ],
    };
    const e = computeExitSummary(decreasing, PARK_START, PARK_START + 30 * 60_000);
    expect(e.saved).not.toBeNull();
    expect(e.saved!).toBeGreaterThanOrEqual(0);
  });

  it('sanitizeTiers: sıralar, duplikeyi atar (ilk kazanır), fiyatı monotonlaştırır', () => {
    const out = sanitizeTiers([
      { endMin: 120, cumulativePrice: 40 },
      { endMin: 60, cumulativePrice: 50 },
      { endMin: 60, cumulativePrice: 999 },
      { endMin: -10, cumulativePrice: 5 },
    ]);
    expect(out).toEqual([
      { endMin: 60, cumulativePrice: 50 },
      { endMin: 120, cumulativePrice: 50 },
    ]);
  });
});

describe('yapışkan clamp regresyonları (denetçi repro girdileri)', () => {
  it('endMin=[10,20,40,78] @15dk: tanımlı hiçbir segment %18 altına inmez, toplam 100', () => {
    const t: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [10, 20, 40, 78].map((m, i) => ({ endMin: m, cumulativePrice: (i + 1) * 10 })),
    };
    const s = computeTariffState(t, PARK_START, PARK_START + 15 * 60_000);
    const defined = s.segments.filter((seg) => seg.endMin !== null);
    for (const seg of defined) expect(seg.widthPct).toBeGreaterThanOrEqual(18 - 1e-9);
    expect(s.segments.reduce((sum, seg) => sum + seg.widthPct, 0)).toBeCloseTo(100);
  });

  it('süreler [1,199,60]: kısa segmentler 18\'de donar, uzun segment kalan bütçeyi alır', () => {
    const t: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 1, cumulativePrice: 10 },
        { endMin: 200, cumulativePrice: 20 },
        { endMin: 260, cumulativePrice: 30 },
      ],
    };
    const s = computeTariffState(t, PARK_START, PARK_START + 0.5 * 60_000);
    const defined = s.segments.filter((seg) => seg.endMin !== null);
    for (const seg of defined) expect(seg.widthPct).toBeGreaterThanOrEqual(18 - 1e-9);
    expect(s.segments.reduce((sum, seg) => sum + seg.widthPct, 0)).toBeCloseTo(100);
  });
});

describe('listUpcomingBoundaries (bildirim zamanlamasının kaynağı, §8.4)', () => {
  it('park anında tek fiyat artışı sınırını verir', () => {
    const b = listUpcomingBoundaries(twoTier, PARK_START, PARK_START);
    expect(b).toHaveLength(1);
    expect(b[0]).toEqual({ tierIndex: 1, atMs: at(14, 4), currentPrice: 50, nextPrice: 100 });
  });

  it('geçmiş sınırları atlar, yalnız gelecektekileri döner', () => {
    const b = listUpcomingBoundaries(twoTier, PARK_START, at(14, 30));
    expect(b).toHaveLength(0);
  });

  it('hourly: ileriye doğru zincir üretir, hepsi artan fiyatlı', () => {
    const b = listUpcomingBoundaries({ type: 'hourly', currency: 'TRY', price: 40 }, PARK_START, PARK_START, 4);
    expect(b).toHaveLength(4);
    expect(b.map((x) => x.nextPrice)).toEqual([80, 120, 160, 200]);
    expect(b.every((x) => x.nextPrice > x.currentPrice)).toBe(true);
    // Sınırlar saat başlarına oturur
    expect(b[0].atMs).toBe(PARK_START + 60 * 60_000);
  });

  it('flat ve tarifesiz: uyarı üretilmez', () => {
    expect(listUpcomingBoundaries({ type: 'flat', currency: 'TRY', price: 80 }, PARK_START, PARK_START)).toHaveLength(0);
    expect(listUpcomingBoundaries(null, PARK_START, PARK_START)).toHaveLength(0);
  });

  it('fiyatı artırmayan sınır uyarı üretmez', () => {
    const flatTail: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [
        { endMin: 60, cumulativePrice: 50 },
        { endMin: 120, cumulativePrice: 50 },
        { endMin: 180, cumulativePrice: 90 },
      ],
    };
    const b = listUpcomingBoundaries(flatTail, PARK_START, PARK_START);
    expect(b).toHaveLength(1);
    expect(b[0].atMs).toBe(PARK_START + 120 * 60_000);
    expect(b[0].nextPrice).toBe(90);
  });

  it('maxCount aşılmaz (iOS bildirim kotası)', () => {
    const b = listUpcomingBoundaries({ type: 'hourly', currency: 'TRY', price: 10 }, PARK_START, PARK_START, 3);
    expect(b).toHaveLength(3);
  });
});

describe('kenar durumları', () => {
  it('elapsed negatif olamaz (saat oynaması)', () => {
    const s = computeTariffState(twoTier, PARK_START, PARK_START - 60_000);
    expect(s.elapsedMin).toBe(0);
    expect(s.nowPrice).toBe(50);
  });

  it('boş tiers → mode none', () => {
    const s = computeTariffState({ type: 'tiered', currency: 'TRY', tiers: [] }, PARK_START, at(14, 0));
    expect(s.mode).toBe('none');
  });

  it('warn eşiği kullanıcı ayarına saygılı (varsayılan 15 dk)', () => {
    const s10 = computeTariffState(twoTier, PARK_START, at(13, 49), 10);
    expect(s10.warn).toBe(false);
    const s20 = computeTariffState(twoTier, PARK_START, at(13, 46), 20);
    expect(s20.warn).toBe(true);
  });

  it('currency her modda taşınır (ContentState kendi kendine yeterli, §8)', () => {
    expect(computeTariffState(twoTier, PARK_START, at(13, 30)).currency).toBe('TRY');
    expect(computeTariffState({ type: 'flat', currency: 'EUR', price: 8 }, PARK_START, at(13, 30)).currency).toBe('EUR');
    expect(computeTariffState(null, PARK_START, at(13, 30)).currency).toBeNull();
  });

  it('kaymış pencerede segment başlangıcı ve knob tutarlı (6 dilim, 3. dilimde)', () => {
    const manyTiers: Tariff = {
      type: 'tiered',
      currency: 'TRY',
      tiers: [1, 2, 3, 4, 5, 6].map((h) => ({ endMin: h * 60, cumulativePrice: h * 30 })),
    };
    const s = computeTariffState(manyTiers, PARK_START, PARK_START + 150 * 60_000);
    const defined = s.segments.filter((seg) => seg.endMin !== null);
    expect(defined[0].startMin).toBe(60); // pencere 2. dilimden başlıyor
    // 150. dk = 3. dilimin ortası; eşit süreli 4 görünür segmentte knob 2. segmentin ortası
    expect(s.knobPct).toBeCloseTo(25 + 12.5);
  });
});

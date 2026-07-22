import { describe, expect, it } from '@jest/globals';
import {
  bearingDegrees,
  distanceMeters,
  formatDistance,
  isIndoorLike,
  relativeBearing,
} from '../geo';

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };

describe('distanceMeters', () => {
  it('aynı nokta → 0', () => {
    expect(distanceMeters(ISTANBUL, ISTANBUL)).toBeCloseTo(0, 5);
  });

  it('1 enlem derecesi ≈ 111 km', () => {
    const d = distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('kısa mesafe: ~100 m kuzey', () => {
    const north = { latitude: ISTANBUL.latitude + 0.0009, longitude: ISTANBUL.longitude };
    expect(distanceMeters(ISTANBUL, north)).toBeCloseTo(100, -1);
  });

  it('simetrik', () => {
    const other = { latitude: 41.02, longitude: 29.01 };
    expect(distanceMeters(ISTANBUL, other)).toBeCloseTo(distanceMeters(other, ISTANBUL), 6);
  });
});

describe('bearingDegrees', () => {
  it('kuzey → 0°', () => {
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(0, 1);
  });

  it('doğu → 90°', () => {
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(90, 1);
  });

  it('güney → 180°', () => {
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: -1, longitude: 0 })).toBeCloseTo(180, 1);
  });

  it('batı → 270°', () => {
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: -1 })).toBeCloseTo(270, 1);
  });

  it('her zaman 0–360 aralığında', () => {
    const b = bearingDegrees({ latitude: 41, longitude: 29 }, { latitude: 40.9, longitude: 28.9 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe('relativeBearing — pusula oku', () => {
  it('kullanıcı hedefe dönükse ok yukarıyı gösterir (0°)', () => {
    expect(relativeBearing(90, 90)).toBe(0);
  });

  it('hedef sağdaysa 90°', () => {
    expect(relativeBearing(90, 0)).toBe(90);
  });

  it('hedef arkadaysa 180°', () => {
    expect(relativeBearing(180, 0)).toBe(180);
  });

  it('negatif sonuç üretmez (360 sarması)', () => {
    expect(relativeBearing(10, 350)).toBe(20);
    expect(relativeBearing(350, 10)).toBe(340);
  });
});

describe('formatDistance', () => {
  it('1 km altı metre', () => {
    expect(formatDistance(87)).toBe('87 m');
    expect(formatDistance(0)).toBe('0 m');
  });

  it('1 km üstü kilometre', () => {
    expect(formatDistance(1234)).toBe('1.2 km');
  });

  it('TR ondalık ayırıcısı virgül', () => {
    expect(formatDistance(1234, 'tr')).toBe('1,2 km');
  });

  it('geçersiz değer → tire', () => {
    expect(formatDistance(Number.NaN)).toBe('—');
    expect(formatDistance(-5)).toBe('—');
  });
});

describe('isIndoorLike — kapalı otopark sezgisi', () => {
  it('doğruluk yoksa kapalı sayılır', () => {
    expect(isIndoorLike(null)).toBe(true);
  });

  it('açık alan doğruluğu (10 m) kapalı değil', () => {
    expect(isIndoorLike(10)).toBe(false);
  });

  it('kötü doğruluk (60 m) kapalı sayılır → foto/kat kartına düşer', () => {
    expect(isIndoorLike(60)).toBe(true);
  });
});

import { describe, expect, it } from '@jest/globals';
import { resolvePremium, UNLOCK_ALL_PREMIUM } from '../premium';

// Kilitlerin tek kapısı. Jest, __DEV__ = true ile çalışır (geliştirme derlemesi),
// yani buradaki beklentiler Ayarlar'daki geliştirici anahtarının davranışını yansıtır.

describe('resolvePremium — geliştirme derlemesi (anahtar belirler)', () => {
  it('anahtar açıkken abonelik olmadan premium', () => {
    expect(resolvePremium(false, true)).toBe(true);
  });

  it('anahtar KAPALIYKEN premium değil — paywall ve kilitler görünür', () => {
    expect(resolvePremium(false, false)).toBe(false);
  });

  it('anahtar kapalı olsa da gerçek abonelik premium verir', () => {
    expect(resolvePremium(true, false)).toBe(true);
  });
});

describe('yayın derlemesi davranışı (__DEV__ = false)', () => {
  // Production'da anahtar tamamen yok sayılır; karar sabit + aboneliktir.
  const productionResolve = (hasEntitlement: boolean, devUnlock: boolean) =>
    UNLOCK_ALL_PREMIUM || hasEntitlement;

  it('geliştirici anahtarı yayında hiçbir şeyi açamaz', () => {
    // Kilit sabiti kapatıldığında (yayın hâli) anahtar true olsa bile etkisizdir.
    const shipped = (hasEntitlement: boolean, devUnlock: boolean) => false || hasEntitlement;
    expect(shipped(false, true)).toBe(false);
    expect(shipped(true, true)).toBe(true);
  });

  it('şu anki sabit hâlâ geliştirme modunda (yayın öncesi false yapılacak)', () => {
    expect(UNLOCK_ALL_PREMIUM).toBe(true);
    expect(productionResolve(false, false)).toBe(true);
  });
});

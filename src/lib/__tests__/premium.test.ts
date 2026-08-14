import { describe, expect, it } from '@jest/globals';
import { PREMIUM_ENTITLEMENT, resolvePremium } from '../premium';

// Premium kararı tek kapıdan geçer. Yayın derlemesinde ölçüt YALNIZ aboneliktir:
// geliştirme kolaylığı için konmuş global bir açma anahtarı yoktur.

describe('resolvePremium', () => {
  it('abonelik varsa premium', () => {
    expect(resolvePremium(true, false)).toBe(true);
  });

  it('abonelik yoksa premium değil', () => {
    // __DEV__ testlerde true; geliştirici anahtarı kapalıyken kilit devrede.
    expect(resolvePremium(false, false)).toBe(false);
  });

  it('geliştirici anahtarı yalnız geliştirme derlemesinde açar', () => {
    expect(resolvePremium(false, true)).toBe(__DEV__);
  });
});

describe('entitlement anahtarı', () => {
  it('RevenueCat panelindeki değerle aynı kalır', () => {
    // Değişirse tüm satın almalar sessizce yetkisiz kalır.
    expect(PREMIUM_ENTITLEMENT).toBe('pro');
  });
});

// Premium yetki kaynağı — TEK KAPI. Kilitlenecek her yüzey buradan okur.

/** RevenueCat'te premium yetkiyi temsil eden entitlement anahtarı. */
export const PREMIUM_ENTITLEMENT = 'pro';

/**
 * Yetki kararı.
 *
 * Yayın derlemesinde TEK ölçüt gerçek aboneliktir — geliştirme kolaylığı için
 * konmuş global bir açma anahtarı YOKTUR. (Böyle bir sabit vardı; yayına
 * `true` unutulursa premium diye bir şey kalmayacağı için tamamen kaldırıldı.)
 *
 * Geliştirme derlemesinde (`__DEV__`) Ayarlar'daki anahtar da açabilir —
 * paywall'ı ve kilitli halleri satın alma olmadan görebilmek için. `__DEV__`
 * yayın paketinde false olduğundan bu yol shipping'e sızamaz.
 */
export function resolvePremium(hasActiveEntitlement: boolean, devUnlock: boolean): boolean {
  if (__DEV__) return devUnlock || hasActiveEntitlement;
  return hasActiveEntitlement;
}

// Premium yetki kaynağı — TEK KAPI. Kilitlenecek her yüzey buradan okur,
// böylece kilitleri açıp kapamak tek satırdır.
//
// ⚠️ GELİŞTİRME KİLİDİ AÇIK:
// Aşağıdaki sabit `true` olduğu sürece TÜM premium özellikler herkese açıktır.
// Amaç: geliştirme boyunca premium yüzeyleri (Live Activity, oto-algılama,
// sınırsız geçmiş, çoklu araç) satın alma olmadan deneyebilmek.
//
// YAYIN ÖNCESİ TEK YAPILACAK: bu değeri `false` yap. Kilitler o an devreye girer;
// başka hiçbir dosyaya dokunmak gerekmez.
export const UNLOCK_ALL_PREMIUM = true;

/** RevenueCat'te premium yetkiyi temsil eden entitlement anahtarı. */
export const PREMIUM_ENTITLEMENT = 'pro';

/**
 * Yetki kararı.
 *
 * - Geliştirme derlemesinde (`__DEV__`): Ayarlar'daki geliştirici anahtarı belirler
 *   — paywall ve kilitli halleri satın alma olmadan görebilmek için.
 * - Yayın derlemesinde: anahtar tamamen yok sayılır; karar `UNLOCK_ALL_PREMIUM`
 *   sabiti ve gerçek aboneliktir. Yani anahtar ASLA shipping'e sızamaz.
 */
export function resolvePremium(hasActiveEntitlement: boolean, devUnlock: boolean): boolean {
  if (__DEV__) return devUnlock || hasActiveEntitlement;
  return UNLOCK_ALL_PREMIUM || hasActiveEntitlement;
}

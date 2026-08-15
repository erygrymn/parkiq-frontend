import { Twice, TwiceAnalytics, TwiceRemoteConfig } from '@twiceapps/react-native';
import { TWICE_KEY } from '../config';

// Twice: analytics + remote config + sürüm kontrolü + gelir takibi.
//
// OLAY BÜTÇESİ BİLİNÇLİ OLARAK DAR. Sunucu küçük; her dokunuşu göndermek hem
// maliyet hem gürültü. Buraya yalnız bir KARARI değiştirebilecek olaylar girer.
//
// Ölçmediklerimiz ve sebebi:
// - ekran görüntüleme: oturum verisi zaten etkileşimi anlatıyor.
// - buton dokunuşları: ürün kararı için tek başına bir şey söylemiyor.
// - sayaç tik'leri: süre zaten park_ended'da tek olayla geliyor.
//
// Elde tutma (retention) ve uygulama süresi için AYRI OLAY YOK: SDK oturumları
// AppState üzerinden kendisi izliyor (30 dk arkaplandan sonra yeni oturum).
// Bizim "playtime" karşılığımız park oturumunun süresidir — park_ended taşır.

export const isAnalyticsEnabled = TWICE_KEY.length > 0;

export function initAnalytics(): void {
  if (!isAnalyticsEnabled) return;
  Twice.init({ apiKey: TWICE_KEY, debug: __DEV__ });
}

/** Flat parametreler — SDK yalnız string/number/boolean kabul eder. */
type Params = Record<string, string | number | boolean>;

function log(name: string, params?: Params): void {
  if (!isAnalyticsEnabled) return;
  TwiceAnalytics.logEvent(name, params);
}

// --- Huni: kurulum → ilk park → değer görülmesi ---

/** Onboarding'i bitirenler; kurulumdan aktivasyona düşüşü ölçer. */
export function trackOnboardingDone(): void {
  log('onboarding_completed');
}

export function trackParkStarted(source: 'manual' | 'auto' | 'widget'): void {
  log('park_started', { source });
}

/**
 * Ürünün ANA metriği: oturum ne kadar sürdü, tarife girilmiş miydi, para
 * kazandırdı mı. Elde tutmanın sebebini bu olay açıklar.
 */
export function trackParkEnded(input: {
  durationMin: number;
  hadTariff: boolean;
  savedAmount: number | null;
}): void {
  log('park_ended', {
    duration_min: Math.round(input.durationMin),
    had_tariff: input.hadTariff,
    saved: input.savedAmount ?? 0,
  });
}

// --- Özellik kullanımı: hangi vaat tutuyor ---

/**
 * OCR kalitesi. Uzaktan kapatma kararı (ocr_enabled) doğrudan buna bakılarak
 * verilir — panoların ne kadarının okunabildiğini başka türlü bilemeyiz.
 */
export function trackTariffScan(result: 'ok' | 'partial' | 'not_detected' | 'failed'): void {
  log('tariff_scanned', { result });
}

export function trackFindMyCar(mode: 'compass' | 'ar' | 'indoor'): void {
  log('find_my_car', { mode });
}

/** Ana viral döngü: konum paylaşma linki. */
export function trackLocationShared(): void {
  log('location_shared');
}

export function trackShareCard(kind: 'session' | 'month'): void {
  log('share_card', { kind });
}

// --- Para ---

export function trackPaywallShown(trigger: 'history' | 'settings' | 'celebration' | 'feature'): void {
  log('paywall_shown', { trigger });
}

/**
 * RevenueCat satın alma olayları Twice'a da iletilir (CLAUDE.md kararı).
 * Deneme ve iptal gelir SAYILMAZ; yalnız satın alma ve yenileme sayılır —
 * bu yüzden düz `purchase` yerine tipli yardımcılar kullanılır.
 */
export function trackPurchase(input: {
  productId: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly' | 'lifetime';
  isTrial: boolean;
}): void {
  if (!isAnalyticsEnabled) return;
  if (input.isTrial) {
    TwiceAnalytics.trialStarted(input.productId);
    return;
  }
  TwiceAnalytics.purchase(input.productId, input.price, input.currency);
}

export function trackRestore(): void {
  log('purchase_restored');
}

// --- Hatalar (tipli: panoda ayrı süzülür) ---

export function trackError(name: string, params?: Params): void {
  if (!isAnalyticsEnabled) return;
  TwiceAnalytics.errorEvent(name, params);
}

// --- Remote config ---

/**
 * Mağaza linkleri panelden yönetilir: App ID değişirse ya da Android yayına
 * çıkarsa build beklemeden düzeltilir. Paylaşım linki ürünün tek organik
 * büyüme mekanizması — bir kez yanlış girildiğinde her paylaşım boşa gider.
 */
const STORE_URL_KEYS = { ios: 'store_url_ios', android: 'store_url_android' } as const;

/** Uzaktan gelen mağaza linki; anahtar boşsa `fallback` döner. */
export function getStoreUrl(platform: 'ios' | 'android', fallback: string): string {
  if (!isAnalyticsEnabled) return fallback;
  try {
    const value = TwiceRemoteConfig.getString(STORE_URL_KEYS[platform]);
    return value && value.startsWith('http') ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Uzak yapılandırma değişince yeniden çizmek için. */
export function onRemoteConfigUpdated(listener: () => void): () => void {
  if (!isAnalyticsEnabled) return () => undefined;
  return TwiceRemoteConfig.onUpdated(listener);
}

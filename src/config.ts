/**
 * Mapbox public token (pk.*). Tasarımı gereği istemciye gömülür — gizli değildir,
 * app binary'sinden zaten okunabilir. Yine de kaynak koda YAZILMAZ: GitHub'ın sır
 * tarayıcısı pk/sk ayrımı yapmadan push'u engelliyor.
 *
 * Build sırasında ortamdan okunur (Expo `EXPO_PUBLIC_*` değişkenlerini bundle'a gömer):
 *   ~/.zshrc → export EXPO_PUBLIC_MAPBOX_TOKEN="pk.…"
 * veya proje kökünde `.env` (gitignore'lu):
 *   EXPO_PUBLIC_MAPBOX_TOKEN=pk.…
 *
 * Boşsa harita açılmaz; MapboxCanvas bunu konsola yazar.
 */
export const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/**
 * design.md §6 ParkIQ harita stilleri. Mapbox Studio'da özel stil hazırlanınca
 * buraya `mapbox://styles/...` URL'i yazılır; null iken Mapbox'ın hazır
 * light/dark stilleri kullanılır (geçici).
 */
export const MAPBOX_STYLE_URL_LIGHT: string | null = null;
export const MAPBOX_STYLE_URL_DARK: string | null = null;

/**
 * parkiq-backend kökü — iki iş de buradan geçer: konum paylaşım sayfası (/s) ve
 * tarife OCR proxy'si (/api/ocr). İlk Vercel deploy'undan sonra gerçek alan adıyla
 * güncellenir; alan adı kararı ASO çalışmasının ardından.
 */
export const BACKEND_BASE_URL = 'https://parkiq-backend-beta.vercel.app';

/**
 * RevenueCat iOS public SDK anahtarı (appl_*). İstemciye gömülmek üzere tasarlanmıştır.
 * Mapbox ile aynı sebeple ortamdan okunur.
 *   export EXPO_PUBLIC_REVENUECAT_IOS_KEY="appl_…"
 * Boşken paywall "planlar yüklenemedi" durumuna düşer, app çalışmaya devam eder.
 */
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

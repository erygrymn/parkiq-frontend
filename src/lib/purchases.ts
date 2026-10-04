import Constants, { ExecutionEnvironment } from 'expo-constants';
import { REVENUECAT_KEY } from '../config';
import { trackPurchase, trackRestore } from './analytics';
import { t } from '../localization';
import { PREMIUM_ENTITLEMENT } from './premium';

// RevenueCat köprüsü. Native modül → Expo Go'da yüklenmez (MapCanvas kalıbı).
// Anonim kullanıcı: login yok, RevenueCat kendi cihaz kimliğini üretir.

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type PlanPeriod = 'yearly' | 'monthly' | 'lifetime';

export interface PurchasePlan {
  /** RevenueCat package identifier — satın alma bununla yapılır. */
  id: string;
  period: PlanPeriod;
  /** Mağazadan gelen yerelleştirilmiş fiyat metni ("₺749,99"). */
  priceLabel: string;
  /** Ham fiyat + para birimi — planlar arası karşılaştırma (aylık karşılık,
      yıllıkta kaç tasarruf) yalnız sayıyla yapılabilir. */
  price: number;
  currency: string;
  /** Varsa deneme süresi metni ("1 week free"). */
  introLabel: string | null;
}

interface PurchasesModule {
  configure(options: { apiKey: string }): void;
  getOfferings(): Promise<unknown>;
  purchasePackage(pkg: unknown): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  getCustomerInfo(): Promise<unknown>;
  addCustomerInfoUpdateListener(listener: (info: unknown) => void): void;
}

let purchases: PurchasesModule | null = null;
if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchases = (require('react-native-purchases') as { default: PurchasesModule }).default;
  } catch {
    purchases = null;
  }
}

export const isPurchasesAvailable = purchases !== null && REVENUECAT_KEY.length > 0;

let configured = false;
function ensureConfigured(): boolean {
  if (!isPurchasesAvailable || !purchases) return false;
  if (!configured) {
    // Yapılandırma patlarsa paywall sonsuz iskelette kalıyordu; artık "planlar yüklenemedi"
    // satırına ve Tekrar dene'ye düşer.
    try {
      purchases.configure({ apiKey: REVENUECAT_KEY });
    } catch {
      return false;
    }
    configured = true;
  }
  return true;
}

/** RevenueCat PAYMENT_PENDING_ERROR: ödeme onay bekliyor (Satın Almayı Sor, banka doğrulaması). */
const PAYMENT_PENDING_CODE = '20';

// RevenueCat tiplerini burada dar tutuyoruz: SDK sürümü değişse de kırılmasın.
interface RcPackage {
  identifier: string;
  packageType?: string;
  product?: {
    /** Ürün kimliği ve ham fiyat — Twice'a gelir iletmek için gerekir. */
    identifier?: string;
    price?: number;
    currencyCode?: string;
    priceString?: string;
    introPrice?: {
      periodNumberOfUnits?: number;
      periodUnit?: string;
      /** 0 = ücretsiz deneme; >0 = İNDİRİMLİ giriş fiyatı (deneme değil). */
      price?: number;
      priceString?: string;
    } | null;
  };
}

/**
 * Hem RevenueCat'in standart paket tipini (ANNUAL/MONTHLY/LIFETIME) hem de
 * özel identifier'ları (`yearly`, `$rc_annual`, `annual`…) tanır: dashboard'da
 * paketler özel identifier ile kurulduğunda packageType CUSTOM dönebiliyor.
 */
function periodOf(pkg: RcPackage): PlanPeriod | null {
  const type = (pkg.packageType ?? '').toUpperCase();
  if (type === 'ANNUAL') return 'yearly';
  if (type === 'MONTHLY') return 'monthly';
  if (type === 'LIFETIME') return 'lifetime';

  const id = pkg.identifier.toLowerCase();
  if (id.includes('year') || id.includes('annual')) return 'yearly';
  if (id.includes('month')) return 'monthly';
  if (id.includes('life')) return 'lifetime';
  return null;
}

/**
 * Giriş teklifi etiketi.
 *
 * `introPrice` hem ücretsiz denemede hem İNDİRİMLİ giriş fiyatında dolu gelir.
 * Her ikisini "free" yazmak, App Store Connect'te "ilk ay 0,99" tanımlandığı an
 * yalan söylüyordu: kullanıcı "bedava" okuyup Apple'ın anında ücret kesmesiyle
 * karşılaşıyor — bu kategorideki iade taleplerinin birebir sebebi.
 */
function introLabelOf(pkg: RcPackage): string | null {
  const intro = pkg.product?.introPrice;
  if (!intro?.periodNumberOfUnits || !intro.periodUnit) return null;
  const count = intro.periodNumberOfUnits;
  const key = PERIOD_KEY[intro.periodUnit.toLowerCase() as keyof typeof PERIOD_KEY] ?? 'periodDay';
  const period = t(key, { count });
  // Fiyat bilinmiyorsa "ücretsiz" DEME: eksik bilgi, iyimser tahmin değil.
  if (intro.price === 0) return t('introFree', { period });
  if (intro.price != null && intro.priceString) {
    return t('introDiscounted', { period, price: intro.priceString });
  }
  return null;
}

const PERIOD_KEY = {
  day: 'periodDay',
  week: 'periodWeek',
  month: 'periodMonth',
  year: 'periodYear',
} as const;

/**
 * Geliştirme derlemesinde, RevenueCat anahtarı henüz yokken paywall tasarımını
 * gerçek kartlarla görebilmek için örnek planlar. `__DEV__` production bundle'ında
 * false olduğundan bu veri shipping'e GİREMEZ; fiyatlar da gerçek değil, örnektir.
 */
const DEMO_PLANS: PurchasePlan[] = [
  { id: 'demo_yearly', period: 'yearly', priceLabel: '₺749,99', price: 749.99, currency: 'TRY', introLabel: '1 week free' },
  { id: 'demo_monthly', period: 'monthly', priceLabel: '₺149,99', price: 149.99, currency: 'TRY', introLabel: null },
  { id: 'demo_lifetime', period: 'lifetime', priceLabel: '₺1.999,99', price: 1999.99, currency: 'TRY', introLabel: null },
];

export function getDemoPlans(): PurchasePlan[] | null {
  return __DEV__ ? DEMO_PLANS : null;
}

export function isDemoPlanId(id: string): boolean {
  return id.startsWith('demo_');
}

export async function loadPlans(): Promise<PurchasePlan[] | null> {
  if (!ensureConfigured() || !purchases) return null;
  try {
    const offerings = (await purchases.getOfferings()) as {
      current?: { availablePackages?: RcPackage[] };
    };
    const packages = offerings.current?.availablePackages ?? [];
    const plans: PurchasePlan[] = [];
    for (const pkg of packages) {
      const period = periodOf(pkg);
      const priceLabel = pkg.product?.priceString;
      if (!period || !priceLabel) continue;
      plans.push({
        id: pkg.identifier,
        period,
        priceLabel,
        price: pkg.product?.price ?? 0,
        currency: pkg.product?.currencyCode ?? 'USD',
        introLabel: introLabelOf(pkg),
      });
    }
    // Görünür sıra ve varsayılan seçim paywall'ın işi (PLAN_ORDER, premiumStore.openPlans).
    const order: PlanPeriod[] = ['yearly', 'monthly', 'lifetime'];
    return plans.sort((a, b) => order.indexOf(a.period) - order.indexOf(b.period));
  } catch {
    return null;
  }
}

interface RcEntitlement {
  latestPurchaseDateMillis?: number;
  latestPurchaseDate?: string;
}

function activeEntitlement(info: unknown): RcEntitlement | null {
  const entitlements = (info as { entitlements?: { active?: Record<string, RcEntitlement> } }).entitlements;
  return entitlements?.active?.[PREMIUM_ENTITLEMENT] ?? null;
}

function hasPremium(info: unknown): boolean {
  return activeEntitlement(info) !== null;
}

/**
 * Bu yetki ŞİMDİ mi ödendi, yoksa eskiden alınmış olan mı geri geldi.
 *
 * Uygulamayı silip kuran biri "Satın al"a bastığında App Store ödeme ekranını hiç göstermez:
 * ürün zaten onun, işlem sessizce geri yüklenir. Ekranda "satın alındı" yazmak yanlış, Twice
 * panosuna gelir olarak düşmesi daha yanlış — aynı para iki kez sayılır. Ayıran tek şey yetkinin
 * SON ödeme anı: gerçek satın almada bu an istektir, geri yüklemede geçmişte kalmış bir tarihtir.
 */
const RESTORE_SLACK_MS = 60_000;

interface RcCustomerInfoDates {
  /** Yanıtın SUNUCU saati — cihaz saati ileri/geri olsa da güvenilir referans. */
  requestDate?: string;
  allPurchaseDatesMillis?: Record<string, number | null>;
  allPurchaseDates?: Record<string, string | null>;
}

export function wasRestored(info: unknown, startedAtMs: number, productId?: string): boolean {
  const ent = activeEntitlement(info);
  if (!ent) return false;
  const dates = info as RcCustomerInfoDates;
  // Önce ALINAN ürünün kendi ödeme anı: yetki eski bir üründen (ömür boyu) geliyor olabilir ve
  // o ürünün tarihi, yeni ödenmiş bir yıllık aboneliği "geri yükleme" gösteriyordu.
  let paidAt = NaN;
  if (productId) {
    const millis = dates.allPurchaseDatesMillis?.[productId];
    const iso = dates.allPurchaseDates?.[productId];
    paidAt = typeof millis === 'number' ? millis : iso ? Date.parse(iso) : NaN;
  }
  if (!Number.isFinite(paidAt)) {
    paidAt = ent.latestPurchaseDateMillis ?? (ent.latestPurchaseDate ? Date.parse(ent.latestPurchaseDate) : NaN);
  }
  if (!Number.isFinite(paidAt)) return false;
  // Referans sunucu saatinden türer: cihaz saati bir dakikadan fazla ileriyse gerçek satın alma
  // "geri yükleme" sayılıyor, gelir olayı atılmıyor ve PRO damgası yerine "Geri yüklendi" çıkıyordu.
  const serverNow = dates.requestDate ? Date.parse(dates.requestDate) : NaN;
  const reference = Number.isFinite(serverNow) ? serverNow - Math.max(0, Date.now() - startedAtMs) : startedAtMs;
  return paidAt < reference - RESTORE_SLACK_MS;
}

/** Analitik sonucu DEĞİŞTİREMEZ: olay atılamazsa ödenmiş satın alma yine başarılıdır. */
function safely(track: () => void): void {
  try {
    track();
  } catch {
    /* olay kaybolur, satın alma kaybolmaz */
  }
}

/**
 * Satın alma; kullanıcı iptal ederse `canceled` döner (hata gösterilmez).
 * Ödeme alınmadan eski hak geri geldiyse `restored` — gelir olayı ATILMAZ.
 * Ödeme onay bekliyorsa `pending`: "başarısız" demek yanlıştı, onay gelince yetki
 * `onEntitlementChange` dinleyicisiyle kendiliğinden açılır.
 */
export async function purchasePlan(
  planId: string,
): Promise<'purchased' | 'restored' | 'pending' | 'canceled' | 'failed'> {
  if (!ensureConfigured() || !purchases) return 'failed';
  let pkg: RcPackage | undefined;
  let info: unknown;
  let startedAtMs = 0;
  try {
    const offerings = (await purchases.getOfferings()) as {
      current?: { availablePackages?: RcPackage[] };
    };
    pkg = (offerings.current?.availablePackages ?? []).find((p) => p.identifier === planId);
    if (!pkg) return 'failed';
    startedAtMs = Date.now();
    const result = await purchases.purchasePackage(pkg);
    info = (result as { customerInfo?: unknown }).customerInfo;
  } catch (error) {
    const failure = error as { userCancelled?: boolean; code?: string | number };
    if (failure.userCancelled) return 'canceled';
    return String(failure.code) === PAYMENT_PENDING_CODE ? 'pending' : 'failed';
  }
  if (!hasPremium(info)) return 'failed';

  if (wasRestored(info, startedAtMs, pkg.product?.identifier)) {
    safely(trackRestore);
    return 'restored';
  }

  // Gelir RevenueCat'te yaşar ama Twice panosunda da görünmeli (CLAUDE.md).
  // Deneme başlangıcı gelir SAYILMAZ; tipli yardımcı onu ayrı işaretler.
  const period = periodOf(pkg);
  const product = pkg.product;
  if (period && product) {
    safely(() =>
      trackPurchase({
        productId: product.identifier ?? pkg.identifier,
        price: product.price ?? 0,
        currency: product.currencyCode ?? 'USD',
        period,
        isTrial: introLabelOf(pkg) !== null,
      }),
    );
  }
  return 'purchased';
}

export async function restorePurchases(): Promise<'restored' | 'none' | 'failed'> {
  if (!ensureConfigured() || !purchases) return 'failed';
  let info: unknown;
  try {
    info = await purchases.restorePurchases();
  } catch {
    return 'failed';
  }
  if (!hasPremium(info)) return 'none';
  safely(trackRestore);
  return 'restored';
}

/**
 * Yetki mağazada ne durumda: true/false, okunamadıysa null. Okuma hatası "yetki yok" sayılınca
 * ön plana dönüşteki tek bir ağ hatası ödeme yapmış kullanıcıyı kilitliyordu.
 */
export async function fetchEntitlement(): Promise<boolean | null> {
  if (!ensureConfigured() || !purchases) return null;
  try {
    return hasPremium(await purchases.getCustomerInfo());
  } catch {
    return null;
  }
}

/**
 * Yetki değişikliklerini dinler. Onay bekleyen satın alma dakikalar sonra tamamlanır ve
 * RevenueCat bunu yalnız bu dinleyiciyle bildirir; dinleyici yokken ödeme yapmış kullanıcı bir
 * sonraki ön plana dönüşe kadar kilitli kalıyordu. İptal ve iade de buradan gelir.
 */
export function onEntitlementChange(listener: (active: boolean) => void): void {
  if (!ensureConfigured() || !purchases) return;
  try {
    purchases.addCustomerInfoUpdateListener((info) => listener(hasPremium(info)));
  } catch {
    /* dinleyici kurulamazsa ön plana dönüş tazelemesi yine çalışır */
  }
}

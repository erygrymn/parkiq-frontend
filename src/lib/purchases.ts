import Constants, { ExecutionEnvironment } from 'expo-constants';
import { REVENUECAT_IOS_KEY } from '../config';
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
  /** Varsa deneme süresi metni ("1 week free"). */
  introLabel: string | null;
}

interface PurchasesModule {
  configure(options: { apiKey: string }): void;
  getOfferings(): Promise<unknown>;
  purchasePackage(pkg: unknown): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  getCustomerInfo(): Promise<unknown>;
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

export const isPurchasesAvailable = purchases !== null && REVENUECAT_IOS_KEY.length > 0;

let configured = false;
function ensureConfigured(): boolean {
  if (!isPurchasesAvailable || !purchases) return false;
  if (!configured) {
    purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
    configured = true;
  }
  return true;
}

// RevenueCat tiplerini burada dar tutuyoruz: SDK sürümü değişse de kırılmasın.
interface RcPackage {
  identifier: string;
  packageType?: string;
  product?: {
    priceString?: string;
    introPrice?: { periodNumberOfUnits?: number; periodUnit?: string } | null;
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

function introLabelOf(pkg: RcPackage): string | null {
  const intro = pkg.product?.introPrice;
  if (!intro?.periodNumberOfUnits || !intro.periodUnit) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits} ${unit}${intro.periodNumberOfUnits > 1 ? 's' : ''} free`;
}

/**
 * Geliştirme derlemesinde, RevenueCat anahtarı henüz yokken paywall tasarımını
 * gerçek kartlarla görebilmek için örnek planlar. `__DEV__` production bundle'ında
 * false olduğundan bu veri shipping'e GİREMEZ; fiyatlar da gerçek değil, örnektir.
 */
const DEMO_PLANS: PurchasePlan[] = [
  { id: 'demo_yearly', period: 'yearly', priceLabel: '₺749,99', introLabel: '1 week free' },
  { id: 'demo_monthly', period: 'monthly', priceLabel: '₺149,99', introLabel: null },
  { id: 'demo_lifetime', period: 'lifetime', priceLabel: '₺1.999,99', introLabel: null },
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
      plans.push({ id: pkg.identifier, period, priceLabel, introLabel: introLabelOf(pkg) });
    }
    // Sıra design.md §7.10: Yearly (varsayılan seçili) → Monthly → Lifetime
    const order: PlanPeriod[] = ['yearly', 'monthly', 'lifetime'];
    return plans.sort((a, b) => order.indexOf(a.period) - order.indexOf(b.period));
  } catch {
    return null;
  }
}

function hasPremium(info: unknown): boolean {
  const entitlements = (info as { entitlements?: { active?: Record<string, unknown> } }).entitlements;
  return Boolean(entitlements?.active?.[PREMIUM_ENTITLEMENT]);
}

/** Satın alma; kullanıcı iptal ederse `canceled` döner (hata gösterilmez). */
export async function purchasePlan(planId: string): Promise<'purchased' | 'canceled' | 'failed'> {
  if (!ensureConfigured() || !purchases) return 'failed';
  try {
    const offerings = (await purchases.getOfferings()) as {
      current?: { availablePackages?: RcPackage[] };
    };
    const pkg = (offerings.current?.availablePackages ?? []).find((p) => p.identifier === planId);
    if (!pkg) return 'failed';
    const result = await purchases.purchasePackage(pkg);
    return hasPremium((result as { customerInfo?: unknown }).customerInfo) ? 'purchased' : 'failed';
  } catch (error) {
    return (error as { userCancelled?: boolean }).userCancelled ? 'canceled' : 'failed';
  }
}

export async function restorePurchases(): Promise<'restored' | 'none' | 'failed'> {
  if (!ensureConfigured() || !purchases) return 'failed';
  try {
    return hasPremium(await purchases.restorePurchases()) ? 'restored' : 'none';
  } catch {
    return 'failed';
  }
}

export async function fetchEntitlement(): Promise<boolean> {
  if (!ensureConfigured() || !purchases) return false;
  try {
    return hasPremium(await purchases.getCustomerInfo());
  } catch {
    return false;
  }
}

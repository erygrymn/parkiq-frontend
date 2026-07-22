import { create } from 'zustand';
import { resolvePremium, UNLOCK_ALL_PREMIUM } from '../lib/premium';
import {
  fetchEntitlement,
  getDemoPlans,
  isDemoPlanId,
  isPurchasesAvailable,
  loadPlans,
  purchasePlan,
  restorePurchases,
  type PurchasePlan,
} from '../lib/purchases';

// Premium durumu + paywall akışı. Kilitlenecek yüzeyler YALNIZ `isPremium`'a bakar.
// UNLOCK_ALL_PREMIUM açıkken isPremium her zaman true → hiçbir yüzey kilitli değil.

export type PlansState = 'idle' | 'loading' | 'ready' | 'error';
export type PurchaseState = 'idle' | 'purchasing' | 'restoring';
export type PurchaseNotice = null | 'restored' | 'none' | 'failed';

const DEV_UNLOCK_KEY = 'devPremiumUnlock';

function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

/** Geliştirici anahtarının kalıcı hali; yalnız __DEV__'de okunur/yazılır. */
function readDevUnlock(): boolean {
  if (!__DEV__) return UNLOCK_ALL_PREMIUM;
  try {
    const stored = repo().readSetting(DEV_UNLOCK_KEY);
    return stored === null ? UNLOCK_ALL_PREMIUM : stored === '1';
  } catch {
    return UNLOCK_ALL_PREMIUM;
  }
}

interface PremiumStore {
  isPremium: boolean;
  /** Gerçek abonelik durumu (RevenueCat). Anahtardan bağımsız tutulur. */
  hasEntitlement: boolean;
  /** Ayarlar'daki geliştirici anahtarı — yalnız __DEV__'de etkilidir. */
  devUnlock: boolean;
  setDevUnlock: (value: boolean) => void;
  plans: PurchasePlan[];
  /** Planlar örnek mi (geliştirme derlemesi, RevenueCat anahtarı yokken). */
  plansAreDemo: boolean;
  plansState: PlansState;
  selectedPlanId: string | null;
  purchaseState: PurchaseState;
  notice: PurchaseNotice;
  /** Satın alma başarıldığı an true olur; "PRO." damgası bunu tüketir (§7.10). */
  justPurchased: boolean;

  init: () => void;
  openPlans: () => void;
  selectPlan: (id: string) => void;
  buy: () => void;
  restore: () => void;
  clearNotice: () => void;
  consumeJustPurchased: () => void;
}

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  isPremium: resolvePremium(false, UNLOCK_ALL_PREMIUM),
  hasEntitlement: false,
  devUnlock: UNLOCK_ALL_PREMIUM,
  plans: [],
  plansAreDemo: false,
  plansState: 'idle',
  selectedPlanId: null,
  purchaseState: 'idle',
  notice: null,
  justPurchased: false,

  init: () => {
    const devUnlock = readDevUnlock();
    set({ devUnlock, isPremium: resolvePremium(get().hasEntitlement, devUnlock) });
    if (!isPurchasesAvailable) return;
    void fetchEntitlement().then((active) =>
      set({ hasEntitlement: active, isPremium: resolvePremium(active, get().devUnlock) }),
    );
  },

  setDevUnlock: (value) => {
    if (!__DEV__) return;
    try {
      repo().writeSetting(DEV_UNLOCK_KEY, value ? '1' : '0');
    } catch {
      // Kalıcılık başarısızsa anahtar yine de oturum boyunca çalışır.
    }
    set({ devUnlock: value, isPremium: resolvePremium(get().hasEntitlement, value) });
  },

  openPlans: () => {
    if (get().plansState === 'loading') return;
    set({ plansState: 'loading', notice: null });
    void loadPlans().then((loaded) => {
      // RevenueCat yoksa/anahtar boşsa geliştirme derlemesinde örnek planlara düş,
      // yayında hata durumunu göster (§7.10 durum 2).
      const demo = loaded && loaded.length > 0 ? null : getDemoPlans();
      const plans = loaded && loaded.length > 0 ? loaded : demo;
      if (!plans) {
        set({ plansState: 'error', plans: [], plansAreDemo: false });
        return;
      }
      set({
        plans,
        plansAreDemo: demo !== null,
        plansState: 'ready',
        // §7.10: yıllık plan varsayılan seçili
        selectedPlanId: plans.find((p) => p.period === 'yearly')?.id ?? plans[0].id,
      });
    });
  },

  selectPlan: (selectedPlanId) => set({ selectedPlanId }),

  buy: () => {
    const { selectedPlanId, purchaseState } = get();
    if (!selectedPlanId || purchaseState !== 'idle') return;

    // Örnek plan: gerçek mağaza işlemi yok, başarı akışını göstermek için taklit edilir.
    // Sadece geliştirme derlemesinde mümkündür (getDemoPlans yayında null döner).
    if (isDemoPlanId(selectedPlanId)) {
      set({ purchaseState: 'purchasing' });
      setTimeout(() => {
        // Geliştirici anahtarını açar: başarı akışı ve kilitlerin çözülmesi
        // gerçek satın almadaki gibi görünsün. Ayarlar'dan geri kapatılabilir.
        get().setDevUnlock(true);
        set({ purchaseState: 'idle', justPurchased: true });
      }, 600);
      return;
    }

    set({ purchaseState: 'purchasing', notice: null });
    void purchasePlan(selectedPlanId).then((result) => {
      if (result === 'purchased') {
        set({ purchaseState: 'idle', hasEntitlement: true, isPremium: true, justPurchased: true });
        return;
      }
      // İptal sessizdir: kullanıcı zaten bilinçli vazgeçti (§7.10 durum listesi).
      set({ purchaseState: 'idle', notice: result === 'failed' ? 'failed' : null });
    });
  },

  restore: () => {
    if (get().purchaseState !== 'idle') return;
    set({ purchaseState: 'restoring', notice: null });
    void restorePurchases().then((result) => {
      if (result === 'restored') {
        set({ purchaseState: 'idle', hasEntitlement: true, isPremium: true, notice: 'restored' });
        return;
      }
      set({ purchaseState: 'idle', notice: result === 'none' ? 'none' : 'failed' });
    });
  },

  clearNotice: () => set({ notice: null }),
  consumeJustPurchased: () => set({ justPurchased: false }),
}));

/** Kilit noktalarının okuduğu tek kapı. */
export function useIsPremium(): boolean {
  return usePremiumStore((s) => s.isPremium);
}

export { UNLOCK_ALL_PREMIUM };

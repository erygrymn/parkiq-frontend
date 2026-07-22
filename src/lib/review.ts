import * as StoreReview from 'expo-store-review';

// §7.7: App Store yorum isteği yalnız İLK tasarruf anında — kullanıcı tam da
// para kazandığını gördüğünde. Bir kez sorulur, bir daha asla (iOS zaten yılda
// 3 istekle sınırlar; biz kendi tarafımızda da tek sefere kilitliyoruz).

const REVIEW_ASKED_KEY = 'reviewAsked';

function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

const PAYWALL_SHOWN_KEY = 'celebrationPaywallShown';

/**
 * §11 tetik: ilk "tasarruf ettin" anından sonra paywall bir kez gösterilir —
 * kullanıcı ürünün değerini tam o an gördü. Bir daha bu tetikle açılmaz.
 */
export function shouldShowCelebrationPaywall(isPremium: boolean): boolean {
  if (isPremium) return false;
  try {
    if (repo().readSetting(PAYWALL_SHOWN_KEY) === '1') return false;
    repo().writeSetting(PAYWALL_SHOWN_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export async function maybeAskForReview(): Promise<void> {
  try {
    if (repo().readSetting(REVIEW_ASKED_KEY) === '1') return;
    if (!(await StoreReview.hasAction())) return;
    repo().writeSetting(REVIEW_ASKED_KEY, '1');
    await StoreReview.requestReview();
  } catch {
    // Yorum isteği hiçbir akışı bloklamaz.
  }
}

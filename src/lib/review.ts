import * as StoreReview from 'expo-store-review';

// §7.7 yorum isteği ve §11 paywall tetikleri — ikisi de "değerin görüldüğü an"a
// bağlıdır: kullanıcı tam da para kazandığını gördüğünde.

function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

function readCount(key: string): number {
  try {
    const raw = repo().readSetting(key);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeCount(key: string, value: number): void {
  try {
    repo().writeSetting(key, String(value));
  } catch {
    /* kalıcılık başarısızsa akış bozulmaz */
  }
}

const PAYWALL_COUNT_KEY = 'celebrationPaywallCount';

/**
 * Kaçıncı tasarruf anlarında paywall açılır. Her seferinde göstermek ürünü
 * kullanılamaz hale getirir; tek sefer ise ilk anı kaçıranı bir daha yakalamaz.
 * Azalan sıklık: 1., 3., 7. — sonrası yalnız kullanıcının kendi dokunuşuyla.
 */
const CELEBRATION_STEPS = [1, 3, 7];

export function shouldShowCelebrationPaywall(isPremium: boolean): boolean {
  if (isPremium) return false;
  const seen = readCount(PAYWALL_COUNT_KEY) + 1;
  writeCount(PAYWALL_COUNT_KEY, seen);
  return CELEBRATION_STEPS.includes(seen);
}

// --- Yorum isteği ---

const REVIEW_ASKED_KEY = 'reviewAsked';
const REVIEW_DECLINED_KEY = 'reviewDeclined';

/**
 * Sistem yorum penceresi PAHALI bir kaynaktır: iOS yılda üç kez gösterir ve
 * memnun olmayan biri denk gelirse puan kalıcı olarak düşer. Bu yüzden önce
 * kendi sorumuzu sorarız (bkz. RatePrompt) ve YALNIZ olumlu yanıtta sisteme
 * geçeriz. Olumsuz yanıt bir daha sorulmaz — ısrar kötü puanı davet eder.
 */
export function shouldAskForReview(): boolean {
  return readCount(REVIEW_ASKED_KEY) === 0 && readCount(REVIEW_DECLINED_KEY) === 0;
}

export function markReviewDeclined(): void {
  writeCount(REVIEW_DECLINED_KEY, 1);
}

export async function requestSystemReview(): Promise<void> {
  try {
    writeCount(REVIEW_ASKED_KEY, 1);
    if (!(await StoreReview.hasAction())) return;
    await StoreReview.requestReview();
  } catch {
    // Yorum isteği hiçbir akışı bloklamaz.
  }
}

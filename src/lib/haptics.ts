import * as Haptics from 'expo-haptics';

// design.md §3 haptik haritası — haptik yalnız buradaki dört fonksiyonla tetiklenir.
// Reduce Motion'da haptik kalır. Simülatörde/desteksiz cihazda sessizce geçilir.

function fire(run: () => Promise<void>): void {
  run().catch(() => undefined);
}

/** "I Parked" dokunuşu. */
export function hapticCommit(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Nokta inişi: PARKED. · SAVED ₺X. · PRO. */
export function hapticStamp(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Pin ya da seçenek seçimi. */
export function hapticSelect(): void {
  fire(() => Haptics.selectionAsync());
}

/** Count-up detent'i, AR ve pusula "yakınsın" eşiği. */
export function hapticTick(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
